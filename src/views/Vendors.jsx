import { C, CATS } from "../constants.js";
import { Btn, EmptyState, Label } from "../components/UI.jsx";

export default function Vendors({ vendors, assets, onAdd, onEdit, onDelete }) {
  const linked = (vid) => assets.filter(a=>a.vendorId===vid).length;

  if (vendors.length===0) return (
    <div className="fade">
      <EmptyState icon="🏪" title="No vendors yet" sub="Add vendors to link them to your assets and track supplier contacts." />
      <div style={{ textAlign:"center", marginTop:16 }}><Btn onClick={onAdd} variant="primary">+ Add First Vendor</Btn></div>
    </div>
  );

  return (
    <div className="fade" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:C.mu }}>{vendors.length} vendor{vendors.length!==1?"s":""}</div>
        <Btn onClick={onAdd} variant="primary" style={{ fontSize:12, padding:"7px 16px" }}>+ Add Vendor</Btn>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
        {vendors.map(v => {
          const assetCount = linked(v.id);
          const assetsBycat = CATS ? Object.entries(CATS).map(([k,cat])=>({
            cat:k, label:cat.label, emoji:cat.emoji,
            count:assets.filter(a=>a.vendorId===v.id&&a.cat===k).length
          })).filter(c=>c.count>0) : [];

          return (
            <div key={v.id} style={{ background:C.sf, border:`1px solid ${C.br}`, borderRadius:14, padding:20, display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Syne',sans-serif", marginBottom:2 }}>{v.name}</div>
                  {v.category && <span style={{ background:`${C.ac}15`, color:C.ac, padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:600 }}>{v.category}</span>}
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0, marginLeft:8 }}>
                  <button onClick={()=>onEdit(v)} style={{ background:C.el, border:`1px solid ${C.br}`, color:C.mu, cursor:"pointer", padding:"5px 10px", borderRadius:7, fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>Edit</button>
                  <button onClick={()=>{ if(confirm(`Delete "${v.name}"?`)) onDelete(v.id); }} style={{ background:`${C.err}10`, border:`1px solid ${C.err}25`, color:C.err, cursor:"pointer", padding:"5px 10px", borderRadius:7, fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>✕</button>
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {v.contact && <div style={{ fontSize:13, color:C.tx }}>👤 {v.contact}</div>}
                {v.email   && <div style={{ fontSize:12, color:C.mu }}>✉  <a href={`mailto:${v.email}`} style={{ color:C.ac, textDecoration:"none" }}>{v.email}</a></div>}
                {v.phone   && <div style={{ fontSize:12, color:C.mu }}>📞 {v.phone}</div>}
                {v.gst     && <div style={{ fontSize:11, color:C.mu2, fontFamily:"'DM Mono',monospace" }}>GST: {v.gst}</div>}
                {v.website && <div style={{ fontSize:12, color:C.mu }}>🌐 <a href={v.website} target="_blank" rel="noreferrer" style={{ color:C.ac, textDecoration:"none" }}>{v.website.replace(/^https?:\/\//,"")}</a></div>}
                {v.address && <div style={{ fontSize:12, color:C.mu2, marginTop:2 }}>📍 {v.address}</div>}
              </div>

              <div style={{ borderTop:`1px solid ${C.br}`, paddingTop:10 }}>
                <Label>Linked Assets</Label>
                {assetCount===0
                  ? <div style={{ fontSize:12, color:C.mu2 }}>No assets linked</div>
                  : (
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.tx, marginBottom:4 }}>{assetCount} asset{assetCount!==1?"s":""}</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {assetsBycat.map(c=>(
                          <span key={c.cat} style={{ fontSize:11, background:C.el, color:C.mu, padding:"2px 8px", borderRadius:8 }}>{c.emoji} {c.count} {c.label}</span>
                        ))}
                      </div>
                    </div>
                  )
                }
              </div>

              {v.notes && <div style={{ fontSize:12, color:C.mu2, borderTop:`1px solid ${C.br}`, paddingTop:8 }}>{v.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
