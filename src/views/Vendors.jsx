import { useState } from "react";
import { C, CATS } from "../constants.js";
import { Btn, EmptyState } from "../components/UI.jsx";

export default function Vendors({ vendors, assets, onAdd, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(null); // vendor id with row expanded for address/notes

  const linked = (vid) => assets.filter(a => a.vendorId === vid).length;
  const byCat  = (vid) => Object.entries(CATS)
    .map(([k, cat]) => ({ cat:k, label:cat.label, emoji:cat.emoji, count:assets.filter(a => a.vendorId === vid && a.cat === k).length }))
    .filter(c => c.count > 0);

  if (vendors.length === 0) return (
    <div className="fade">
      <EmptyState icon="🏪" title="No vendors yet" sub="Add vendors to link them to your assets and track supplier contacts." />
      <div style={{ textAlign:"center", marginTop:16 }}><Btn onClick={onAdd} variant="primary">+ Add First Vendor</Btn></div>
    </div>
  );

  const th = { textAlign:"left", padding:"10px 14px", fontSize:11, color:C.mu2, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600, borderBottom:`1px solid ${C.br}` };
  const td = { padding:"12px 14px", fontSize:13, color:C.tx, verticalAlign:"top" };

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:C.mu }}>{vendors.length} vendor{vendors.length !== 1 ? "s" : ""}</div>
        <Btn onClick={onAdd} variant="primary" style={{ fontSize:12, padding:"7px 16px" }}>+ Add Vendor</Btn>
      </div>

      <div style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, overflow:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:760 }}>
          <thead>
            <tr>
              <th style={th}>Vendor</th>
              <th style={th}>Contact</th>
              <th style={th}>GST</th>
              <th style={th}>Linked Assets</th>
              <th style={{ ...th, textAlign:"right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map(v => {
              const assetCount = linked(v.id);
              const cats = byCat(v.id);
              const isOpen = expanded === v.id;
              return (
                <>
                  <tr key={v.id} style={{ borderBottom:`1px solid ${C.br}` }}>
                    <td style={td}>
                      <div style={{ fontWeight:700, fontFamily:"'Inter',sans-serif" }}>{v.name}</div>
                      {v.category && <span style={{ display:"inline-block", marginTop:4, background:`${C.ac}15`, color:C.acD, padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:600 }}>{v.category}</span>}
                      {(v.address || v.notes) && (
                        <div onClick={() => setExpanded(isOpen ? null : v.id)} style={{ marginTop:6, fontSize:11, color:C.acD, cursor:"pointer" }}>
                          {isOpen ? "▾ Hide details" : "▸ Show address / notes"}
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      {v.contact && <div>👤 {v.contact}</div>}
                      {v.phone   && <div style={{ color:C.mu, marginTop:2 }}>📞 {v.phone}</div>}
                      {v.email   && <div style={{ marginTop:2 }}>✉ <a href={`mailto:${v.email}`} style={{ color:C.acD, textDecoration:"none" }}>{v.email}</a></div>}
                      {v.website && <div style={{ marginTop:2 }}>🌐 <a href={v.website} target="_blank" rel="noreferrer" style={{ color:C.acD, textDecoration:"none" }}>{v.website.replace(/^https?:\/\//,"")}</a></div>}
                      {!v.contact && !v.phone && !v.email && !v.website && <span style={{ color:C.mu2 }}>—</span>}
                    </td>
                    <td style={{ ...td, fontFamily:"'Noto Sans Mono',monospace", fontSize:11, color:C.mu }}>{v.gst || "—"}</td>
                    <td style={td}>
                      {assetCount === 0
                        ? <span style={{ color:C.mu2 }}>None</span>
                        : (
                          <div>
                            <div style={{ fontWeight:700, marginBottom:4 }}>{assetCount} asset{assetCount !== 1 ? "s" : ""}</div>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                              {cats.map(c => (
                                <span key={c.cat} style={{ fontSize:11, background:C.el, color:C.mu, padding:"2px 8px", borderRadius:8 }}>{c.emoji} {c.count} {c.label}</span>
                              ))}
                            </div>
                          </div>
                        )
                      }
                    </td>
                    <td style={{ ...td, textAlign:"right", whiteSpace:"nowrap" }}>
                      <button onClick={() => onEdit(v)} style={{ background:C.el, border:`1px solid ${C.br}`, color:C.mu, cursor:"pointer", padding:"5px 10px", borderRadius:7, fontSize:12, fontFamily:"'Inter',sans-serif", marginRight:6 }}>Edit</button>
                      <button onClick={() => { if (confirm(`Delete "${v.name}"?`)) onDelete(v.id); }} style={{ background:`${C.err}10`, border:`1px solid ${C.err}25`, color:C.err, cursor:"pointer", padding:"5px 10px", borderRadius:7, fontSize:12, fontFamily:"'Inter',sans-serif" }}>✕</button>
                    </td>
                  </tr>
                  {isOpen && (v.address || v.notes) && (
                    <tr style={{ borderBottom:`1px solid ${C.br}`, background:C.el }}>
                      <td colSpan={5} style={{ padding:"10px 14px", fontSize:12, color:C.mu }}>
                        {v.address && <div>📍 {v.address}</div>}
                        {v.notes   && <div style={{ marginTop:v.address?6:0 }}>{v.notes}</div>}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
