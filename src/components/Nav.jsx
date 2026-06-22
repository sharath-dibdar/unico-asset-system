import { C, CATS, ST_CFG } from "../constants.js";
import { dTo } from "../utils.js";
import { useAuth } from "../auth/AuthContext.jsx";

export function Sidebar({ view, setView, assets, vendors, audits, onAdd, onImport, onExport, onPrintLabels, onScan }) {
  const { me, isAdmin, logout } = useAuth();

  const expired      = assets.filter(a => { const d = dTo(a.wEnd); return d !== null && d < 0; }).length;
  const expiring     = assets.filter(a => { const d = dTo(a.wEnd); return d !== null && d >= 0 && d <= 90; }).length;
  const insExpiring  = assets.filter(a => { const d = dTo(a.insurance?.renewalDate); return d !== null && d >= 0 && d <= 90; }).length;
  const checkedOut   = assets.filter(a => a.status === "in_use").length;
  const pendingAudits = (audits || []).filter(a => a.status === "pending" || a.status === "in_progress").length;

  const navItem = (id, icon, label, badge) => (
    <button key={id} onClick={() => setView(id)} style={{
      display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 22px",
      background: view === id ? `${C.ac}14` : "transparent",
      borderLeft: view === id ? `3px solid ${C.ac}` : "3px solid transparent",
      border: "none", cursor: "pointer",
      color: view === id ? C.ac : C.mu, fontSize: 13, fontWeight: view === id ? 600 : 400,
      fontFamily: "'Archivo',sans-serif", textAlign: "left", width: "100%", transition: "all 0.15s",
    }}>
      <span style={{ display:"flex", alignItems:"center", gap:10 }}>{icon}  {label}</span>
      {badge > 0 && <span style={{ background:C.err, color:"#fff", borderRadius:10, fontSize:10, fontWeight:700, padding:"1px 6px", minWidth:18, textAlign:"center" }}>{badge}</span>}
    </button>
  );

  const navGroup = label => (
    <div style={{ padding:"16px 22px 6px", fontSize:10, color:C.mu2, letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:600 }}>{label}</div>
  );

  return (
    <div className="dsk" style={{ width:230, background:C.sf, borderRight:`1px solid ${C.br}`, display:"flex", flexDirection:"column", padding:"0 0 16px", flexShrink:0, userSelect:"none", overflowY:"auto" }}>
      {/* Brand */}
      <div style={{ padding:"18px 22px 10px", display:"flex", alignItems:"center", gap:10 }}>
        <img src="/logo.svg" alt="Unico" style={{ width:36, height:36, borderRadius:8, flexShrink:0 }} />
        <div>
          <div style={{ fontFamily:"'Archivo',sans-serif", fontWeight:800, fontSize:15, color:C.tx, letterSpacing:"0.03em" }}>UNICO</div>
          <div style={{ fontSize:9, color:C.mu2, letterSpacing:"0.12em", textTransform:"uppercase" }}>Asset Intelligence</div>
        </div>
      </div>

      {/* Scan button — everyone */}
      <div style={{ padding:"0 16px 10px" }}>
        <button onClick={onScan} style={{ width:"100%", background:`${C.ac}18`, border:`1px solid ${C.ac}40`, color:C.ac, cursor:"pointer", padding:"10px", borderRadius:10, fontSize:13, fontWeight:700, fontFamily:"'Archivo',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          📷 Scan QR
        </button>
      </div>

      {/* Add button — admin only */}
      {isAdmin && (
        <div style={{ padding:"0 16px 12px" }}>
          <button onClick={onAdd} style={{ width:"100%", background:C.el, border:`1px solid ${C.br}`, color:C.tx, cursor:"pointer", padding:"10px", borderRadius:10, fontSize:13, fontWeight:700, fontFamily:"'Archivo',sans-serif" }}>
            + New Asset
          </button>
        </div>
      )}

      {navGroup("Main")}
      {navItem("dashboard", "⊞", "Dashboard")}
      {navItem("list",      "≡", "All Assets")}
      {navItem("checkout",  "⇄", "Check-In / Out", checkedOut)}

      {isAdmin && (
        <>
          {navGroup("Management")}
          {navItem("vendors",   "🏪", "Vendor Book")}
          {navItem("audits",    "📋", "Physical Audits", pendingAudits)}
          {navItem("reports",   "📊", "Reports")}
          {navItem("useradmin", "👥", "Users & Access")}
        </>
      )}

      {isAdmin && (
        <>
          {navGroup("Categories")}
          {Object.entries(CATS).map(([k, v]) => {
            const n = assets.filter(a => a.cat === k).length;
            return (
              <button key={k} onClick={() => setView("list")} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 22px", background:"transparent", border:"none", cursor:"pointer", color:C.mu, fontSize:12, fontFamily:"'Archivo',sans-serif", width:"100%", transition:"color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.color = C.tx}
                onMouseLeave={e => e.currentTarget.style.color = C.mu}>
                <span>{v.emoji}  {v.label}</span>
                <span style={{ background:C.el, padding:"1px 8px", borderRadius:10, fontSize:10, color:C.mu }}>{n}</span>
              </button>
            );
          })}
        </>
      )}

      {/* Alerts */}
      {(expired > 0 || expiring > 0 || insExpiring > 0) && (
        <div style={{ margin:"12px 16px 0", background:`${C.err}0E`, border:`1px solid ${C.err}25`, borderRadius:10, padding:"10px 14px" }}>
          {expired    > 0 && <div style={{ fontSize:11, color:C.err,  marginBottom:2 }}>⚠  {expired} warrant{expired > 1 ? "ies" : "y"} expired</div>}
          {expiring   > 0 && <div style={{ fontSize:11, color:C.ac2, marginBottom:2 }}>⏰  {expiring} expiring within 90d</div>}
          {insExpiring > 0 && <div style={{ fontSize:11, color:C.ac2 }}>🛡  {insExpiring} insurance renewal{insExpiring > 1 ? "s" : ""} due</div>}
        </div>
      )}

      <div style={{ flex:1 }} />

      {/* Admin-only bottom actions */}
      {isAdmin && (
        <div style={{ padding:"12px 16px 0", display:"flex", flexDirection:"column", gap:6 }}>
          <button onClick={onImport}      style={{ background:C.el, border:`1px solid ${C.br}`, color:C.mu, cursor:"pointer", padding:"8px 12px", borderRadius:8, fontSize:12, fontFamily:"'Archivo',sans-serif", textAlign:"left" }}>⬆  Import Excel</button>
          <button onClick={onExport}      style={{ background:C.el, border:`1px solid ${C.br}`, color:C.mu, cursor:"pointer", padding:"8px 12px", borderRadius:8, fontSize:12, fontFamily:"'Archivo',sans-serif", textAlign:"left" }}>⬇  Export / Reports</button>
          <button onClick={onPrintLabels} style={{ background:C.el, border:`1px solid ${C.br}`, color:C.mu, cursor:"pointer", padding:"8px 12px", borderRadius:8, fontSize:12, fontFamily:"'Archivo',sans-serif", textAlign:"left" }}>🖨  Print QR Labels</button>
        </div>
      )}

      {/* User chip + logout */}
      <div style={{ margin:"12px 16px 0", padding:"10px 12px", background:C.el, border:`1px solid ${C.br}`, borderRadius:10, display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:30, height:30, borderRadius:"50%", background:`${C.ac}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:C.ac, flexShrink:0 }}>
          {me?.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{me?.name}</div>
          <div style={{ fontSize:10, color:C.mu, textTransform:"uppercase", letterSpacing:"0.06em" }}>{me?.role}</div>
        </div>
        <button onClick={logout} title="Sign out" style={{ background:"none", border:"none", color:C.mu, cursor:"pointer", fontSize:15, padding:"2px 4px", lineHeight:1 }}>⏏</button>
      </div>

      <div style={{ padding:"10px 22px 0" }}>
        <div style={{ fontSize:11, color:C.mu2 }}>TOTAL ASSETS</div>
        <div style={{ fontSize:24, fontWeight:800, fontFamily:"'Archivo',sans-serif", color:C.tx, lineHeight:1.1 }}>{assets.length}</div>
        {isAdmin && vendors?.length > 0 && <div style={{ fontSize:11, color:C.mu2, marginTop:3 }}>{vendors.length} vendor{vendors.length !== 1 ? "s" : ""} · {(audits || []).length} audit{(audits || []).length !== 1 ? "s" : ""}</div>}
      </div>
    </div>
  );
}

export function TopBar({ view, onAdd, onBack, onScan, selectedName }) {
  const { isAdmin } = useAuth();
  const titles = { dashboard:"Dashboard", list:"All Assets", detail:"Asset Detail", vendors:"Vendor Book", audits:"Physical Audits", audit:"Audit Detail", reports:"Reports", checkout:"Check-In / Out", useradmin:"Users & Access" };
  return (
    <div style={{ background:C.sf, borderBottom:`1px solid ${C.br}`, padding:"14px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {(view === "detail" || view === "audit") && (
          <button onClick={onBack} style={{ background:C.el, border:`1px solid ${C.br}`, color:C.mu, cursor:"pointer", padding:"7px 12px", borderRadius:8, fontSize:13, fontFamily:"'Archivo',sans-serif" }}>← Back</button>
        )}
        <div>
          <div style={{ fontFamily:"'Archivo',sans-serif", fontWeight:700, fontSize:17, color:C.tx, lineHeight:1 }}>
            {view === "detail" && selectedName ? selectedName : titles[view] || ""}
          </div>
          {view === "detail" && selectedName && <div style={{ fontSize:11, color:C.mu, marginTop:2 }}>Asset Detail</div>}
        </div>
      </div>
      <div style={{ display:"flex", gap:8, flexShrink:0 }} className="mob">
        <button onClick={onScan} style={{ background:`${C.ac}18`, border:`1px solid ${C.ac}40`, color:C.ac, cursor:"pointer", padding:"9px 14px", borderRadius:9, fontSize:13, fontWeight:700, fontFamily:"'Archivo',sans-serif" }}>
          📷
        </button>
        {isAdmin && (
          <button onClick={onAdd} style={{ background:C.ac, color:C.acTx, border:"none", cursor:"pointer", padding:"9px 18px", borderRadius:9, fontSize:13, fontWeight:700, fontFamily:"'Archivo',sans-serif" }}>
            + Add Asset
          </button>
        )}
      </div>
      <div style={{ display:"flex", gap:8, flexShrink:0 }} className="dsk">
        <button onClick={onScan} style={{ background:`${C.ac}18`, border:`1px solid ${C.ac}40`, color:C.ac, cursor:"pointer", padding:"9px 14px", borderRadius:9, fontSize:13, fontWeight:700, fontFamily:"'Archivo',sans-serif" }}>
          📷 Scan
        </button>
        {isAdmin && (
          <button onClick={onAdd} style={{ background:C.ac, color:C.acTx, border:"none", cursor:"pointer", padding:"9px 18px", borderRadius:9, fontSize:13, fontWeight:700, fontFamily:"'Archivo',sans-serif" }}>
            + Add Asset
          </button>
        )}
      </div>
    </div>
  );
}

export function BottomNav({ view, setView, onAdd, onScan }) {
  const { isAdmin } = useAuth();
  const items = [
    { id:"dashboard", icon:"⊞", l:"Home" },
    { id:"list",      icon:"≡",  l:"Assets" },
    { id:"checkout",  icon:"⇄",  l:"Check-In/Out" },
    ...(isAdmin ? [{ id:"vendors", icon:"🏪", l:"Vendors" }] : [{ id:"audits", icon:"📋", l:"Audits" }]),
  ];
  return (
    <div className="mob" style={{ background:C.sf, borderTop:`1px solid ${C.br}`, display:"flex", flexShrink:0, zIndex:10 }}>
      {items.map(n => (
        <button key={n.id} onClick={() => setView(n.id)} style={{ flex:1, background:"none", border:"none", cursor:"pointer", color:view === n.id ? C.ac : C.mu, padding:"10px 0 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:2, fontSize:16 }}>
          <span style={{ fontSize:16 }}>{n.icon}</span>
          <span style={{ fontSize:9, fontFamily:"'Archivo',sans-serif" }}>{n.l}</span>
        </button>
      ))}
      <button onClick={onScan} style={{ flex:1, background:"none", border:"none", cursor:"pointer", color:C.ac, padding:"10px 0 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
        <span style={{ fontSize:16 }}>📷</span>
        <span style={{ fontSize:9, fontFamily:"'Archivo',sans-serif" }}>Scan</span>
      </button>
      {isAdmin && (
        <button onClick={onAdd} style={{ flex:1, background:"none", border:"none", cursor:"pointer", color:C.ac, padding:"10px 0 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
          <span style={{ fontSize:16 }}>＋</span>
          <span style={{ fontSize:9, fontFamily:"'Archivo',sans-serif" }}>Add</span>
        </button>
      )}
    </div>
  );
}
