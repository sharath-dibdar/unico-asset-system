import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { C, CATS, SPEC_DEF, SERVICE_TYPES } from "../constants.js";
import { fINR, fDate, dTo, calcDep, uid } from "../utils.js";
import { Badge, Label, FieldVal, Section, Btn, QRDisplay } from "../components/UI.jsx";

const TAB = ({ id, active, onClick, children }) => (
  <button onClick={()=>onClick(id)} style={{ padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:active?700:400, fontFamily:"'DM Sans',sans-serif", background:active?`${C.ac}18`:"transparent", color:active?C.ac:C.mu, transition:"all 0.15s" }}>
    {children}
  </button>
);

export default function AssetDetail({ asset: a, onEdit, onDelete, onCheckout, onDispose, onUpdate }) {
  const [tab, setTab]         = useState("info");
  const [svcForm, setSvcForm] = useState(null);

  const dep       = CATS[a.cat] ? calcDep(a.price,a.pDate,CATS[a.cat].rate) : null;
  const specDefs  = SPEC_DEF[a.cat]||[];
  const wd        = dTo(a.wEnd);
  const depPct    = dep&&a.price ? Math.round((1-dep.cur/a.price)*100) : 0;
  const warnCol   = wd===null?C.mu:wd<0?C.err:wd<=30?C.err:wd<=90?C.ac:C.ok;
  const warnMsg   = wd===null?"No warranty data":wd<0?`Expired ${Math.abs(wd)} days ago`:wd===0?"Expires today!":`${wd} days remaining`;
  const isDisposed = !!a.disposal;

  const chartData = dep ? [{ yr:"Purchase", val:a.price }, ...dep.sched.map(s=>({ yr:s.fy.replace("FY ",""), val:s.close }))] : [];

  // Add service log entry
  function addService(e) {
    e.preventDefault();
    if (!svcForm?.date||!svcForm?.description) return;
    const entry = { ...svcForm, id:uid(), createdAt:new Date().toISOString() };
    onUpdate({ ...a, serviceLog:[...(a.serviceLog||[]), entry] });
    setSvcForm(null);
  }

  const tabs = [
    { id:"info",    l:"Info" },
    { id:"finance", l:"Finance" },
    { id:"docs",    l:`Docs${(a.documents||[]).length>0?" ("+a.documents.length+")":""}` },
    { id:"service", l:`Service${(a.serviceLog||[]).length>0?" ("+a.serviceLog.length+")":""}` },
    { id:"history", l:"History" },
  ];

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:18, maxWidth:980 }}>
      {/* Header actions */}
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", flexWrap:"wrap" }}>
        {!isDisposed && <Btn onClick={()=>onCheckout(a)} variant="secondary">⇄ Check Out</Btn>}
        <Btn onClick={onEdit} variant="secondary">✏  Edit</Btn>
        {!isDisposed && <Btn onClick={()=>onDispose(a)} variant="secondary" style={{ color:C.ac2 }}>♻  Dispose</Btn>}
        <Btn onClick={()=>{ if(confirm(`Delete "${a.name}"?`)) onDelete(a.id); }} variant="danger">🗑  Delete</Btn>
      </div>

      {isDisposed && (
        <div style={{ background:`${C.mu}10`, border:`1px solid ${C.mu}30`, borderRadius:12, padding:"12px 18px", display:"flex", gap:12, alignItems:"center" }}>
          <span style={{ fontSize:20 }}>♻️</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.mu }}>This asset has been disposed</div>
            <div style={{ fontSize:12, color:C.mu2 }}>{a.disposal.method} · {fDate(a.disposal.date)} {a.disposal.saleValue?`· Sale: ${fINR(a.disposal.saleValue)}`:""}</div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:18, flexWrap:"wrap" }}>
        {/* Left column */}
        <div style={{ display:"flex", flexDirection:"column", gap:14, width:200, flexShrink:0 }}>
          <QRDisplay code={a.code} />

          {/* Warranty */}
          <div style={{ background:C.sf, border:`1px solid ${wd!==null&&wd<0?C.err+"40":C.br}`, borderRadius:14, padding:16 }}>
            <Label>Warranty Status</Label>
            <div style={{ color:warnCol, fontWeight:700, fontSize:14, marginBottom:4 }}>
              {wd!==null&&wd<0?"⚠ ":wd!==null&&wd<=90?"⏰ ":"✓ "}{warnMsg}
            </div>
            {a.wEnd&&a.wEnd!=="N/A"&&<div style={{ fontSize:12, color:C.mu }}>Until {fDate(a.wEnd)}</div>}
            {a.wType&&a.wType!=="N/A"&&<div style={{ fontSize:12, color:C.mu, marginTop:2 }}>{a.wType}</div>}
          </div>

          {/* Book value */}
          {dep && (
            <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:16 }}>
              <Label>Book Value Today</Label>
              <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Syne',sans-serif", color:C.ok }}>{fINR(dep.cur)}</div>
              <div style={{ fontSize:12, color:C.mu, marginTop:2 }}>{depPct}% depreciated</div>
              <div style={{ fontSize:11, color:C.mu2, marginTop:1 }}>WDV @ {Math.round(CATS[a.cat].rate*100)}% p.a.</div>
            </div>
          )}

          {/* Photos */}
          {(a.photos||[]).length>0 && (
            <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:16 }}>
              <Label>Photos</Label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginTop:8 }}>
                {a.photos.slice(0,4).map((ph,i)=>(
                  <img key={i} src={ph} alt="" style={{ width:"100%", aspectRatio:"1", objectFit:"cover", borderRadius:8 }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main column */}
        <div style={{ flex:1, minWidth:280 }}>
          {/* Tab bar */}
          <div style={{ display:"flex", gap:4, marginBottom:16, background:C.sf, borderRadius:10, padding:4, border:`1px solid ${C.br}`, flexWrap:"wrap" }}>
            {tabs.map(t=><TAB key={t.id} id={t.id} active={tab===t.id} onClick={setTab}>{t.l}</TAB>)}
          </div>

          {/* INFO tab */}
          {tab==="info" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <Section title="Asset Information">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px 24px" }}>
                  <FieldVal label="Category"    val={CATS[a.cat]?.label} />
                  <FieldVal label="Make / Brand" val={a.make} />
                  <FieldVal label="Model"        val={a.model} />
                  <FieldVal label="Serial Number" val={a.serial} mono />
                  <FieldVal label="Color"        val={a.color} />
                  <FieldVal label="Condition"    val={a.cond} />
                  <FieldVal label="Location"     val={a.loc} />
                  <FieldVal label="Assigned To"  val={a.assignTo} />
                </div>
              </Section>

              <Section title="Procurement Details">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px 24px" }}>
                  <FieldVal label="Purchase Date"  val={fDate(a.pDate)} />
                  <FieldVal label="Vendor"         val={a.vendor} />
                  <div>
                    <Label>Purchase Price</Label>
                    <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Syne',sans-serif", color:C.ac2 }}>{fINR(a.price)}</div>
                  </div>
                  <FieldVal label="GST Amount"     val={a.gstAmount?fINR(a.gstAmount):null} />
                  <FieldVal label="PO / Bill #"    val={[a.poNumber,a.billNumber].filter(Boolean).join(" / ")||null} mono />
                  <FieldVal label="Payment Mode"   val={a.paymentMode} />
                </div>
              </Section>

              {(a.amcProvider||a.amcEnd) && (
                <Section title="AMC Details">
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px 24px" }}>
                    <FieldVal label="AMC Provider"  val={a.amcProvider} />
                    <FieldVal label="AMC Period"    val={[a.amcStart&&fDate(a.amcStart), a.amcEnd&&fDate(a.amcEnd)].filter(Boolean).join(" → ")||null} />
                    <FieldVal label="AMC Cost"      val={a.amcCost?fINR(a.amcCost):null} />
                    <FieldVal label="AMC Notes"     val={a.amcNotes} wide />
                  </div>
                </Section>
              )}

              {/* Insurance */}
              {a.insurance?.insurer && (
                <Section title="Insurance">
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px 24px" }}>
                    <FieldVal label="Insurer"        val={a.insurance.insurer} />
                    <FieldVal label="Policy Number"  val={a.insurance.policyNo} mono />
                    <FieldVal label="Sum Insured"    val={a.insurance.coverage?fINR(a.insurance.coverage):null} accent />
                    <FieldVal label="Annual Premium" val={a.insurance.premium?fINR(a.insurance.premium):null} />
                    <FieldVal label="Renewal Date"   val={fDate(a.insurance.renewalDate)} />
                  </div>
                </Section>
              )}

              {/* Disposal info */}
              {a.disposal && (
                <Section title="Disposal Record" sub="Asset has been retired">
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px 24px" }}>
                    <FieldVal label="Disposal Date"  val={fDate(a.disposal.date)} />
                    <FieldVal label="Method"         val={a.disposal.method} />
                    {a.disposal.saleValue>0 && <FieldVal label="Sale Value"   val={fINR(a.disposal.saleValue)} accent />}
                    {a.disposal.buyer      && <FieldVal label="Buyer"         val={a.disposal.buyer} />}
                    {dep && a.disposal.saleValue>0 && (
                      <div>
                        <Label>P&L Impact</Label>
                        <div style={{ fontSize:15, fontWeight:700, color:a.disposal.saleValue>=dep.cur?C.ok:C.err }}>
                          {a.disposal.saleValue>=dep.cur?"+":""}{fINR(a.disposal.saleValue-dep.cur)}
                        </div>
                      </div>
                    )}
                    {a.disposal.notes && <FieldVal label="Notes" val={a.disposal.notes} wide />}
                  </div>
                </Section>
              )}

              {specDefs.length>0 && a.specs && Object.keys(a.specs).filter(k=>a.specs[k]).length>0 && (
                <Section title="Technical Specifications">
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10 }}>
                    {specDefs.map(([k,l]) => a.specs?.[k] ? (
                      <div key={k} style={{ background:C.el, borderRadius:9, padding:"10px 14px" }}>
                        <div style={{ fontSize:10, color:C.mu2, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>{l}</div>
                        <div style={{ fontSize:13, fontWeight:600, fontFamily:"'DM Mono',monospace", color:C.ac }}>{a.specs[k]}</div>
                      </div>
                    ) : null)}
                  </div>
                </Section>
              )}

              {a.notes && (
                <Section title="Notes">
                  <div style={{ fontSize:14, color:C.mu, lineHeight:1.7 }}>{a.notes}</div>
                </Section>
              )}
            </div>
          )}

          {/* FINANCE tab */}
          {tab==="finance" && dep && dep.sched.length>0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <Section title="Depreciation Schedule" sub={`WDV Method · IT Act · ${Math.round(CATS[a.cat].rate*100)}% p.a. · Half-year rule`}>
                <div style={{ display:"flex", gap:20, flexWrap:"wrap", marginBottom:16 }}>
                  <div><Label>Original Cost</Label><div style={{ fontSize:16, fontWeight:700 }}>{fINR(a.price)}</div></div>
                  <div><Label>Current Book Value</Label><div style={{ fontSize:16, fontWeight:700, color:C.ok }}>{fINR(dep.cur)}</div></div>
                  <div><Label>Total Depreciation</Label><div style={{ fontSize:16, fontWeight:700, color:C.ac }}>{fINR(a.price-dep.cur)} ({depPct}%)</div></div>
                </div>
                <div style={{ height:160, marginBottom:16 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="dg2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={C.ac} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={C.ac} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.br} />
                      <XAxis dataKey="yr" tick={{ fill:C.mu, fontSize:10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:C.mu, fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${Math.round(v/1000)}K`} />
                      <Tooltip formatter={v=>[fINR(v),"Book Value"]} contentStyle={{ background:C.el, border:`1px solid ${C.br}`, borderRadius:8, fontFamily:"'DM Sans',sans-serif", fontSize:12 }} />
                      <Area type="monotone" dataKey="val" stroke={C.ac} strokeWidth={2.5} fill="url(#dg2)" dot={{ fill:C.ac, r:3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead>
                      <tr>{["Financial Year","Opening Value","Depreciation","Closing Value"].map(h=>(
                        <th key={h} style={{ padding:"8px 12px", textAlign:h==="Financial Year"?"left":"right", borderBottom:`1px solid ${C.br}`, color:C.mu, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", fontSize:10 }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {dep.sched.map((s,i)=>(
                        <tr key={i} style={{ borderBottom:`1px solid ${C.br}` }}>
                          <td style={{ padding:"10px 12px", fontFamily:"'DM Mono',monospace", color:C.mu }}>{s.fy}</td>
                          <td style={{ padding:"10px 12px", textAlign:"right" }}>{fINR(s.open)}</td>
                          <td style={{ padding:"10px 12px", textAlign:"right", color:C.err, fontFamily:"'DM Mono',monospace" }}>− {fINR(s.dep)}</td>
                          <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700, color:C.ok, fontFamily:"'DM Mono',monospace" }}>{fINR(s.close)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>
          )}

          {/* DOCS tab */}
          {tab==="docs" && (
            <Section title="Document Vault" sub="Invoices, warranty cards, receipts">
              {(a.documents||[]).length===0
                ? <div style={{ color:C.mu, fontSize:14, padding:"20px 0" }}>No documents attached yet. Edit the asset to upload.</div>
                : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {a.documents.map((doc,i)=>(
                      <div key={i} style={{ display:"flex", gap:12, alignItems:"center", padding:"10px 14px", background:C.el, borderRadius:10 }}>
                        <span style={{ fontSize:20 }}>{doc.type?.includes("pdf")?"📄":"🖼"}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.name}</div>
                          <div style={{ fontSize:11, color:C.mu }}>{doc.uploadedAt?.split("T")[0]||""} · {Math.round((doc.data?.length||0)*0.75/1024)} KB</div>
                        </div>
                        <a href={doc.data} download={doc.name} style={{ color:C.ac, fontSize:12, fontWeight:600, textDecoration:"none" }}>⬇ Download</a>
                      </div>
                    ))}
                  </div>
                )
              }
            </Section>
          )}

          {/* SERVICE tab */}
          {tab==="service" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <Section title="Service History" sub="Repairs, maintenance, and inspections"
                actions={<Btn onClick={()=>setSvcForm({ date:new Date().toISOString().split("T")[0], type:"Repair", description:"", cost:0, vendor:"", notes:"" })} variant="secondary" style={{ fontSize:12, padding:"6px 14px" }}>+ Add Entry</Btn>}>
                {(a.serviceLog||[]).length===0
                  ? <div style={{ color:C.mu, fontSize:14, padding:"12px 0" }}>No service entries yet.</div>
                  : [...(a.serviceLog||[])].sort((x,y)=>new Date(y.date)-new Date(x.date)).map(s=>(
                    <div key={s.id} style={{ display:"flex", gap:12, padding:"12px 0", borderBottom:`1px solid ${C.br}` }}>
                      <div style={{ background:C.el, borderRadius:8, padding:"6px 10px", flexShrink:0, textAlign:"center" }}>
                        <div style={{ fontSize:10, color:C.mu }}>{s.date?.split("-").slice(1).join("/")||""}</div>
                        <div style={{ fontSize:12, color:C.mu2 }}>{s.date?.split("-")[0]||""}</div>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                          <span style={{ background:`${C.ac}18`, color:C.ac, padding:"2px 8px", borderRadius:8, fontSize:11, fontWeight:700 }}>{s.type}</span>
                          {s.cost>0 && <span style={{ fontSize:12, color:C.ac2 }}>{fINR(s.cost)}</span>}
                        </div>
                        <div style={{ fontSize:13, fontWeight:600 }}>{s.description}</div>
                        {s.vendor && <div style={{ fontSize:12, color:C.mu, marginTop:2 }}>By {s.vendor}</div>}
                        {s.notes  && <div style={{ fontSize:12, color:C.mu2, marginTop:3 }}>{s.notes}</div>}
                      </div>
                    </div>
                  ))
                }
              </Section>

              {/* Inline add service form */}
              {svcForm && (
                <Section title="Add Service Entry">
                  <form onSubmit={addService} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div><Label>Date *</Label><input type="date" value={svcForm.date} onChange={e=>setSvcForm(p=>({...p,date:e.target.value}))} required /></div>
                      <div><Label>Type</Label>
                        <select value={svcForm.type} onChange={e=>setSvcForm(p=>({...p,type:e.target.value}))}>
                          {SERVICE_TYPES.map(t=><option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div><Label>Description *</Label><input value={svcForm.description} onChange={e=>setSvcForm(p=>({...p,description:e.target.value}))} placeholder="What was done" required /></div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div><Label>Cost (₹)</Label><input type="number" value={svcForm.cost||""} onChange={e=>setSvcForm(p=>({...p,cost:Number(e.target.value)}))} placeholder="0" /></div>
                      <div><Label>Vendor / Technician</Label><input value={svcForm.vendor} onChange={e=>setSvcForm(p=>({...p,vendor:e.target.value}))} placeholder="Service centre name" /></div>
                    </div>
                    <div><Label>Notes</Label><textarea value={svcForm.notes} onChange={e=>setSvcForm(p=>({...p,notes:e.target.value}))} rows={2} style={{ resize:"vertical" }} /></div>
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                      <Btn onClick={()=>setSvcForm(null)} variant="secondary">Cancel</Btn>
                      <Btn onClick={addService} variant="success">Save Entry</Btn>
                    </div>
                  </form>
                </Section>
              )}
            </div>
          )}

          {/* HISTORY tab */}
          {tab==="history" && (
            <Section title="Audit Trail" sub="Change history for this asset">
              {(a.history||[]).length===0
                ? <div style={{ color:C.mu, fontSize:14, padding:"12px 0" }}>No changes recorded yet.</div>
                : [...(a.history||[])].reverse().map((h,i)=>(
                  <div key={i} style={{ padding:"12px 0", borderBottom:`1px solid ${C.br}` }}>
                    <div style={{ display:"flex", gap:10, marginBottom:6 }}>
                      <span style={{ fontSize:11, color:C.mu, fontFamily:"'DM Mono',monospace" }}>{h.timestamp?.split("T")[0]||""} {h.timestamp?.split("T")[1]?.slice(0,5)||""}</span>
                      <span style={{ background:`${C.ac}18`, color:C.ac, padding:"1px 8px", borderRadius:6, fontSize:11, fontWeight:700 }}>{h.action}</span>
                    </div>
                    {(h.changes||[]).map((c,j)=>(
                      <div key={j} style={{ fontSize:12, color:C.mu, marginLeft:8 }}>
                        <span style={{ color:C.tx }}>{c.field}</span>: <span style={{ color:C.err }}>"{String(c.old||"").slice(0,30)}"</span> → <span style={{ color:C.ok }}>"{String(c.new||"").slice(0,30)}"</span>
                      </div>
                    ))}
                  </div>
                ))
              }
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
