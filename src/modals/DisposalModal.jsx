import { useState } from "react";
import { C, CATS, DISPOSAL_METHODS } from "../constants.js";
import { fINR, calcDep } from "../utils.js";
import { Label, Btn, Modal } from "../components/UI.jsx";

export default function DisposalModal({ asset, onDispose, onClose }) {
  const [form, setForm] = useState({ date:new Date().toISOString().split("T")[0], method:"sold", saleValue:0, buyer:"", notes:"" });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const dep = CATS[asset.cat] ? calcDep(asset.price, asset.pDate, CATS[asset.cat].rate) : null;
  const bv  = dep?.cur||0;
  const sv  = form.saleValue||0;
  const gainLoss = sv - bv;
  const showValue = form.method==="sold"||form.method==="donated";

  return (
    <Modal title="Dispose Asset" sub={`${asset.name} · ${asset.code}`} onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose} variant="secondary">Cancel</Btn>
          <Btn onClick={()=>onDispose(form)} variant="danger" style={{ background:C.err, color:"#fff" }}>Confirm Disposal</Btn>
        </>
      }>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {/* Book value summary */}
        {dep && (
          <div style={{ background:`${C.ac}10`, border:`1px solid ${C.ac}25`, borderRadius:10, padding:14 }}>
            <div style={{ fontSize:12, color:C.mu, marginBottom:6 }}>Current Book Value (WDV)</div>
            <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Inter',sans-serif", color:C.ok }}>{fINR(bv)}</div>
            <div style={{ fontSize:11, color:C.mu2, marginTop:2 }}>Original cost: {fINR(asset.price)} · Asset will be marked Retired</div>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><Label>Disposal Date *</Label><input type="date" value={form.date} onChange={e=>set("date",e.target.value)} /></div>
          <div><Label>Disposal Method</Label>
            <select value={form.method} onChange={e=>set("method",e.target.value)}>
              {DISPOSAL_METHODS.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
        </div>

        {showValue && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><Label>{form.method==="sold"?"Sale Value (₹)":"Transfer Value (₹)"}</Label>
              <input type="number" value={form.saleValue||""} onChange={e=>set("saleValue",Number(e.target.value))} placeholder="0" />
            </div>
            <div><Label>{form.method==="sold"?"Buyer":"Recipient"}</Label>
              <input value={form.buyer} onChange={e=>set("buyer",e.target.value)} placeholder="Name or organization" />
            </div>
          </div>
        )}

        {/* P&L impact */}
        {dep && showValue && sv>0 && (
          <div style={{ background:C.el, borderRadius:10, padding:14, display:"flex", gap:24, flexWrap:"wrap" }}>
            <div><div style={{ fontSize:10, color:C.mu2 }}>Book Value</div><div style={{ fontWeight:600 }}>{fINR(bv)}</div></div>
            <div><div style={{ fontSize:10, color:C.mu2 }}>Sale / Transfer</div><div style={{ fontWeight:600 }}>{fINR(sv)}</div></div>
            <div>
              <div style={{ fontSize:10, color:C.mu2 }}>Gain / (Loss)</div>
              <div style={{ fontWeight:700, fontSize:15, color:gainLoss>=0?C.ok:C.err }}>
                {gainLoss>=0?"+":""}{fINR(gainLoss)}
              </div>
            </div>
          </div>
        )}

        <div><Label>Notes</Label>
          <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={3} style={{ resize:"vertical" }}
            placeholder="Reason for disposal, condition at time, etc." />
        </div>
      </div>
    </Modal>
  );
}
