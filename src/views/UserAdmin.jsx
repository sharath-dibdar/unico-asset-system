import { useState } from "react";
import { C } from "../constants.js";
import { fDate } from "../utils.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Badge, Btn, Label, Modal, Section } from "../components/UI.jsx";

// ── Add / Edit user modal ────────────────────────────────────────────────────
function UserModal({ existing, onSave, onClose }) {
  const [form, setForm] = useState(existing
    ? { name: existing.name, email: existing.email, role: existing.role }
    : { name: "", email: "", role: "user" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.name.trim() && form.email.trim();

  return (
    <Modal title={existing ? "Edit User" : "Add User"} onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose} variant="secondary">Cancel</Btn>
          <Btn onClick={() => valid && onSave(form)} style={{ opacity: valid ? 1 : 0.5 }}>
            {existing ? "Save Changes" : "Add User"}
          </Btn>
        </>
      }>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div><Label>Full Name *</Label><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Jane Doe" /></div>
        <div><Label>Email Address *</Label><input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="jane@company.com" disabled={!!existing} /></div>
        <div><Label>Role</Label>
          <select value={form.role} onChange={e => set("role", e.target.value)}>
            <option value="user">User — asset list, check-in/out, notes</option>
            <option value="admin">Admin — full access + user management</option>
          </select>
        </div>
        {!existing && (
          <div style={{ background:`${C.ac}10`, border:`1px solid ${C.ac}25`, borderRadius:10, padding:"10px 14px", fontSize:12, color:C.mu }}>
            The user will log in via email OTP — no password needed.
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Sessions tab ─────────────────────────────────────────────────────────────
function SessionsTab() {
  const { sessions, users, mySession, revokeSession } = useAuth();
  const active = sessions.filter(s => !s.revoked).sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));

  function userOf(userId) { return users.find(u => u.id === userId); }

  if (!active.length) return (
    <div style={{ textAlign:"center", padding:"40px 20px", color:C.mu, fontSize:14 }}>No active sessions.</div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {active.map(s => {
        const u = userOf(s.userId);
        const isMine = s.id === mySession?.id;
        return (
          <div key={s.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:C.el, border:`1px solid ${isMine?C.ac:C.br}`, borderRadius:12 }}>
            <div style={{ fontSize:22, flexShrink:0 }}>
              {s.device?.os === "Windows" ? "🖥️" : s.device?.os === "macOS" ? "💻" : s.device?.os === "Android" || s.device?.os === "iOS" ? "📱" : "🖥️"}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:13, fontWeight:600 }}>{u?.name || u?.email || "Unknown user"}</span>
                {isMine && <Badge color={C.ok}>This device</Badge>}
                <Badge color={u?.role === "admin" ? C.ac : C.mu}>{u?.role}</Badge>
              </div>
              <div style={{ fontSize:12, color:C.mu, marginTop:2 }}>
                {s.device?.browser} on {s.device?.os}
                {s.device?.screen && <span style={{ color:C.mu2 }}> · {s.device.screen}</span>}
              </div>
              <div style={{ fontSize:11, color:C.mu2, marginTop:2 }}>
                Signed in {fDate(s.createdAt)} · Last active {fDate(s.lastActive)}
              </div>
            </div>
            <Btn onClick={() => { if (confirm(`Revoke this session for ${u?.name || u?.email}?`)) revokeSession(s.id); }}
              variant="danger" style={{ fontSize:11, padding:"6px 12px", flexShrink:0 }}>
              Revoke
            </Btn>
          </div>
        );
      })}
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────
export default function UserAdmin() {
  const { users, sessions, addUser, updateUser, deactivateUser, reactivateUser } = useAuth();
  const [tab,     setTab]   = useState("users");
  const [modal,   setModal] = useState(null); // null | "add" | user object

  const activeCount  = sessions.filter(s => !s.revoked).length;

  function handleSave(form) {
    if (modal === "add") {
      addUser(form);
    } else {
      updateUser({ ...modal, ...form });
    }
    setModal(null);
  }

  const Tab = ({ id, label, badge }) => (
    <button onClick={() => setTab(id)} style={{ padding:"8px 18px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:tab===id?700:400, background:tab===id?`${C.ac}18`:"transparent", color:tab===id?C.ac:C.mu, fontFamily:"'Archivo',sans-serif" }}>
      {label}{badge>0 && <span style={{ marginLeft:6, background:tab===id?C.ac:C.mu, color:"#fff", borderRadius:10, fontSize:10, padding:"1px 6px" }}>{badge}</span>}
    </button>
  );

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:18, maxWidth:860 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:4 }}>
          <Tab id="users"    label="Users"          badge={users.length} />
          <Tab id="sessions" label="Active Sessions" badge={activeCount} />
        </div>
        {tab === "users" && (
          <Btn onClick={() => setModal("add")}>+ Add User</Btn>
        )}
      </div>

      {tab === "users" && (
        <Section title={`${users.length} user${users.length !== 1 ? "s" : ""}`}>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {users.map(u => {
              const userSessions = sessions.filter(s => s.userId === u.id && !s.revoked).length;
              return (
                <div key={u.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", background:C.el, border:`1px solid ${C.br}`, borderRadius:12, opacity:u.active?1:0.55 }}>
                  <div style={{ width:38, height:38, borderRadius:"50%", background:`${C.ac}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                    {u.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:13, fontWeight:600 }}>{u.name}</span>
                      <Badge color={u.role === "admin" ? C.ac : C.mu}>{u.role}</Badge>
                      {!u.active && <Badge color={C.err}>Inactive</Badge>}
                      {userSessions > 0 && <Badge color={C.ok}>{userSessions} session{userSessions>1?"s":""} active</Badge>}
                    </div>
                    <div style={{ fontSize:12, color:C.mu, marginTop:2 }}>{u.email}</div>
                    <div style={{ fontSize:11, color:C.mu2, marginTop:1 }}>Added {fDate(u.createdAt)}</div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <Btn onClick={() => setModal(u)} variant="secondary" style={{ fontSize:11, padding:"6px 12px" }}>Edit</Btn>
                    {u.id !== "admin-seed" && (
                      u.active
                        ? <Btn onClick={() => { if (confirm(`Deactivate ${u.name}? Their active sessions will be revoked.`)) deactivateUser(u.id); }} variant="danger" style={{ fontSize:11, padding:"6px 12px" }}>Deactivate</Btn>
                        : <Btn onClick={() => reactivateUser(u.id)} variant="secondary" style={{ fontSize:11, padding:"6px 12px" }}>Reactivate</Btn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {tab === "sessions" && (
        <Section title={`${activeCount} active session${activeCount !== 1 ? "s" : ""}`}>
          <SessionsTab />
        </Section>
      )}

      {modal && <UserModal existing={modal === "add" ? null : modal} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
}
