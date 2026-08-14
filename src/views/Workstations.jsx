import { C, CATS } from "../constants.js";
import { Badge, Btn, EmptyState } from "../components/UI.jsx";

export default function Workstations({ workstations, assets, isAdmin, onAdd, onEdit, onDelete, onCheckOut, onCheckIn }) {
  if (workstations.length === 0) return (
    <div className="fade">
      <EmptyState icon="🖥️" title="No workstations yet" sub="Bundle assets like a CPU, monitor, and keyboard so they can be assigned and checked out together." />
      {isAdmin && <div style={{ textAlign:"center", marginTop:16 }}><Btn onClick={onAdd} variant="primary">+ Create First Workstation</Btn></div>}
    </div>
  );

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:C.mu }}>{workstations.length} workstation{workstations.length !== 1 ? "s" : ""}</div>
        {isAdmin && <Btn onClick={onAdd} variant="primary" style={{ fontSize:12, padding:"7px 16px" }}>+ New Workstation</Btn>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
        {workstations.map(w => {
          const bundled = w.assetIds.map(id => assets.find(a => a.id === id)).filter(Boolean);
          const isOut = w.status === "in_use";
          return (
            <div key={w.id} style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:18, display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                    <span style={{ fontSize:15, fontWeight:700, fontFamily:"'Inter',sans-serif" }}>🖥️ {w.name}</span>
                    <Badge s={w.status} />
                  </div>
                  {w.location && <div style={{ fontSize:12, color:C.mu, marginTop:2 }}>📍 {w.location}</div>}
                  {isOut && w.assignTo && <div style={{ fontSize:12, color:C.tx, marginTop:2 }}>👤 With: {w.assignTo}</div>}
                </div>
                {isAdmin && (
                  <div style={{ display:"flex", gap:6, flexShrink:0, marginLeft:8 }}>
                    <button onClick={() => onEdit(w)} style={{ background:C.el, border:`1px solid ${C.br}`, color:C.mu, cursor:"pointer", padding:"5px 10px", borderRadius:7, fontSize:12, fontFamily:"'Inter',sans-serif" }}>Edit</button>
                    <button onClick={() => { if (confirm(`Delete workstation "${w.name}"? Bundled assets will be unlinked, not deleted.`)) onDelete(w.id); }} style={{ background:`${C.err}10`, border:`1px solid ${C.err}25`, color:C.err, cursor:"pointer", padding:"5px 10px", borderRadius:7, fontSize:12, fontFamily:"'Inter',sans-serif" }}>✕</button>
                  </div>
                )}
              </div>

              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {bundled.map(a => (
                  <span key={a.id} style={{ fontSize:11, background:C.el, color:C.mu, padding:"3px 9px", borderRadius:8 }}>{CATS[a.cat]?.emoji} {a.name}</span>
                ))}
                {bundled.length === 0 && <span style={{ fontSize:12, color:C.mu2 }}>No assets bundled</span>}
              </div>

              {w.notes && <div style={{ fontSize:12, color:C.mu2, borderTop:`1px solid ${C.br}`, paddingTop:8 }}>{w.notes}</div>}

              <div style={{ borderTop:`1px solid ${C.br}`, paddingTop:10 }}>
                {isOut
                  ? <Btn onClick={() => onCheckIn(w)} variant="success" style={{ width:"100%" }}>✓ Check In</Btn>
                  : <Btn onClick={() => onCheckOut(w)} variant="primary" style={{ width:"100%" }} disabled={bundled.length === 0}>⇄ Check Out</Btn>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
