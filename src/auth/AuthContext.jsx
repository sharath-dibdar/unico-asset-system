import { createContext, useContext, useState, useEffect, useRef } from "react";
import { uid } from "../utils.js";

const AuthCtx = createContext(null);

function deviceInfo() {
  const ua = navigator.userAgent;
  const browser = ua.includes("Edg") ? "Edge" : ua.includes("Firefox") ? "Firefox" : ua.includes("Chrome") ? "Chrome" : ua.includes("Safari") ? "Safari" : "Browser";
  const os = ua.includes("Windows") ? "Windows" : ua.includes("Mac") ? "macOS" : ua.includes("Android") ? "Android" : ua.includes("Linux") ? "Linux" : "Unknown";
  return { browser, os, ua: ua.slice(0, 150), screen: `${screen.width}×${screen.height}`, lang: navigator.language };
}

const SEED_ADMIN = {
  id: "admin-seed",
  email: "admin@unico.app",
  name: "Admin",
  role: "admin",
  active: true,
  createdAt: new Date(0).toISOString(),
  createdBy: null,
};

export function AuthProvider({ children }) {
  const [users,    setUsers]   = useState([]);
  const [sessions, setSess]    = useState([]);
  const [me,       setMe]      = useState(null);
  const [mySession, setMySess] = useState(null);
  const [loaded,   setLoaded]  = useState(false);
  const otps = useRef(new Map()); // email → { code, expiresAt }

  useEffect(() => {
    let loadedUsers;
    try {
      const raw = localStorage.getItem("uais-users");
      loadedUsers = raw ? JSON.parse(raw) : [SEED_ADMIN];
      if (!raw) localStorage.setItem("uais-users", JSON.stringify([SEED_ADMIN]));
    } catch { loadedUsers = [SEED_ADMIN]; }
    setUsers(loadedUsers);

    let loadedSessions;
    try {
      const raw = localStorage.getItem("uais-sessions");
      loadedSessions = raw ? JSON.parse(raw) : [];
    } catch { loadedSessions = []; }
    setSess(loadedSessions);

    // Restore current session
    try {
      const cs = localStorage.getItem("uais-current-session");
      if (cs) {
        const { token } = JSON.parse(cs);
        const session = loadedSessions.find(s => s.token === token && !s.revoked);
        const user    = session ? loadedUsers.find(u => u.id === session.userId && u.active) : null;
        if (session && user) {
          setMe(user);
          setMySess(session);
          // touch lastActive
          const updated = loadedSessions.map(s => s.token === token ? { ...s, lastActive: new Date().toISOString() } : s);
          localStorage.setItem("uais-sessions", JSON.stringify(updated));
          setSess(updated);
        } else {
          localStorage.removeItem("uais-current-session");
        }
      }
    } catch {}

    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) localStorage.setItem("uais-users",    JSON.stringify(users));    }, [users,    loaded]);
  useEffect(() => { if (loaded) localStorage.setItem("uais-sessions", JSON.stringify(sessions)); }, [sessions, loaded]);

  // ── OTP ─────────────────────────────────────────────────────────────────────
  function requestOTP(email) {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.active);
    if (!user) return { ok: false, error: "No active account with that email." };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    otps.current.set(email.toLowerCase(), { code, expiresAt: Date.now() + 10 * 60 * 1000 });
    return { ok: true, code }; // UI shows code in dev banner
  }

  function verifyOTP(email, input) {
    const entry = otps.current.get(email.toLowerCase());
    if (!entry)                     return { ok: false, error: "No OTP found — please request a new one." };
    if (Date.now() > entry.expiresAt) { otps.current.delete(email.toLowerCase()); return { ok: false, error: "OTP expired — please request a new one." }; }
    if (entry.code !== input.trim()) return { ok: false, error: "Incorrect OTP." };
    otps.current.delete(email.toLowerCase());

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.active);
    if (!user) return { ok: false, error: "Account not found." };

    const token   = uid();
    const session = { id: uid(), userId: user.id, token, device: deviceInfo(), createdAt: new Date().toISOString(), lastActive: new Date().toISOString(), revoked: false };
    setSess(p => [...p, session]);
    localStorage.setItem("uais-current-session", JSON.stringify({ token }));
    setMe(user);
    setMySess(session);
    return { ok: true };
  }

  // ── Session management ───────────────────────────────────────────────────────
  function logout() {
    if (mySession) setSess(p => p.map(s => s.id === mySession.id ? { ...s, revoked: true } : s));
    localStorage.removeItem("uais-current-session");
    setMe(null); setMySess(null);
  }

  function revokeSession(sessionId) {
    setSess(p => p.map(s => s.id === sessionId ? { ...s, revoked: true } : s));
    if (mySession?.id === sessionId) {
      localStorage.removeItem("uais-current-session");
      setMe(null); setMySess(null);
    }
  }

  // ── User CRUD (admin only) ───────────────────────────────────────────────────
  function addUser(data) {
    const user = { id: uid(), ...data, active: true, createdAt: new Date().toISOString(), createdBy: me?.id };
    setUsers(p => [...p, user]);
    return user;
  }

  function updateUser(updated) {
    setUsers(p => p.map(u => u.id === updated.id ? updated : u));
    if (me?.id === updated.id) setMe(updated);
  }

  function deactivateUser(id) {
    setUsers(p => p.map(u => u.id === id ? { ...u, active: false } : u));
    // revoke all their sessions
    setSess(p => p.map(s => s.userId === id ? { ...s, revoked: true } : s));
    if (me?.id === id) { localStorage.removeItem("uais-current-session"); setMe(null); setMySess(null); }
  }

  function reactivateUser(id) { setUsers(p => p.map(u => u.id === id ? { ...u, active: true } : u)); }

  return (
    <AuthCtx.Provider value={{
      me, mySession, users, sessions,
      loaded, isAdmin: me?.role === "admin",
      requestOTP, verifyOTP, logout,
      revokeSession, addUser, updateUser, deactivateUser, reactivateUser,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
