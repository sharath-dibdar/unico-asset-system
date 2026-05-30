import { useState } from "react";
import { C, CATS, AUDIT_SCOPE } from "../constants.js";
import { uid } from "../utils.js";
import { Label, Btn, Modal } from "../components/UI.jsx";

export function CreateAuditModal({ assets, onSave, onClose }) {
  const [form, setForm] = useState({ name:"", dueDate:"", scope:"all", scopeValue:"", notes:"" });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const canSave = form.name && form.dueDate;

  const locations = [...new Set(assets.map(a=>a.loc).filter(Boolean))].sort();

  function scopedAssets() {
    if (form.scope==="category") return assets.filter(a=>a.cat===form.scopeValue);
    if (form.scope==="location") return assets.filter(a=>a.loc===form.scopeValue);
    return assets.filter(a=>!a.disposal);
  }
  const inScope = scopedAssets();

  function save() {
    if (!canSave) return;
    const checklist = inScope.map(a=>({ assetId:a.id, assetCode:a.code, assetName:a.name, loc:a.loc||"", found:null, condition:"", notes:"", checkedAt:null }));
    onSave({ id:uid(), ...form, assetIds:inScope.map(a=>a.id), checklist, status:"pending", createdAt:new Date().toISOString(), completedAt:null });
  }

  return (
    <Modal title="Schedule Physical Audit" sub="Set up a new inventory verification task" onClose={onClose}
      footer={<><Btn onClick={onClose} variant="secondary">Cancel</Btn><Btn onClick={save} variant="success" style={{ opacity:canSave?1:0.5 }}>Create Audit ({inScope.length} assets)</Btn></>}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div><Label>Audit Name *</Label><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Q1 2026 Physical Audit" /></div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><Label>Due Date *</Label><input type="date" value={form.dueDate} onChange={e=>set("dueDate",e.target.value)} /></div>
          <div><Label>Scope</Label>
            <select value={form.scope} onChange={e=>{ set("scope",e.target.value); set("scopeValue",""); }}>
              {AUDIT_SCOPE.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>
        </div>

        {form.scope==="category" && (
          <div><Label>Category</Label>
            <select value={form.scopeValue} onChange={e=>set("scopeValue",e.target.value)}>
              <option value="">Select category…</option>
              {Object.entries(CATS).map(([k,v])=><option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
          </div>
        )}

        {form.scope==="location" && (
          <div><Label>Location</Label>
            <select value={form.scopeValue} onChange={e=>set("scopeValue",e.target.value)}>
              <option value="">Select location…</option>
              {locations.map(l=><option key={l}>{l}</option>)}
            </select>
          </div>
        )}

        <div style={{ background:C.el, borderRadius:10, padding:12, fontSize:13, color:C.mu }}>
          📋 {inScope.length} asset{inScope.length!==1?"s":""} will be included in this audit
          {form.scope!=="all" && !form.scopeValue && <span style={{ color:C.ac2 }}> — select a {form.scope} filter above</span>}
        </div>

        <div><Label>Notes</Label><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={2} style={{ resize:"vertical" }} placeholder="Instructions, areas to focus on, etc." /></div>
      </div>
    </Modal>
  );
}

export function AuditRunModal({ audit, assets, onComplete, onClose }) {
  const [checks, setChecks] = useState(audit.checklist.map(c=>({...c})));
  const [idx, setIdx]       = useState(() => {
    const first = audit.checklist.findIndex(c=>c.found===null);
    return first>=0 ? first : 0;
  });

  const item    = checks[idx];
  const asset   = assets.find(a=>a.id===item?.assetId);
  const done    = checks.filter(c=>c.found!==null).length;
  const allDone = done === checks.length;

  function update(k,v) {
    setChecks(cs => cs.map((c,i) => i===idx ? { ...c, [k]:v } : c));
  }
  function markFound(found) {
    setChecks(cs => cs.map((c,i) => i===idx ? { ...c, found, checkedAt:new Date().toISOString() } : c));
  }

  function saveAndNext() {
    if (idx < checks.length-1) setIdx(i=>i+1);
  }

  function complete() {
    onComplete(checks);
  }

  if (!item) return null;

  const pct = Math.round(done/checks.length*100);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:16 }}>
      <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:16, width:"100%", maxWidth:520, display:"flex", flexDirection:"column" }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 12px", borderBottom:`1px solid ${C.br}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ fontFamily:"'Archivo',sans-serif", fontWeight:800, fontSize:16 }}>{audit.name}</div>
            <button onClick={onClose} style={{ background:"none", border:"none", color:C.mu, cursor:"pointer", fontSize:20 }}>×</button>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:12, color:C.mu }}>Asset {idx+1} of {checks.length}</span>
            <span style={{ fontSize:12, fontWeight:700 }}>{pct}% done</span>
          </div>
          <div style={{ height:6, background:C.el, borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, background:pct===100?C.ok:C.ac, transition:"width 0.3s", borderRadius:3 }} />
          </div>
        </div>

        {/* Asset info */}
        <div style={{ padding:"16px 24px", borderBottom:`1px solid ${C.br}`, background:C.el }}>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ fontSize:28 }}>{CATS[asset?.cat]?.emoji||"📦"}</div>
            <div>
              <div style={{ fontSize:16, fontWeight:700 }}>{item.assetName}</div>
              <div style={{ fontSize:12, color:C.mu, fontFamily:"'Noto Sans Mono',monospace" }}>{item.assetCode}</div>
              <div style={{ fontSize:12, color:C.mu }}>📍 {item.loc||"—"}</div>
            </div>
          </div>
        </div>

        {/* Check controls */}
        <div style={{ padding:24, display:"flex", flexDirection:"column", gap:16 }}>
          {/* Found? */}
          <div>
            <Label>Is this asset present?</Label>
            <div style={{ display:"flex", gap:12, marginTop:8 }}>
              <button onClick={()=>markFound(true)} style={{
                flex:1, padding:"12px", borderRadius:10, border:`2px solid ${item.found===true?C.ok:C.br}`,
                background:item.found===true?`${C.ok}18`:"transparent", color:item.found===true?C.ok:C.mu,
                cursor:"pointer", fontWeight:700, fontSize:15, fontFamily:"'Archivo',sans-serif"
              }}>✓ Found</button>
              <button onClick={()=>markFound(false)} style={{
                flex:1, padding:"12px", borderRadius:10, border:`2px solid ${item.found===false?C.err:C.br}`,
                background:item.found===false?`${C.err}18`:"transparent", color:item.found===false?C.err:C.mu,
                cursor:"pointer", fontWeight:700, fontSize:15, fontFamily:"'Archivo',sans-serif"
              }}>✗ Not Found</button>
            </div>
          </div>

          {item.found===true && (
            <div><Label>Condition</Label>
              <select value={item.condition||""} onChange={e=>update("condition",e.target.value)}>
                <option value="">Select condition…</option>
                {["Excellent","Good","Fair","Poor","Damaged"].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div><Label>Notes (optional)</Label>
            <textarea value={item.notes||""} onChange={e=>update("notes",e.target.value)} rows={2} style={{ resize:"vertical" }} placeholder="Observations, discrepancies, damage…" />
          </div>
        </div>

        {/* Footer nav */}
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${C.br}`, display:"flex", justifyContent:"space-between", gap:10 }}>
          <div style={{ display:"flex", gap:8 }}>
            {idx>0 && <Btn onClick={()=>setIdx(i=>i-1)} variant="secondary" style={{ fontSize:12, padding:"7px 14px" }}>← Prev</Btn>}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {!allDone && idx<checks.length-1 && (
              <Btn onClick={saveAndNext} variant="secondary" style={{ fontSize:12, padding:"7px 14px" }}>Skip →</Btn>
            )}
            {idx<checks.length-1 && item.found!==null && (
              <Btn onClick={saveAndNext} variant="primary" style={{ fontSize:12, padding:"7px 14px" }}>Next →</Btn>
            )}
            {(allDone||(idx===checks.length-1&&item.found!==null)) && (
              <Btn onClick={complete} variant="success">Complete Audit ✓</Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

