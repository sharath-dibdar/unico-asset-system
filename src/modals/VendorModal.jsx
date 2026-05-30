import { useState } from "react";
import { C, VENDOR_CATS } from "../constants.js";
import { uid } from "../utils.js";
import { Label, Btn, Modal } from "../components/UI.jsx";

export default function VendorModal({ vendor, onSave, onClose }) {
  const [form, setForm] = useState(vendor || { name:"", category:"", contact:"", email:"", phone:"", gst:"", address:"", website:"", notes:"" });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const canSave = form.name?.trim();

  function save() {
    if (!canSave) return;
    onSave(vendor ? { ...form } : { ...form, id:uid() });
  }

  return (
    <Modal title={vendor?"Edit Vendor":"Add Vendor"} sub="Supplier / vendor contact details" onClose={onClose}
      footer={<><Btn onClick={onClose} variant="secondary">Cancel</Btn><Btn onClick={save} variant="success" style={{ opacity:canSave?1:0.5 }}>{vendor?"Save Changes":"Add Vendor"} ✓</Btn></>}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div><Label>Vendor Name *</Label><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Amazon India" /></div>

        <div><Label>Category</Label>
          <select value={form.category} onChange={e=>set("category",e.target.value)}>
            <option value="">Select category…</option>
            {VENDOR_CATS.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><Label>Contact Person</Label><input value={form.contact} onChange={e=>set("contact",e.target.value)} placeholder="Name" /></div>
          <div><Label>Phone</Label><input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="+91 XXXXX XXXXX" /></div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><Label>Email</Label><input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="contact@vendor.com" /></div>
          <div><Label>Website</Label><input value={form.website} onChange={e=>set("website",e.target.value)} placeholder="https://…" /></div>
        </div>

        <div><Label>GST Number</Label><input value={form.gst} onChange={e=>set("gst",e.target.value)} placeholder="27AABCU9603R1ZX" style={{ fontFamily:"'DM Mono',monospace" }} /></div>
        <div><Label>Address</Label><textarea value={form.address} onChange={e=>set("address",e.target.value)} rows={2} style={{ resize:"vertical" }} placeholder="Street, City, State, PIN" /></div>
        <div><Label>Notes</Label><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={2} style={{ resize:"vertical" }} placeholder="Additional info, preferred contact time, etc." /></div>
      </div>
    </Modal>
  );
}
