import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { CatIcon } from "../components/Icons.jsx";
import { C, CATS } from "../constants.js";
import { fDate } from "../utils.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Btn, EmptyState } from "../components/UI.jsx";

const AUDIT_ST = {
  pending:          { l:"Pending",            c:"#6B7280" },
  in_progress:      { l:"In Progress",        c:"#D97706" },
  awaiting_signoff: { l:"Awaiting Sign-off",  c:"#A16207" },
  completed:        { l:"Completed",          c:"#059669" },
};
const AuditBadge = ({ s }) => {
  const cfg = AUDIT_ST[s]||AUDIT_ST.pending;
  return <span style={{ background:`${cfg.c}18`, color:cfg.c, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{cfg.l}</span>;
};
const Chip = ({ color, children }) => (
  <span style={{ background:`${color}18`, color, padding:"2px 8px", borderRadius:8, fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{children}</span>
);

const fDateTime = d => d ? new Date(d).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";

// Who has to sign this audit, and who has. While awaiting sign-off the list is
// the current approvers; once completed it's the people who actually signed.
function signoffState(audit, signoffs, users) {
  const signed = signoffs.filter(s => s.audit_id === audit.id);
  const approvers = users.filter(u => u.audit_approver && u.active);
  const nameOf = id => users.find(u => u.id === id)?.name || "Former user";
  const rows = audit.status === "completed"
    ? signed.map(s => ({ id:s.profile_id, name:nameOf(s.profile_id), signedAt:s.signed_at }))
    : [
        ...approvers.map(u => ({ id:u.id, name:u.name, signedAt:signed.find(s => s.profile_id === u.id)?.signed_at || null })),
        // Someone who signed and has since stopped being an approver.
        ...signed.filter(s => !approvers.some(u => u.id === s.profile_id))
                 .map(s => ({ id:s.profile_id, name:nameOf(s.profile_id), signedAt:s.signed_at })),
      ];
  const required = approvers.length;
  const done = approvers.filter(u => signed.some(s => s.profile_id === u.id)).length;
  return { rows, required, done, signed };
}

function SignoffCard({ audit, signoffs, onSign, onSendReport }) {
  const { me, users, isAdmin } = useAuth();
  const [sending, setSending] = useState(false);
  const { rows, required, done, signed } = signoffState(audit, signoffs, users);
  const awaiting  = audit.status === "awaiting_signoff";
  const completed = audit.status === "completed";
  const iMustSign = awaiting && me?.audit_approver && !signed.some(s => s.profile_id === me.id);
  const legacy    = completed && signed.length === 0; // completed before sign-off existed

  async function send(resend) {
    setSending(true);
    const res = await onSendReport(audit.id, resend);
    setSending(false);
    if (!res.ok) alert(`Couldn't send the report.\n\n${res.error}`);
    else if (res.status === "already_sent") alert("This report was already sent.");
  }

  return (
    <div style={{ background:C.sf, border:`1px solid ${iMustSign ? C.ac : C.br}`, borderRadius:16, padding:20, boxShadow:C.shadow }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontWeight:700, fontSize:15 }}>Sign-off</div>
          <div style={{ fontSize:12, color:C.mu, marginTop:3 }}>
            {legacy ? "Completed before sign-off was required."
              : completed ? "Signed off by every approver."
              : required === 0 ? "No approvers are set up yet."
              : `${done} of ${required} approver${required !== 1 ? "s" : ""} signed`}
          </div>
        </div>
        {iMustSign && <Btn onClick={() => onSign(audit)} variant="primary">✍  Sign off as {me.name}</Btn>}
      </div>

      {required === 0 && awaiting && (
        <div style={{ marginTop:12, fontSize:12, color:C.err, background:`${C.err}0E`, border:`1px solid ${C.err}25`, borderRadius:10, padding:"10px 12px" }}>
          This audit can't be completed until at least one person is marked as an audit approver
          {isAdmin ? " — set this in Users & Access → Edit user." : ". Ask an admin to set this up."}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:14 }}>
          {rows.map(r => (
            <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:C.el, borderRadius:10 }}>
              <span style={{ width:22, height:22, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, flexShrink:0,
                background:r.signedAt ? C.ok : "#fff", color:r.signedAt ? "#fff" : C.mu2, border:r.signedAt ? "none" : `1px dashed ${C.mu2}` }}>
                {r.signedAt ? "✓" : ""}
              </span>
              <span style={{ fontSize:13, fontWeight:600, flex:1 }}>{r.name}{r.id === me?.id ? " (you)" : ""}</span>
              <span style={{ fontSize:12, color:r.signedAt ? C.mu : C.mu2 }}>{r.signedAt ? `Signed ${fDateTime(r.signedAt)}` : "Awaiting signature"}</span>
            </div>
          ))}
        </div>
      )}

      {completed && !legacy && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginTop:14, paddingTop:14, borderTop:`1px solid ${C.br}` }}>
          <div style={{ fontSize:13, color:audit.reportSentAt ? C.ok : C.ac2, fontWeight:600 }}>
            {audit.reportSentAt
              ? `📧 Report emailed${audit.reportRecipients ? ` to ${audit.reportRecipients} user${audit.reportRecipients !== 1 ? "s" : ""}` : ""} · ${fDateTime(audit.reportSentAt)}`
              : "📧 Report not emailed yet"}
          </div>
          {isAdmin && onSendReport && (
            <Btn onClick={() => send(!!audit.reportSentAt)} variant="secondary" disabled={sending} style={{ fontSize:12, padding:"7px 14px" }}>
              {sending ? "Sending…" : audit.reportSentAt ? "Resend report" : "Send report"}
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}

function AuditDetail({ audit, assets, signoffs, onStart, onRun, onDelete, onBack, onSign, onReopen, onSendReport }) {
  const done  = (audit.checklist||[]).filter(c=>c.found!==null).length;
  const total = (audit.checklist||[]).length;
  const found = (audit.checklist||[]).filter(c=>c.found===true).length;
  const missing = (audit.checklist||[]).filter(c=>c.found===false).length;
  const pct = total>0 ? Math.round(done/total*100) : 0;
  const showSignoff = audit.status === "awaiting_signoff" || audit.status === "completed";

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:18, maxWidth:860 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center", justifyContent:"space-between", flexWrap:"wrap" }}>
        <div>
          <button onClick={onBack} style={{ background:"#fff", border:`1px solid ${C.br}`, color:C.mu, cursor:"pointer", padding:"7px 12px", borderRadius:8, fontSize:13, fontFamily:"'Inter',sans-serif", marginRight:12 }}>← Back</button>
          <AuditBadge s={audit.status} />
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {audit.status==="pending"     && <Btn onClick={()=>onStart(audit)} variant="primary">▶  Start Audit</Btn>}
          {audit.status==="in_progress" && <Btn onClick={()=>onRun(audit)}   variant="primary">▶  Continue</Btn>}
          {showSignoff                  && <Btn onClick={()=>onRun(audit)}   variant="secondary">👁  Review results</Btn>}
          {audit.status==="awaiting_signoff" && onReopen && <Btn onClick={()=>onReopen(audit)} variant="secondary">↺  Reopen for changes</Btn>}
          {onDelete && <Btn onClick={()=>{ if(confirm("Delete this audit?")) onDelete(audit.id); }} variant="danger">Delete</Btn>}
        </div>
      </div>

      {/* Header card */}
      <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:16, padding:20, boxShadow:C.shadow }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:18 }}>{audit.name}</div>
        <div style={{ fontSize:13, color:C.mu, marginTop:4 }}>
          Due: {fDate(audit.dueDate)} · {total} assets in scope
          {audit.submittedAt && <> · Submitted {fDateTime(audit.submittedAt)}{audit.submittedBy ? ` by ${audit.submittedBy}` : ""}</>}
          {audit.status==="completed" && audit.completedAt && <> · Completed {fDateTime(audit.completedAt)}</>}
        </div>
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

      {showSignoff && <SignoffCard audit={audit} signoffs={signoffs} onSign={onSign} onSendReport={onSendReport} />}

      {/* Checklist table */}
      <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:16, padding:20, boxShadow:C.shadow }}>
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
                      {CATS[asset?.cat] && <div style={{ fontSize:11, color:C.mu }}><CatIcon cat={asset.cat} size={12} /> {CATS[asset.cat].label}</div>}
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

