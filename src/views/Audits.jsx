import { C, CATS } from "../constants.js";
import { fDate } from "../utils.js";
import { Btn, Badge, EmptyState, Label } from "../components/UI.jsx";

const AUDIT_ST = {
  pending:     { l:"Pending",     c:"#7B82A0", bg:"#7B82A015" },
  in_progress: { l:"In Progress", c:"#FBBF24", bg:"#FBBF2415" },
  completed:   { l:"Completed",   c:"#10B981", bg:"#10B98115" },
};
const AuditBadge = ({ s }) => {
  const cfg = AUDIT_ST[s]||AUDIT_ST.pending;
  return <span style={{ background:cfg.bg, color:cfg.c, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>{cfg.l}</span>;
};

function AuditDetail({ audit, assets, onStart, onRun, onDelete, onBack }) {
  const done  = (audit.checklist||[]).filter(c=>c.found!==null).length;
  const total = (audit.checklist||[]).length;
  const found = (audit.checklist||[]).filter(c=>c.found===true).length;
  const missing = (audit.checklist||[]).filter(c=>c.found===false).length;
  const pct = total>0 ? Math.round(done/total*100) : 0;

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:18, maxWidth:860 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center", justifyContent:"space-between", flexWrap:"wrap" }}>
        <div>
          <button onClick={onBack} style={{ background:C.el, border:`1px solid ${C.br}`, color:C.mu, cursor:"pointer", padding:"7px 12px", borderRadius:8, fontSize:13, fontFamily:"'Inter',sans-serif", marginRight:12 }}>← Back</button>
          <AuditBadge s={audit.status} />
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {audit.status==="pending"     && <Btn onClick={()=>onStart(audit)} variant="primary">▶  Start Audit</Btn>}
          {audit.status==="in_progress" && <Btn onClick={()=>onRun(audit)}   variant="primary">▶  Continue</Btn>}
          {audit.status==="completed"   && <Btn onClick={()=>onRun(audit)}   variant="secondary">👁  Review</Btn>}
          <Btn onClick={()=>{ if(confirm("Delete this audit?")) onDelete(audit.id); }} variant="danger">Delete</Btn>
        </div>
      </div>

      {/* Header card */}
      <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20 }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:18 }}>{audit.name}</div>
        <div style={{ fontSize:13, color:C.mu, marginTop:4 }}>Due: {fDate(audit.dueDate)} · {total} assets in scope</div>
        {audit.notes && <div style={{ fontSize:13, color:C.mu2, marginTop:6 }}>{audit.notes}</div>}

        {total>0 && (
          <div style={{ marginTop:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12, color:C.mu }}>Progress: {done} / {total} checked</span>
              <span style={{ fontSize:12, fontWeight:700 }}>{pct}%</span>
            </div>
            <div style={{ height:8, background:C.el, borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:pct===100?C.ok:C.ac, transition:"width 0.3s", borderRadius:4 }} />
            </div>
            <div style={{ display:"flex", gap:16, marginTop:10 }}>
              <span style={{ fontSize:13, color:C.ok }}>✓ Found: {found}</span>
              <span style={{ fontSize:13, color:C.err }}>✗ Missing: {missing}</span>
              <span style={{ fontSize:13, color:C.mu }}>— Unchecked: {total-done}</span>
            </div>
          </div>
        )}
      </div>

      {/* Checklist table */}
      <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20 }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:15, marginBottom:14 }}>Checklist</div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.br}` }}>
                {["Asset","Code","Location","Found?","Condition","Notes"].map(h=>(
                  <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:C.mu, fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:"0.07em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(audit.checklist||[]).map(item => {
                const asset = assets.find(a=>a.id===item.assetId);
                return (
                  <tr key={item.assetId} style={{ borderBottom:`1px solid ${C.br}` }}>
                    <td style={{ padding:"10px 12px" }}>
                      <div style={{ fontWeight:600 }}>{item.assetName||asset?.name||"—"}</div>
                      {CATS[asset?.cat] && <div style={{ fontSize:11, color:C.mu }}>{CATS[asset.cat].emoji} {CATS[asset.cat].label}</div>}
                    </td>
                    <td style={{ padding:"10px 12px", fontFamily:"'Noto Sans Mono',monospace", fontSize:11, color:C.mu }}>{item.assetCode||asset?.code||"—"}</td>
                    <td style={{ padding:"10px 12px", color:C.mu, fontSize:12 }}>{item.loc||asset?.loc||"—"}</td>
                    <td style={{ padding:"10px 12px" }}>
                      {item.found===null ? <span style={{ color:C.mu2 }}>—</span>
                       : item.found ? <span style={{ color:C.ok, fontWeight:700 }}>✓ Yes</span>
                       : <span style={{ color:C.err, fontWeight:700 }}>✗ No</span>}
                    </td>
                    <td style={{ padding:"10px 12px", color:C.mu, fontSize:12 }}>{item.condition||"—"}</td>
                    <td style={{ padding:"10px 12px", color:C.mu2, fontSize:12, maxWidth:180 }}>{item.notes||"—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Audits({ audits, assets, setView, onCreateAudit, onStartAudit, onRunAudit, onDeleteAudit, onUpdateAudit }) {
  const [selId, setSelId] = React.useState(null);
  const sel = audits.find(a=>a.id===selId);

  // Need React import for useState
  const [, forceUpdate] = React.useState(0);

  if (sel) return <AuditDetail audit={sel} assets={assets} onStart={a=>{ onStartAudit(a); forceUpdate(n=>n+1); }} onRun={onRunAudit} onDelete={id=>{ onDeleteAudit(id); setSelId(null); }} onBack={()=>setSelId(null)} />;

  if (audits.length===0) return (
    <div className="fade">
      <EmptyState icon="📋" title="No audits yet" sub="Schedule a physical audit to verify your inventory room-by-room." />
      <div style={{ textAlign:"center", marginTop:16 }}><Btn onClick={onCreateAudit} variant="primary">+ Schedule Audit</Btn></div>
    </div>
  );

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:C.mu }}>{audits.length} audit{audits.length!==1?"s":""}</div>
        <Btn onClick={onCreateAudit} variant="primary" style={{ fontSize:12, padding:"7px 16px" }}>+ Schedule Audit</Btn>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[...audits].sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).map(audit => {
          const done  = (audit.checklist||[]).filter(c=>c.found!==null).length;
          const total = (audit.checklist||[]).length;
          const pct   = total>0 ? Math.round(done/total*100) : 0;
          const missing = (audit.checklist||[]).filter(c=>c.found===false).length;

          return (
            <div key={audit.id} style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:12, padding:"16px 20px", cursor:"pointer", transition:"border-color 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.ac}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.br}
              onClick={()=>setSelId(audit.id)}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:700 }}>{audit.name}</span>
                    <AuditBadge s={audit.status} />
                    {missing>0 && <span style={{ background:`${C.err}18`, color:C.err, padding:"2px 8px", borderRadius:8, fontSize:11, fontWeight:700 }}>{missing} missing</span>}
                  </div>
                  <div style={{ fontSize:12, color:C.mu }}>Due: {fDate(audit.dueDate)} · {total} assets · {done}/{total} checked</div>
                </div>
                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  {audit.status==="pending"     && <Btn onClick={e=>{ e.stopPropagation(); onStartAudit(audit); }} variant="primary" style={{ fontSize:12, padding:"6px 12px" }}>▶ Start</Btn>}
                  {audit.status==="in_progress" && <Btn onClick={e=>{ e.stopPropagation(); onRunAudit(audit); }}  variant="primary" style={{ fontSize:12, padding:"6px 12px" }}>▶ Continue</Btn>}
                </div>
              </div>
              {total>0 && (
                <div style={{ marginTop:10 }}>
                  <div style={{ height:5, background:C.el, borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:pct===100?C.ok:C.ac, borderRadius:3 }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Need React in scope for useState
import React from "react";
