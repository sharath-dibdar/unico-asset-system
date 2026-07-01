import { useState } from "react";
import { C, CATS } from "../constants.js";
import { Btn, Modal } from "../components/UI.jsx";

// On-screen preview of one thermal label at the chosen rotation.
// Mirrors the print markup: 50×25mm scaled up (4px/mm) for legibility.
function ThermalPreview({ asset, rotation, wsName }) {
  const PX = 4; // px per mm
  if (!asset) return <div style={{ fontSize: 12, color: C.mu2 }}>Select at least one asset to preview.</div>;
  const portrait = rotation === 90 || rotation === 270;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(asset.code)}&bgcolor=ffffff&color=000000&margin=2`;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", overflow: "hidden", width: 50 * PX, height: 25 * PX, background: "#fff", border: `1px solid ${C.br}`, borderRadius: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: (portrait ? 25 : 50) * PX, height: (portrait ? 50 : 25) * PX,
          display: "flex", flexDirection: portrait ? "column" : "row",
          alignItems: "center", justifyContent: "center", gap: 2 * PX, padding: 1.5 * PX,
          transform: `translate(-50%,-50%) rotate(${rotation}deg)`,
        }}>
          <img src={qrUrl} alt={asset.code} style={{ width: 19 * PX, height: 19 * PX, flexShrink: 0, display: "block" }} />
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1, justifyContent: "center", overflow: "hidden", color: "#000" }}>
            <div style={{ fontSize: 8, fontWeight: 700, lineHeight: 1.2, wordBreak: "break-word" }}>{asset.name.slice(0, 45)}</div>
            <div style={{ fontSize: 7.5, fontFamily: "monospace", color: "#444" }}>{asset.code}</div>
            {wsName && <div style={{ fontSize: 6.5, color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>🖥 {wsName.slice(0, 28)}</div>}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: C.mu2 }}>Preview · 50 × 25 mm · {rotation}°</div>
    </div>
  );
}

export default function PrintLabelsModal({ assets, workstations = [], onClose }) {
  const [selected,  setSelected]  = useState(new Set(assets.map(a => a.id)));
  const [mode,      setMode]      = useState("thermal"); // "thermal" | "a4"
  const [a4Cols,    setA4Cols]    = useState(4);
  const [rotation,  setRotation]  = useState(90); // 0 | 90 | 180 | 270

  const toggle    = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selAssets = assets.filter(a => selected.has(a.id));

  function getWorkstationName(assetId) {
    const ws = workstations.find(w => w.assetIds?.includes(assetId));
    return ws ? ws.name : null;
  }

  // Inner content of a single label. `angle` rotates the content so it can be
  // matched to however the thermal printer feeds the media.
  function buildLabelHtml(a, angle = 0) {
    const wsName   = getWorkstationName(a.id);
    const qrUrl    = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(a.code)}&bgcolor=ffffff&color=000000&margin=2`;
    const portrait = angle === 90 || angle === 270;      // rotated onto the short edge
    const boxW     = portrait ? 25 : 50;
    const boxH     = portrait ? 50 : 25;
    const flexDir  = portrait ? "column" : "row";
    return `<div class="label">
  <div class="rot" style="width:${boxW}mm;height:${boxH}mm;flex-direction:${flexDir};transform:translate(-50%,-50%) rotate(${angle}deg);">
    <img class="qr" src="${qrUrl}" alt="${a.code}" />
    <div class="info">
      <div class="name">${a.name.slice(0, 45)}</div>
      <div class="code">${a.code}</div>
      ${wsName ? `<div class="ws">🖥 ${wsName.slice(0, 28)}</div>` : ""}
    </div>
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
    position:relative;overflow:hidden;
    width:50mm;height:25mm;
  }
  .rot{
    position:absolute;top:50%;left:50%;
    display:flex;align-items:center;justify-content:center;gap:2mm;
    padding:1.5mm;
  }
  .qr{width:19mm;height:19mm;flex-shrink:0;display:block;}
  .info{min-width:0;display:flex;flex-direction:column;gap:0.8mm;justify-content:center;overflow:hidden;}
  .name{font-size:6.5pt;font-weight:700;line-height:1.25;word-break:break-word;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
  .code{font-size:6pt;font-family:'Courier New',monospace;color:#444;letter-spacing:0.02em;}
  .ws{font-size:5.5pt;color:#666;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
  .no-print{position:fixed;top:0;left:0;right:0;background:#1e1e2e;color:#fff;padding:10px 16px;display:flex;align-items:center;gap:12px;z-index:999;font-family:system-ui;}
  @media print{.no-print{display:none!important;}}
</style></head>
<body>
<div class="no-print">
  <strong>🖨 UNICO — Thermal Labels</strong>
  <span style="font-size:12px;opacity:0.7;">${selAssets.length} label${selAssets.length !== 1 ? "s" : ""} · 50×25mm · rotation ${rotation}°</span>
  <button onclick="window.print()" style="margin-left:auto;padding:7px 18px;background:#ffd200;color:#0C0E17;border:none;border-radius:6px;cursor:pointer;font-weight:700;font-size:13px;">Print</button>
  <span style="font-size:11px;opacity:0.6;">Paper: A 50×300mm &nbsp;·&nbsp; Margins: None &nbsp;·&nbsp; Scale: 100%</span>
  <button onclick="window.close()" style="padding:7px 14px;background:#333;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;">✕</button>
</div>
${selAssets.map(a => buildLabelHtml(a, rotation)).join("\n")}
</body></html>`;
    win.document.write(html);
    win.document.close();
  }

  // Flat (non-rotated) label markup for the A4 grid.
  function buildFlatLabelHtml(a) {
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
${selAssets.map(a => buildFlatLabelHtml(a)).join("\n")}
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

        {/* Thermal hint + rotation */}
        {mode === "thermal" && (
          <>
            <div style={{ background: `${C.ac}0D`, border: `1px solid ${C.ac}30`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: C.mu, lineHeight: 1.6 }}>
              In the print dialog: select <strong style={{ color: C.tx }}>Seznik DP27</strong> · paper <strong style={{ color: C.tx }}>A 50×300mm</strong> · margins <strong style={{ color: C.tx }}>None</strong> · scale <strong style={{ color: C.tx }}>100%</strong> — the gap sensor cuts each label automatically
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: C.mu }}>Rotation:</span>
              {[0, 90, 180, 270].map(deg => (
                <button key={deg} onClick={() => setRotation(deg)} style={{ padding: "6px 14px", borderRadius: 8, border: `2px solid ${rotation === deg ? C.ac : C.br}`, background: rotation === deg ? `${C.ac}15` : "transparent", color: rotation === deg ? C.ac : C.mu, cursor: "pointer", fontSize: 12, fontFamily: "'Archivo',sans-serif" }}>{deg}°</button>
              ))}
              <span style={{ fontSize: 11, color: C.mu2 }}>If the label prints sideways or upside-down, change this until it reads correctly.</span>
            </div>

            {/* Live preview of one label at chosen rotation */}
            <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}>
              <ThermalPreview asset={selAssets[0]} rotation={rotation} wsName={selAssets[0] ? getWorkstationName(selAssets[0].id) : null} />
            </div>
          </>
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
