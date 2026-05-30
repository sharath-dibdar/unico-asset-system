import { useState, useRef } from "react";
import { C, CATS, SPEC_DEF, PAYMENT_MODES } from "../constants.js";
import { calcDep, compressImage, fINR } from "../utils.js";
import { Label, Btn } from "../components/UI.jsx";

const STEPS = ["Basic Info", "Procurement & Docs", "Insurance & AMC", "Technical Specs"];

export default function AssetModal({ form, setForm, onSave, onClose, isEdit, vendors }) {
  const [step, setStep] = useState(1);
  const photoRef  = useRef();
  const docRef    = useRef();
  const set       = (k,v) => setForm(p=>({...p,[k]:v}));
  const setSpec   = (k,v) => setForm(p=>({...p,specs:{...p.specs,[k]:v}}));
  const setIns    = (k,v) => setForm(p=>({...p,insurance:{...p.insurance,[k]:v}}));
  const specDefs  = SPEC_DEF[form.cat]||[];
  const steps     = specDefs.length>0 ? 4 : 3;
  const canNext   = step===1 ? (form.name&&form.cat&&form.make) : step===2 ? (form.pDate&&form.price) : true;
  const depPreview = form.price&&form.pDate&&form.cat&&CATS[form.cat] ? calcDep(form.price,form.pDate,CATS[form.cat].rate) : null;

  async function addPhotos(files) {
    const compressed = await Promise.all([...files].slice(0,4-(form.photos||[]).length).map(f=>compressImage(f)));
    setForm(p=>({...p, photos:[...(p.photos||[]), ...compressed]}));
  }

  async function addDocument(file) {
    if (file.size > 3*1024*1024) { alert("File too large (max 3MB)"); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const doc = { name:file.name, type:file.type, data:e.target.result, uploadedAt:new Date().toISOString() };
      setForm(p=>({...p, documents:[...(p.documents||[]), doc]}));
    };
    reader.readAsDataURL(file);
  }

  const stepLabels = ["Basic Info", "Procurement & Docs", "Insurance & AMC", specDefs.length>0?"Technical Specs":null].filter(Boolean);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:16 }}>
      <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:16, width:"100%", maxWidth:580, maxHeight:"92vh", overflow:"auto", display:"flex", flexDirection:"column" }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${C.br}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18 }}>{isEdit?"Edit Asset":"New Asset"}</div>
            <div style={{ fontSize:11, color:C.mu, marginTop:2 }}>Step {step} of {steps} — {stepLabels[step-1]}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.mu, cursor:"pointer", fontSize:24, lineHeight:1, padding:4 }}>×</button>
        </div>
        {/* Progress bar */}
        <div style={{ height:3, background:C.el, flexShrink:0 }}>
          <div style={{ height:"100%", background:C.ac, width:`${(step/steps)*100}%`, transition:"width 0.3s" }} />
        </div>

        {/* Body */}
        <div style={{ padding:24, flex:1, overflow:"auto" }}>

          {/* STEP 1: Basic Info */}
          {step===1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div><Label>Asset Name *</Label><input value={form.name||""} onChange={e=>set("name",e.target.value)} placeholder="e.g. Sony A7 IV Body" /></div>
              <div><Label>Category *</Label>
                <select value={form.cat||""} onChange={e=>set("cat",e.target.value)}>
                  <option value="">Select category…</option>
                  {Object.entries(CATS).map(([k,v])=><option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><Label>Make / Brand *</Label><input value={form.make||""} onChange={e=>set("make",e.target.value)} placeholder="Apple, Sony, Dell…" /></div>
                <div><Label>Model</Label><input value={form.model||""} onChange={e=>set("model",e.target.value)} placeholder="Model number/name" /></div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><Label>Serial Number</Label><input value={form.serial||""} onChange={e=>set("serial",e.target.value)} placeholder="Optional" /></div>
                <div><Label>Color</Label><input value={form.color||""} onChange={e=>set("color",e.target.value)} placeholder="e.g. Space Black" /></div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><Label>Condition</Label>
                  <select value={form.cond||"Good"} onChange={e=>set("cond",e.target.value)}>
                    {["New","Excellent","Good","Fair","Poor"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><Label>Status</Label>
                  <select value={form.status||"active"} onChange={e=>set("status",e.target.value)}>
                    {[["active","Active"],["in_use","In Use"],["in_repair","In Repair"],["retired","Retired"],["lost","Lost"]].map(([k,l])=><option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><Label>Location</Label><input value={form.loc||""} onChange={e=>set("loc",e.target.value)} placeholder="Edit Desk 1, Studio…" /></div>
                <div><Label>Assigned To</Label><input value={form.assignTo||""} onChange={e=>set("assignTo",e.target.value)} placeholder="Name / Common Pool" /></div>
              </div>

              {/* Photo upload */}
              <div>
                <Label>Photos ({(form.photos||[]).length}/4)</Label>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:6 }}>
                  {(form.photos||[]).map((ph,i)=>(
                    <div key={i} style={{ position:"relative" }}>
                      <img src={ph} alt="" style={{ width:70, height:70, objectFit:"cover", borderRadius:8, border:`1px solid ${C.br}` }} />
                      <button onClick={()=>setForm(p=>({...p,photos:p.photos.filter((_,j)=>j!==i)}))}
                        style={{ position:"absolute", top:2, right:2, background:"rgba(0,0,0,0.7)", border:"none", color:"#fff", borderRadius:"50%", width:18, height:18, cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>×</button>
                    </div>
                  ))}
                  {(form.photos||[]).length<4 && (
                    <button onClick={()=>photoRef.current?.click()}
                      style={{ width:70, height:70, background:C.el, border:`2px dashed ${C.br}`, borderRadius:8, cursor:"pointer", color:C.mu, fontSize:20, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                  )}
                </div>
                <input ref={photoRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e=>addPhotos(e.target.files)} />
              </div>
            </div>
          )}

          {/* STEP 2: Procurement & Docs */}
          {step===2 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><Label>Purchase Date *</Label><input type="date" value={form.pDate||""} onChange={e=>set("pDate",e.target.value)} /></div>
                <div><Label>Purchase Price (₹) *</Label><input type="number" value={form.price||""} onChange={e=>set("price",Number(e.target.value))} placeholder="e.g. 49999" /></div>
              </div>

              {/* Vendor dropdown + free text */}
              <div>
                <Label>Vendor / Supplier</Label>
                <div style={{ display:"flex", gap:8 }}>
                  {vendors?.length>0 && (
                    <select value={form.vendorId||""} onChange={e=>{ const v=vendors.find(x=>x.id===e.target.value); if(v){set("vendor",v.name);set("vendorId",v.id);}else set("vendorId",""); }} style={{ width:"auto", minWidth:150 }}>
                      <option value="">— From vendor book —</option>
                      {vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  )}
                  <input value={form.vendor||""} onChange={e=>{set("vendor",e.target.value);set("vendorId","");}} placeholder="Vendor name…" />
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><Label>GST Amount (₹)</Label><input type="number" value={form.gstAmount||""} onChange={e=>set("gstAmount",Number(e.target.value))} placeholder="0" /></div>
                <div><Label>Payment Mode</Label>
                  <select value={form.paymentMode||""} onChange={e=>set("paymentMode",e.target.value)}>
                    <option value="">Select…</option>
                    {PAYMENT_MODES.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><Label>PO Number</Label><input value={form.poNumber||""} onChange={e=>set("poNumber",e.target.value)} placeholder="PO-2024-001" /></div>
                <div><Label>Bill / Invoice No.</Label><input value={form.billNumber||""} onChange={e=>set("billNumber",e.target.value)} placeholder="INV-001" /></div>
              </div>

              {/* Live dep preview */}
              {depPreview && (
                <div style={{ background:C.el, borderRadius:10, padding:14, border:`1px solid ${C.br}` }}>
                  <div style={{ fontSize:10, color:C.mu, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Depreciation Preview (IT Act WDV)</div>
                  <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
                    <div><div style={{ fontSize:10, color:C.mu2 }}>Rate</div><div style={{ fontWeight:700, color:C.ac }}>{Math.round(CATS[form.cat].rate*100)}% WDV</div></div>
                    <div><div style={{ fontSize:10, color:C.mu2 }}>Current Book Value</div><div style={{ fontWeight:700, color:C.ok }}>{fINR(depPreview.cur)}</div></div>
                    <div><div style={{ fontSize:10, color:C.mu2 }}>Depreciated</div><div style={{ fontWeight:700, color:C.ac }}>{Math.round((1-depPreview.cur/form.price)*100)}%</div></div>
                  </div>
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><Label>Warranty End Date</Label><input type="date" value={form.wEnd&&form.wEnd!=="N/A"?form.wEnd:""} onChange={e=>set("wEnd",e.target.value||"N/A")} /></div>
                <div><Label>Warranty Type</Label><input value={form.wType||""} onChange={e=>set("wType",e.target.value)} placeholder="Brand 1yr, On-Site…" /></div>
              </div>

              <div><Label>Notes</Label><textarea value={form.notes||""} onChange={e=>set("notes",e.target.value)} rows={3} style={{ resize:"vertical" }} placeholder="Additional notes…" /></div>

              {/* Document attachments */}
              <div>
                <Label>Documents ({(form.documents||[]).length}) — invoices, warranty cards (max 3MB each)</Label>
                {(form.documents||[]).map((doc,i)=>(
                  <div key={i} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 12px", background:C.el, borderRadius:8, marginBottom:6 }}>
                    <span style={{ fontSize:16 }}>{doc.type?.includes("pdf")?"📄":"🖼"}</span>
                    <span style={{ flex:1, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.name}</span>
                    <button onClick={()=>setForm(p=>({...p,documents:p.documents.filter((_,j)=>j!==i)}))} style={{ background:"none", border:"none", color:C.err, cursor:"pointer", fontSize:16 }}>×</button>
                  </div>
                ))}
                {(form.documents||[]).length<5 && (
                  <button onClick={()=>docRef.current?.click()} style={{ background:C.el, border:`1px dashed ${C.br}`, color:C.mu, cursor:"pointer", padding:"8px 14px", borderRadius:8, fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
                    + Attach Document
                  </button>
                )}
                <input ref={docRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:"none" }} onChange={e=>e.target.files[0]&&addDocument(e.target.files[0])} />
              </div>
            </div>
          )}

          {/* STEP 3: Insurance & AMC */}
          {step===3 && (
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
              <div>
                <div style={{ fontSize:13, color:C.mu, marginBottom:14 }}>All insurance and AMC fields are optional.</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, marginBottom:12 }}>🛡 Insurance Details</div>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div><Label>Insurer</Label><input value={form.insurance?.insurer||""} onChange={e=>setIns("insurer",e.target.value)} placeholder="e.g. New India Assurance" /></div>
                    <div><Label>Policy Number</Label><input value={form.insurance?.policyNo||""} onChange={e=>setIns("policyNo",e.target.value)} placeholder="Policy No." /></div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div><Label>Sum Insured (₹)</Label><input type="number" value={form.insurance?.coverage||""} onChange={e=>setIns("coverage",Number(e.target.value))} placeholder="0" /></div>
                    <div><Label>Annual Premium (₹)</Label><input type="number" value={form.insurance?.premium||""} onChange={e=>setIns("premium",Number(e.target.value))} placeholder="0" /></div>
                  </div>
                  <div><Label>Renewal Date</Label><input type="date" value={form.insurance?.renewalDate||""} onChange={e=>setIns("renewalDate",e.target.value)} /></div>
                </div>
              </div>

              <div style={{ borderTop:`1px solid ${C.br}`, paddingTop:18 }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, marginBottom:12 }}>🔧 AMC Details</div>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div><Label>AMC Provider</Label><input value={form.amcProvider||""} onChange={e=>set("amcProvider",e.target.value)} placeholder="Service centre / company" /></div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div><Label>AMC Start Date</Label><input type="date" value={form.amcStart||""} onChange={e=>set("amcStart",e.target.value)} /></div>
                    <div><Label>AMC End Date</Label><input type="date" value={form.amcEnd||""} onChange={e=>set("amcEnd",e.target.value)} /></div>
                  </div>
                  <div><Label>AMC Cost (₹)</Label><input type="number" value={form.amcCost||""} onChange={e=>set("amcCost",Number(e.target.value))} placeholder="0" /></div>
                  <div><Label>AMC Notes</Label><textarea value={form.amcNotes||""} onChange={e=>set("amcNotes",e.target.value)} rows={2} style={{ resize:"vertical" }} placeholder="Coverage details, contact, etc." /></div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Technical Specs */}
          {step===4 && specDefs.length>0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ fontSize:13, color:C.mu, marginBottom:4 }}>Specs for <strong style={{ color:C.tx }}>{CATS[form.cat]?.label}</strong> — all optional</div>
              {specDefs.map(([k,l])=>(
                <div key={k}>
                  <Label>{l}</Label>
                  <input value={form.specs?.[k]||""} onChange={e=>setSpec(k,e.target.value)} placeholder={`Enter ${l.toLowerCase()}…`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.br}`, display:"flex", justifyContent:"space-between", flexShrink:0 }}>
          <Btn onClick={step>1?()=>setStep(s=>s-1):onClose} variant="secondary">{step>1?"← Back":"Cancel"}</Btn>
          {step<steps
            ? <Btn onClick={()=>canNext&&setStep(s=>s+1)} variant="primary" style={{ opacity:canNext?1:0.5, cursor:canNext?"pointer":"not-allowed" }}>Next →</Btn>
            : <Btn onClick={onSave} variant="success">{isEdit?"Save Changes ✓":"Add Asset ✓"}</Btn>
          }
        </div>
      </div>
    </div>
  );
}