export default function Audits({ audits, assets, signoffs = [], onCreateAudit, onStartAudit, onRunAudit, onDeleteAudit, onSignAudit, onReopenAudit, onSendReport }) {
  const { me, users } = useAuth();
  const [selId, setSelId] = useState(null);
  const sel = audits.find(a=>a.id===selId);

  if (sel) return (
    <AuditDetail audit={sel} assets={assets} signoffs={signoffs}
      onStart={onStartAudit} onRun={onRunAudit}
      onDelete={onDeleteAudit ? id=>{ onDeleteAudit(id); setSelId(null); } : null}
      onBack={()=>setSelId(null)}
      onSign={onSignAudit} onReopen={onReopenAudit} onSendReport={onSendReport} />
  );

  if (audits.length===0) return (
    <div className="fade">
      <EmptyState icon={ClipboardCheck} title="No audits yet" sub="Schedule a physical audit to verify your inventory room-by-room." />
      {onCreateAudit && <div style={{ textAlign:"center", marginTop:16 }}><Btn onClick={onCreateAudit} variant="primary">+ Schedule Audit</Btn></div>}
    </div>
  );

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:C.mu }}>{audits.length} audit{audits.length!==1?"s":""}</div>
        {onCreateAudit && <Btn onClick={onCreateAudit} variant="primary" style={{ fontSize:12, padding:"7px 16px" }}>+ Schedule Audit</Btn>}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[...audits].sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).map(audit => {
          const done  = (audit.checklist||[]).filter(c=>c.found!==null).length;
          const total = (audit.checklist||[]).length;
          const pct   = total>0 ? Math.round(done/total*100) : 0;
          const missing = (audit.checklist||[]).filter(c=>c.found===false).length;
          const awaiting = audit.status === "awaiting_signoff";
          const so = awaiting ? signoffState(audit, signoffs, users) : null;
          const needsMe = awaiting && me?.audit_approver && !so.signed.some(s => s.profile_id === me.id);

          return (
            <div key={audit.id} style={{ background:C.sf, border:`1px solid ${needsMe ? C.ac : C.br}`, borderRadius:14, padding:"16px 20px", cursor:"pointer", transition:"border-color 0.15s", boxShadow:C.shadow }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.ac}
              onMouseLeave={e=>e.currentTarget.style.borderColor=needsMe ? C.ac : C.br}
              onClick={()=>setSelId(audit.id)}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                    <span style={{ fontSize:15, fontWeight:700 }}>{audit.name}</span>
                    <AuditBadge s={audit.status} />
                    {awaiting && <Chip color={C.acD}>Sign-offs {so.done}/{so.required}</Chip>}
                    {needsMe && <Chip color={C.err}>Your sign-off needed</Chip>}
                    {missing>0 && <Chip color={C.err}>{missing} missing</Chip>}
                  </div>
                  <div style={{ fontSize:12, color:C.mu }}>Due: {fDate(audit.dueDate)} · {total} assets · {done}/{total} checked</div>
                </div>
                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  {audit.status==="pending"     && <Btn onClick={e=>{ e.stopPropagation(); onStartAudit(audit); }} variant="primary" style={{ fontSize:12, padding:"6px 12px" }}>▶ Start</Btn>}
                  {audit.status==="in_progress" && <Btn onClick={e=>{ e.stopPropagation(); onRunAudit(audit); }}  variant="primary" style={{ fontSize:12, padding:"6px 12px" }}>▶ Continue</Btn>}
                  {needsMe && <Btn onClick={e=>{ e.stopPropagation(); setSelId(audit.id); }} variant="primary" style={{ fontSize:12, padding:"6px 12px" }}>✍ Review & sign</Btn>}
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
