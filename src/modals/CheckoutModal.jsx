import { useState } from "react";
import { C, CATS, CHECKOUT_PURPOSES } from "../constants.js";
import { fINR } from "../utils.js";
import { Label, Btn, Modal } from "../components/UI.jsx";

export function CheckoutModal({ assets, preselectedAsset, onCheckout, onClose }) {
  const [form, setForm] = useState({
    assetId: preselectedAsset?.id||"",
    assignedTo:"", purpose:"Office Use", location:"", expectedReturn:"", notes:""
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const sel = assets.find(a=>a.id===form.assetId);
  const canSubmit = form.assetId && form.assignedTo;

  return (
    <Modal title="Check Out Asset" sub="Log asset leaving the office or being assigned" onClose={onClose}
      footer={<><Btn onClick={onClose} variant="secondary">Cancel</Btn><Btn onClick={()=>canSubmit&&onCheckout(form)} variant="primary" style={{ opacity:canSubmit?1:0.5 }}>Confirm Check-Out</Btn></>}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {!preselectedAsset && (
          <div>
            <Label>Select Asset *</Label>
            <select value={form.assetId} onChange={e=>set("assetId",e.target.value)}>
              <option value="">Choose an asset…</option>
              {assets.filter(a=>a.status!=="retired"&&!a.disposal).map(a=>(
                <option key={a.id} value={a.id}>{CATS[a.cat]?.emoji} {a.name} — {a.code}</option>
              ))}
            </select>
          </div>
        )}

        {sel && (
          <div style={{ background:C.el, borderRadius:10, padding:12, display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ fontSize:24 }}>{CATS[sel.cat]?.emoji}</div>
            <div>
              <div style={{ fontSize:14, fontWeight:600 }}>{sel.name}</div>
              <div style={{ fontSize:12, color:C.mu }}>{sel.code} · {sel.loc}</div>
            </div>
          </div>
        )}

        <div><Label>Assigned To *</Label><input value={form.assignedTo} onChange={e=>set("assignedTo",e.target.value)} placeholder="Person's name" /></div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><Label>Purpose</Label>
            <select value={form.purpose} onChange={e=>set("purpose",e.target.value)}>
              {CHECKOUT_PURPOSES.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div><Label>Destination / Location</Label><input value={form.location} onChange={e=>set("location",e.target.value)} placeholder="Where is it going?" /></div>
        </div>

        <div><Label>Expected Return Date</Label><input type="date" value={form.expectedReturn} onChange={e=>set("expectedReturn",e.target.value)} /></div>
        <div><Label>Notes</Label><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={2} style={{ resize:"vertical" }} placeholder="Any special instructions…" /></div>
      </div>
    </Modal>
  );
}

export function ReturnModal({ checkout, assets, onReturn, onClose }) {
  const [form, setForm] = useState({ returnDate:new Date().toISOString().split("T")[0], returnCondition:"Good", returnNotes:"" });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const asset = assets.find(a=>a.id===checkout.assetId);

  return (
    <Modal title="Check In Asset" sub={`Return: ${checkout.assetName}`} onClose={onClose}
      footer={<><Btn onClick={onClose} variant="secondary">Cancel</Btn><Btn onClick={()=>onReturn(checkout.id, form)} variant="success">Confirm Check-In ✓</Btn></>}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {asset && (
          <div style={{ background:C.el, borderRadius:10, padding:12, display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ fontSize:24 }}>{CATS[asset.cat]?.emoji}</div>
            <div>
              <div style={{ fontSize:14, fontWeight:600 }}>{asset.name}</div>
              <div style={{ fontSize:12, color:C.mu }}>Was with: {checkout.assignedTo} · Out since {checkout.checkoutDate}</div>
            </div>
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><Label>Return Date *</Label><input type="date" value={form.returnDate} onChange={e=>set("returnDate",e.target.value)} /></div>
          <div><Label>Condition on Return</Label>
            <select value={form.returnCondition} onChange={e=>set("returnCondition",e.target.value)}>
              {["Excellent","Good","Fair","Poor","Damaged"].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div><Label>Return Notes</Label><textarea value={form.returnNotes} onChange={e=>set("returnNotes",e.target.value)} rows={3} style={{ resize:"vertical" }} placeholder="Any issues, damage, or notes about the return…" /></div>
      </div>
    </Modal>
  );
}
