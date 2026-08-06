import { useState } from "react";
import { C, CATS } from "../constants.js";
import { Label, Btn, Modal } from "../components/UI.jsx";

export default function WorkstationModal({ workstation, assets, onSave, onClose }) {
  const [form, setForm] = useState(workstation
    ? { ...workstation }
    : { name:"", location:"", notes:"", assetIds:[], assignTo:"", status:"active" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isEdit = !!form.id;
  const valid = form.name.trim() && form.assetIds.length > 0;

  // Assets available to bundle: not retired, and either unassigned to any
  // workstation or already part of this one (so editing doesn't hide them).
  const selectable = assets.filter(a => a.status !== "retired" && (!a.workstationId || a.workstationId === form.id));

  // Duplicate: keep location/notes, drop identity + assets (each asset can
  // only belong to one workstation, so a copy starts with an empty bundle).
  function duplicate() {
    setForm(p => {
      const { id, ...rest } = p;
      return { ...rest, name:"", assetIds:[], status:"active", assignTo:"" };
    });
  }

  function toggleAsset(id) {
    setForm(p => ({
      ...p,
      assetIds: p.assetIds.includes(id) ? p.assetIds.filter(x => x !== id) : [...p.assetIds, id],
    }));
  }

  return (
    <Modal title={isEdit ? "Edit Workstation" : "New Workstation"} sub="Bundle assets that move together (CPU, monitor, keyboard…)" onClose={onClose}
      footer={
        <>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={onClose} variant="secondary">Cancel</Btn>
            {isEdit && <Btn onClick={duplicate} variant="secondary" style={{ color:C.ac2 }}>⧉ Duplicate</Btn>}
          </div>
          <Btn onClick={() => valid && onSave(form)} variant="primary" style={{ opacity:valid?1:0.5 }}>
            {isEdit ? "Save Changes" : "Create Workstation"}
          </Btn>
        </>
      }>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div><Label>Workstation Name *</Label><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Edit Desk 1" /></div>
        <div><Label>Location</Label><input value={form.location || ""} onChange={e => set("location", e.target.value)} placeholder="e.g. Studio Room 2" /></div>

        <div>
          <Label>Bundled Assets * ({form.assetIds.length} selected)</Label>
          <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:280, overflowY:"auto", border:`1px solid ${C.br}`, borderRadius:10, padding:8 }}>
            {selectable.length === 0 && <div style={{ fontSize:12, color:C.mu, padding:8 }}>No assets available — all are retired or already bundled elsewhere.</div>}
            {selectable.map(a => {
              const checked = form.assetIds.includes(a.id);
              return (
                <div key={a.id} onClick={() => toggleAsset(a.id)} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 10px", background:checked?`${C.ac}10`:C.el, border:`1px solid ${checked?C.ac:C.br}`, borderRadius:8, cursor:"pointer" }}>
                  <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${checked?C.ac:C.mu}`, background:checked?C.ac:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {checked && <span style={{ color:"#fff", fontSize:11, lineHeight:1 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:15, flexShrink:0 }}>{CATS[a.cat]?.emoji}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{a.name}</div>
                    <div style={{ fontSize:11, color:C.mu, fontFamily:"'Noto Sans Mono',monospace" }}>{a.code}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div><Label>Notes</Label><textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} style={{ resize:"vertical" }} placeholder="Anything worth knowing about this bundle…" /></div>
      </div>
    </Modal>
  );
}
