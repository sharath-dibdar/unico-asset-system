import { useState } from "react";
import { C, CATS } from "../constants.js";
import { Btn, Modal } from "../components/UI.jsx";

export default function PrintLabelsModal({ assets, onClose }) {
  const [selected, setSelected] = useState(new Set(assets.map(a=>a.id)));
  const [labelSize, setLabelSize] = useState("medium"); // small | medium | large

  const toggle = id => setSelected(s=>{ const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const selAssets = assets.filter(a=>selected.has(a.id));

  function print() {
    const win = window.open("","_blank","width=800,height=600");
    if (!win) { alert("Allow popups to print labels"); return; }
    const sizes = { small:"80px", medium:"120px", large:"160px" };
    const sz = sizes[labelSize];
    const html = `<!DOCTYPE html>
<html><head><title>QR Labels — UNICO</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#fff;font-family:system-ui,sans-serif;}
  .grid{display:flex;flex-wrap:wrap;gap:8px;padding:8px;}
  .label{border:1px solid #ccc;border-radius:6px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px;width:${sz};page-break-inside:avoid;}
  .label img{width:calc(${sz} - 20px);height:calc(${sz} - 20px);}
  .name{font-size:9px;font-weight:700;text-align:center;line-height:1.2;word-break:break-word;max-width:calc(${sz} - 8px);}
  .code{font-size:7px;color:#666;font-family:monospace;}
  .serial{font-size:7px;color:#999;font-family:monospace;}
  @media print{.no-print{display:none!important;}@page{margin:10mm;}}
</style></head>
<body>
<div class="no-print" style="padding:12px;background:#f5f5f5;border-bottom:1px solid #ddd;display:flex;align-items:center;gap:12px;">
  <strong>UNICO QR Labels</strong> — ${selAssets.length} labels
  <button onclick="window.print()" style="padding:8px 16px;background:#ffd200;color:#0C0E17;border:none;border-radius:6px;cursor:pointer;font-weight:700;">🖨 Print</button>
  <button onclick="window.close()" style="padding:8px 16px;background:#eee;border:none;border-radius:6px;cursor:pointer;">Close</button>
</div>
<div class="grid">
${selAssets.map(a=>`  <div class="label">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(a.code)}&bgcolor=ffffff&color=000000&margin=4" alt="${a.code}" />
    <div class="name">${a.name.slice(0,40)}</div>
    <div class="code">${a.code}</div>
    ${a.serial&&a.serial!=="N/A"?`<div class="serial">S/N: ${a.serial.slice(0,20)}</div>`:""}
  </div>`).join("\n")}
</div></body></html>`;
    win.document.write(html);
    win.document.close();
  }

  return (
    <Modal title="Print QR Labels" sub={`${selAssets.length} label${selAssets.length!==1?"s":""} selected`} onClose={onClose} wide
      footer={
        <>
          <Btn onClick={onClose} variant="secondary">Cancel</Btn>
          <Btn onClick={print} variant="primary" style={{ opacity:selAssets.length>0?1:0.5 }}>🖨 Open Print Preview</Btn>
        </>
      }>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {/* Label size */}
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <span style={{ fontSize:13, color:C.mu }}>Label size:</span>
          {[["small","Small (80px)"],["medium","Medium (120px)"],["large","Large (160px)"]].map(([v,l])=>(
            <button key={v} onClick={()=>setLabelSize(v)} style={{ padding:"6px 14px", borderRadius:8, border:`2px solid ${labelSize===v?C.ac:C.br}`, background:labelSize===v?`${C.ac}15`:"transparent", color:labelSize===v?C.ac:C.mu, cursor:"pointer", fontSize:12, fontFamily:"'Archivo',sans-serif" }}>{l}</button>
          ))}
        </div>

        {/* Select all / none */}
        <div style={{ display:"flex", gap:10 }}>
          <Btn onClick={()=>setSelected(new Set(assets.map(a=>a.id)))} variant="ghost">Select All</Btn>
          <Btn onClick={()=>setSelected(new Set())} variant="ghost">Select None</Btn>
          {Object.entries(CATS).map(([k,v])=>(
            <Btn key={k} onClick={()=>setSelected(new Set(assets.filter(a=>a.cat===k).map(a=>a.id)))} variant="ghost" style={{ fontSize:11 }}>{v.emoji}</Btn>
          ))}
        </div>

        {/* Asset list */}
        <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:360, overflowY:"auto" }}>
          {assets.map(a=>(
            <div key={a.id} onClick={()=>toggle(a.id)} style={{ display:"flex", gap:12, alignItems:"center", padding:"10px 14px", background:selected.has(a.id)?`${C.ac}10`:C.el, border:`1px solid ${selected.has(a.id)?C.ac:C.br}`, borderRadius:10, cursor:"pointer", transition:"all 0.15s" }}>
              <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${selected.has(a.id)?C.ac:C.mu}`, background:selected.has(a.id)?C.ac:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {selected.has(a.id) && <span style={{ color:"#fff", fontSize:12, lineHeight:1 }}>✓</span>}
              </div>
              <div style={{ fontSize:18, flexShrink:0 }}>{CATS[a.cat]?.emoji}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.name}</div>
                <div style={{ fontSize:11, color:C.mu, fontFamily:"'Noto Sans Mono',monospace" }}>{a.code}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
