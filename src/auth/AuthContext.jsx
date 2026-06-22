import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { db } from "../lib/db.js";
import { uid } from "../utils.js";

const AuthCtx = createContext(null);

// ─── Device fingerprint ──────────────────────────────────────────────────────
function deviceInfo() {
  const ua = navigator.userAgent;
  const browser =
    ua.includes("Edg")     ? "Edge"    :
    ua.includes("Firefox") ? "Firefox" :
    ua.includes("Chrome")  ? "Chrome"  :
    ua.includes("Safari")  ? "Safari"  : "Browser";
  const os =
    ua.includes("Windows") ? "Windows" :
    ua.includes("Mac")     ? "macOS"   :
    ua.includes("Android") ? "Android" :
    ua.includes("iPhone") || ua.includes("iPad") ? "iOS" :
    ua.includes("Linux")   ? "Linux"   : "Unknown";
  return {
    browser, os,
    ua:     ua.slice(0, 150),
    screen: `${screen.width}×${screen.height}`,
    lang:   navigator.language,
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [me,         setMe]       = useState(null);    // profile row
  const [mySession,  setMySess]   = useState(null);    // device_sessions row
  const [users,      setUsers]    = useState([]);      // all profiles (admin view)
  const [sessions,   setSessions] = useState([]);      // all device_sessions (admin view)
  const [loaded,     setLoaded]   = useState(false);   // auth resolved
  const [authError,  setAuthError]= useState("");      // shown on login page

  // ── Load supporting data once authenticated ──────────────────────────────
  const loadAdminData = useCallback(async () => {
    const [profs, sess] = await Promise.all([
      db.profiles.loadAll(),
      db.sessions.loadAll(),
    ]);
    setUsers(profs);
    setSessions(sess);
  }, []);

  // ── Process a Supabase auth user → find/create profile ──────────────────
  const resolveProfile = useCallback(async (authUser) => {
    if (!authUser) { setMe(null); setLoaded(true); return; }

    const email = authUser.email.toLowerCase();

    // 1. Find profile by auth_id (returning user)
    let profile = await db.profiles.findByAuthId(authUser.id);

    if (!profile) {
      // 2. Find profile by email (first login — admin pre-created the record)
      const byEmail = await db.profiles.findByEmail(email);

      if (byEmail && byEmail.active) {
        // Link the Supabase auth UID to this profile
        await db.profiles.update(byEmail.id, { auth_id: authUser.id });
        profile = { ...byEmail, auth_id: authUser.id };
      } else {
        // 3. Bootstrap: if no profiles exist at all, make this user admin
        const total = await db.profiles.count();
        if (total === 0) {
          const bootstrapProfile = {
            auth_id:    authUser.id,
            email,
            name:       email.split("@")[0],
            role:       "admin",
            active:     true,
            created_by: null,
          };
          const ok = await db.profiles.insert(bootstrapProfile);
          if (ok) {
            profile = await db.profiles.findByAuthId(authUser.id);
          }
        }
      }

      // Still no profile → this email isn't registered
      if (!profile) {
        setAuthError("No account found for this email. Ask an admin to add you.");
        await supabase.auth.signOut();
        setMe(null);
        setLoaded(true);
        return;
      }
    }

    if (!profile.active) {
      setAuthError("Your account has been deactivated. Contact an admin.");
      await supabase.auth.signOut();
      setMe(null);
      setLoaded(true);
      return;
    }

    // ── Create device session record ────────────────────────────────────────
    const sessionId = uid();
    const sessionRow = {
      id:         sessionId,
      user_id:    authUser.id,
      profile_id: profile.id,
      data:       deviceInfo(),
      revoked:    false,
      created_at: new Date().toISOString(),
      last_active:new Date().toISOString(),
    };
    await db.sessions.insert(sessionRow);
    setMySess(sessionRow);

    setMe(profile);
    setAuthError("");
    setLoaded(true);

    // Load admin data for UserAdmin view
    await loadAdminData();
  }, [loadAdminData]);

  // ── Subscribe to Supabase auth state changes ─────────────────────────────
  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        resolveProfile(session.user);
      } else {
        setLoaded(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          // Avoid double-resolving on mount (getSession already handles it)
          if (!me) resolveProfile(session.user);
        } else if (event === "SIGNED_OUT") {
          setMe(null);
          setMySess(null);
          setUsers([]);
          setSessions([]);
          setLoaded(true);
        } else if (event === "TOKEN_REFRESHED") {
          // Session refreshed — just touch last_active
          if (mySession) db.sessions.touch(mySession.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── OTP login ────────────────────────────────────────────────────────────
  async function requestOTP(email) {
    setAuthError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function verifyOTP(email, token) {
    setAuthError("");
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) return { ok: false, error: "Invalid or expired code. Try again." };
    // onAuthStateChange → SIGNED_IN → resolveProfile handles the rest
    return { ok: true };
  }

  // ── Session management ───────────────────────────────────────────────────
  async function logout() {
    if (mySession) await db.sessions.revoke(mySession.id);
    await supabase.auth.signOut();
    // onAuthStateChange SIGNED_OUT clears state
  }

  async function revokeSession(sessionId) {
    await db.sessions.revoke(sessionId);
    setSessions(p => p.map(s => s.id === sessionId ? { ...s, revoked: true } : s));
    // If this is the current device, sign out
    if (mySession?.id === sessionId) await supabase.auth.signOut();
  }

  // ── User CRUD (admin only) ───────────────────────────────────────────────
  async function addUser(data) {
    const row = {
      email:      data.email.toLowerCase(),
      name:       data.name,
      role:       data.role,
      active:     true,
      created_by: me?.id ?? null,
    };
    const ok = await db.profiles.insert(row);
    if (ok) await loadAdminData();
    return ok;
  }

  async function updateUser(updated) {
    const { id, ...rest } = updated;
    await db.profiles.update(id, {
      name:   rest.name,
      role:   rest.role,
      active: rest.active,
    });
    setUsers(p => p.map(u => u.id === id ? { ...u, ...rest } : u));
    if (me?.id === id) setMe(prev => ({ ...prev, ...rest }));
  }

  async function deactivateUser(id) {
    await db.profiles.update(id, { active: false });
    await db.sessions.revokeAllForUser(
      users.find(u => u.id === id)?.auth_id
    );
    setUsers(p => p.map(u => u.id === id ? { ...u, active: false } : u));
    setSessions(p => p.map(s => s.profile_id === id ? { ...s, revoked: true } : s));
    // If admin deactivates themselves (unusual), sign out
    if (me?.id === id) await supabase.auth.signOut();
  }

  async function reactivateUser(id) {
    await db.profiles.update(id, { active: true });
    setUsers(p => p.map(u => u.id === id ? { ...u, active: true } : u));
  }

  return (
    <AuthCtx.Provider value={{
      me, mySession, users, sessions,
      loaded, authError,
      isAdmin: me?.role === "admin",
      requestOTP, verifyOTP, logout,
      revokeSession, addUser, updateUser, deactivateUser, reactivateUser,
      refreshAdminData: loadAdminData,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
