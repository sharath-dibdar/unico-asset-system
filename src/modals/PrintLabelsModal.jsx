import { useState } from "react";
import { C, CATS } from "../constants.js";
import { Btn, Modal } from "../components/UI.jsx";

export default function PrintLabelsModal({ assets, workstations = [], onClose }) {
  const [selected,  setSelected]  = useState(new Set(assets.map(a => a.id)));
  const [mode,      setMode]      = useState("thermal"); // "thermal" | "a4"
  const [a4Cols,    setA4Cols]    = useState(4);

  const toggle    = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selAssets = assets.filter(a => selected.has(a.id));

  function getWorkstationName(assetId) {
    const ws = workstations.find(w => w.assetIds?.includes(assetId));
    return ws ? ws.name : null;
  }

  function buildLabelHtml(a) {
    const wsName = getWorkstationName(a.id);
    const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(a.code)}&bgcolor=ffffff&color=000000&margin=2`;
    return `<div class="label">
  <img class="qr" src="${qrUrl}" alt="${a.code}" />
  <div class="info">
    <div class="name">${a.name.slice(0, 45)}</div>
    <div class="code">${a.code}</div>
    ${wsName ? `<div class="ws">🖥 ${wsName.slice(0, 28)}</div>` : ""}
  </div>
</div>`;
  }

  function printThermal() {
    const win = window.open("", "_blank", "width=700,height=500");
    if (!win) { alert("Allow popups to print labels"); return; }
    // Thermal roll: page width=50mm, height=all labels stacked (gap sensor cuts at each 25mm label)
    const totalH = selAssets.length * 25;
    const html = `<!DOCTYPE html>
<html><head><title>QR Labels — UNICO</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  @page{size:50mm ${totalH}mm;margin:0;}
  html,body{width:50mm;background:#fff;font-family:Arial,Helvetica,sans-serif;}
  .label{
    display:flex;align-items:center;
    width:50mm;height:25mm;
    padding:1.5mm 2mm 1.5mm 1.5mm;gap:2mm;
  }
  .qr{width:19mm;height:19mm;flex-shrink:0;display:block;}
  .info{flex:1;min-width:0;display:flex;flex-direction:column;gap:0.8mm;justify-content:center;}
  .name{font-size:6.5pt;font-weight:700;line-height:1.25;word-break:break-word;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
  .code{font-size:6pt;font-family:'Courier New',monospace;color:#444;letter-spacing:0.02em;}
  .ws{font-size:5.5pt;color:#666;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
  .no-print{position:fixed;top:0;left:0;right:0;background:#1e1e2e;color:#fff;padding:10px 16px;display:flex;align-items:center;gap:12px;z-index:999;font-family:system-ui;}
  @media print{.no-print{display:none!important;}}
</style></head>
<body>
<div class="no-print">
  <strong>🖨 UNICO — Thermal Labels</strong>
  <span style="font-size:12px;opacity:0.7;">${selAssets.length} label${selAssets.length !== 1 ? "s" : ""} · 50×25mm each</span>
  <button onclick="window.print()" style="margin-left:auto;padding:7px 18px;background:#ffd200;color:#0C0E17;border:none;border-radius:6px;cursor:pointer;font-weight:700;font-size:13px;">Print</button>
  <span style="font-size:11px;opacity:0.6;">Paper: A 50×300mm &nbsp;·&nbsp; Margins: None &nbsp;·&nbsp; Scale: 100%</span>
  <button onclick="window.close()" style="padding:7px 14px;background:#333;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;">✕</button>
</div>
${selAssets.map(a => buildLabelHtml(a)).join("\n")}
</body></html>`;
    win.document.write(html);
    win.document.close();
  }

  function printA4() {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { alert("Allow popups to print labels"); return; }
    const colW = `calc((100% - ${(a4Cols - 1) * 6}mm) / ${a4Cols})`;
    const html = `<!DOCTYPE html>
<html><head><title>QR Labels — UNICO (A4)</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  @page{size:A4 portrait;margin:10mm;}
  body{background:#fff;font-family:Arial,Helvetica,sans-serif;}
  .grid{display:flex;flex-wrap:wrap;gap:6mm;}
  .label{
    width:${colW};border:0.4mm solid #ccc;border-radius:2mm;
    padding:2.5mm;display:flex;align-items:center;gap:2mm;
    page-break-inside:avoid;break-inside:avoid;
  }
  .qr{width:18mm;height:18mm;flex-shrink:0;}
  .info{flex:1;min-width:0;display:flex;flex-direction:column;gap:0.8mm;}
  .name{font-size:6.5pt;font-weight:700;line-height:1.25;word-break:break-word;}
  .code{font-size:6pt;font-family:'Courier New',monospace;color:#444;}
  .ws{font-size:5.5pt;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .no-print{padding:12px 16px;background:#f5f5f5;border-bottom:1px solid #ddd;display:flex;align-items:center;gap:12px;font-family:system-ui;}
  @media print{.no-print{display:none!important;}}
</style></head>
<body>
<div class="no-print">
  <strong>🖨 UNICO — A4 Sheet Labels</strong>
  <span style="font-size:12px;color:#666;">${selAssets.length} labels · ${a4Cols} per row</span>
  <button onclick="window.print()" style="margin-left:auto;padding:7px 18px;background:#ffd200;color:#0C0E17;border:none;border-radius:6px;cursor:pointer;font-weight:700;">Print</button>
  <button onclick="window.close()" style="padding:7px 14px;background:#eee;border:none;border-radius:6px;cursor:pointer;">✕</button>
</div>
<div class="grid" style="padding:0;">
${selAssets.map(a => buildLabelHtml(a)).join("\n")}
</div>
</body></html>`;
    win.document.write(html);
    win.document.close();
  }

  return (
    <Modal
      title="Print QR Labels"
      sub={`${selAssets.length} label${selAssets.length !== 1 ? "s" : ""} selected`}
      onClose={onClose}
      wide
      footer={
        <>
          <Btn onClick={onClose} variant="secondary">Cancel</Btn>
          {mode === "thermal"
            ? <Btn onClick={printThermal} variant="primary" style={{ opacity: selAssets.length > 0 ? 1 : 0.5 }} disabled={selAssets.length === 0}>🖨 Print Thermal Labels</Btn>
            : <Btn onClick={printA4}      variant="primary" style={{ opacity: selAssets.length > 0 ? 1 : 0.5 }} disabled={selAssets.length === 0}>🖨 Open A4 Print Preview</Btn>
          }
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setMode("thermal")}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `2px solid ${mode === "thermal" ? C.ac : C.br}`, background: mode === "thermal" ? `${C.ac}15` : C.el, color: mode === "thermal" ? C.ac : C.mu, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Archivo',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
          >
            🖨 Thermal Printer
            <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>50 × 25 mm · Seznik DP27</span>
          </button>
          <button
            onClick={() => setMode("a4")}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `2px solid ${mode === "a4" ? C.ac : C.br}`, background: mode === "a4" ? `${C.ac}15` : C.el, color: mode === "a4" ? C.ac : C.mu, cursor: "pointer", fontSize: 13, fontWeight: 400, fontFamily: "'Archivo',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
          >
            📄 A4 Sheet
            <span style={{ fontSize: 10, opacity: 0.7 }}>Multiple labels per page</span>
          </button>
        </div>

        {/* Thermal hint */}
        {mode === "thermal" && (
          <div style={{ background: `${C.ac}0D`, border: `1px solid ${C.ac}30`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: C.mu, lineHeight: 1.6 }}>
            In the print dialog: select <strong style={{ color: C.tx }}>Seznik DP27</strong> · paper <strong style={{ color: C.tx }}>A 50×300mm</strong> · margins <strong style={{ color: C.tx }}>None</strong> · scale <strong style={{ color: C.tx }}>100%</strong> — the gap sensor cuts each label automatically
          </div>
        )}

        {/* A4 columns */}
        {mode === "a4" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: C.mu }}>Columns per row:</span>
            {[3, 4, 5, 6].map(n => (
              <button key={n} onClick={() => setA4Cols(n)} style={{ padding: "6px 14px", borderRadius: 8, border: `2px solid ${a4Cols === n ? C.ac : C.br}`, background: a4Cols === n ? `${C.ac}15` : "transparent", color: a4Cols === n ? C.ac : C.mu, cursor: "pointer", fontSize: 12, fontFamily: "'Archivo',sans-serif" }}>{n}</button>
            ))}
          </div>
        )}

        {/* Label preview chip */}
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={() => setSelected(new Set(assets.map(a => a.id)))} variant="ghost">Select All</Btn>
          <Btn onClick={() => setSelected(new Set())} variant="ghost">Select None</Btn>
          {Object.entries(CATS).map(([k, v]) => (
            <Btn key={k} onClick={() => setSelected(new Set(assets.filter(a => a.cat === k).map(a => a.id)))} variant="ghost" style={{ fontSize: 11 }}>{v.emoji}</Btn>
          ))}
        </div>

        {/* Asset list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
          {assets.map(a => {
            const wsName = getWorkstationName(a.id);
            return (
              <div key={a.id} onClick={() => toggle(a.id)} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", background: selected.has(a.id) ? `${C.ac}10` : C.el, border: `1px solid ${selected.has(a.id) ? C.ac : C.br}`, borderRadius: 10, cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${selected.has(a.id) ? C.ac : C.mu}`, background: selected.has(a.id) ? C.ac : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {selected.has(a.id) && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
                </div>
                <div style={{ fontSize: 18, flexShrink: 0 }}>{CATS[a.cat]?.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: C.mu, fontFamily: "'Noto Sans Mono',monospace" }}>
                    {a.code}
                    {wsName && <span style={{ marginLeft: 8, color: C.ac2 }}>🖥 {wsName}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
