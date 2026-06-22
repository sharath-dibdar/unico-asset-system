import { useState } from "react";
import { C, CATS, CHECKOUT_PURPOSES } from "../constants.js";
import { Label, Btn, Modal, AssigneeSelect } from "../components/UI.jsx";

export function WorkstationCheckoutModal({ workstation, assets, onCheckout, onClose }) {
  const [form, setForm] = useState({ assignedTo:"", purpose:"Office Use", location:workstation.location || "", expectedReturn:"", notes:"" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const bundled = workstation.assetIds.map(id => assets.find(a => a.id === id)).filter(Boolean);
  const canSubmit = form.assignedTo;

  return (
    <Modal title={`Check Out: ${workstation.name}`} sub={`${bundled.length} bundled asset${bundled.length !== 1 ? "s" : ""} move together`} onClose={onClose}
      footer={<><Btn onClick={onClose} variant="secondary">Cancel</Btn><Btn onClick={() => canSubmit && onCheckout(form)} variant="primary" style={{ opacity:canSubmit?1:0.5 }}>Confirm Check-Out</Btn></>}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {bundled.map(a => (
            <span key={a.id} style={{ fontSize:11, background:C.el, color:C.mu, padding:"4px 10px", borderRadius:8 }}>{CATS[a.cat]?.emoji} {a.name}</span>
          ))}
        </div>

        <div><Label>Assigned To *</Label><AssigneeSelect value={form.assignedTo} onChange={v => set("assignedTo", v)} allowEmpty /></div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><Label>Purpose</Label>
            <select value={form.purpose} onChange={e => set("purpose", e.target.value)}>
              {CHECKOUT_PURPOSES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div><Label>Destination / Location</Label><input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Where is it going?" /></div>
        </div>

        <div><Label>Expected Return Date</Label><input type="date" value={form.expectedReturn} onChange={e => set("expectedReturn", e.target.value)} /></div>
        <div><Label>Notes</Label><textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} style={{ resize:"vertical" }} placeholder="Any special instructions…" /></div>
      </div>
    </Modal>
  );
}

export function WorkstationReturnModal({ workstation, assets, onReturn, onClose }) {
  const [form, setForm] = useState({ returnDate:new Date().toISOString().split("T")[0], returnCondition:"Good", returnNotes:"" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const bundled = workstation.assetIds.map(id => assets.find(a => a.id === id)).filter(Boolean);

  return (
    <Modal title={`Check In: ${workstation.name}`} sub={`Returning ${bundled.length} bundled asset${bundled.length !== 1 ? "s" : ""}`} onClose={onClose}
      footer={<><Btn onClick={onClose} variant="secondary">Cancel</Btn><Btn onClick={() => onReturn(form)} variant="success">Confirm Check-In ✓</Btn></>}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ background:C.el, borderRadius:10, padding:12 }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Was with: {workstation.assignTo}</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {bundled.map(a => (
              <span key={a.id} style={{ fontSize:11, background:C.sf, color:C.mu, padding:"4px 10px", borderRadius:8 }}>{CATS[a.cat]?.emoji} {a.name}</span>
            ))}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><Label>Return Date *</Label><input type="date" value={form.returnDate} onChange={e => set("returnDate", e.target.value)} /></div>
          <div><Label>Condition on Return</Label>
            <select value={form.returnCondition} onChange={e => set("returnCondition", e.target.value)}>
              {["Excellent","Good","Fair","Poor","Damaged"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div><Label>Return Notes</Label><textarea value={form.returnNotes} onChange={e => set("returnNotes", e.target.value)} rows={3} style={{ resize:"vertical" }} placeholder="Any issues, damage, or notes about the return…" /></div>
      </div>
    </Modal>
  );
}
