import { useEffect, useMemo, useState } from "react";
import { CatIcon } from "../components/Icons.jsx";
import { C, CATS } from "../constants.js";
import { Btn, Modal } from "../components/UI.jsx";
import { exportWePrintLabels } from "../utils.js";
import { detectHelper, getPrinters, renderLabel, printImage, loadPrintSettings, savePrintSettings, labelDate } from "../lib/labelPrinter.js";

const MODES = [
  ["direct",  "🖨 Label Printer", "Print directly · DP27"],
  ["weprint", "🏷️ WePrint",       "Export Excel"],
  ["a4",      "📄 A4 Sheet",      "Regular printer"],
];

export default function PrintLabelsModal({ assets, workstations = [], preselectIds = [], onClose }) {
  const [selected, setSelected] = useState(() => new Set(preselectIds));
  const [mode,     setMode]     = useState("direct");
  const [a4Cols,   setA4Cols]   = useState(4);
  const [search,   setSearch]   = useState("");

  // Direct-print state
  const saved = loadPrintSettings();
  const [helper,   setHelper]   = useState(null);      // { base, version } | null
  const [hState,   setHState]   = useState("idle");    // idle | checking | ready | missing
  const [printers, setPrinters] = useState([]);
  const [printer,  setPrinter]  = useState(saved.printer || "");
  const [rotation, setRotation] = useState(saved.rotation ?? 0);
  const [preview,  setPreview]  = useState("");
  const [progress, setProgress] = useState(null);      // { done, total, failed } | null

  const toggle    = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selAssets = assets.filter(a => selected.has(a.id));

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(a => [a.name, a.code, a.make, a.model, a.serial, ...(a.tags || [])].some(f => f?.toLowerCase().includes(q)));
  }, [assets, search]);

  function getWorkstationName(assetId) {
    const ws = workstations.find(w => w.assetIds?.includes(assetId));
    return ws ? ws.name : null;
  }
  const labelData = a => ({ name: a.name, code: a.code, workstation: getWorkstationName(a.id) || "", location: a.loc || "", purchaseDate: a.pDate || "" });

  // ─── Direct print ──────────────────────────────────────────────────────────
  async function connect() {
    setHState("checking");
    const h = await detectHelper();
    if (!h) { setHelper(null); setHState("missing"); return; }
    setHelper(h);
    try {
      const list = await getPrinters(h.base);
      setPrinters(list);
      if (!list.includes(printer)) setPrinter(list.find(n => /dp27|label/i.test(n)) || list[0] || "");
      setHState("ready");
    } catch {
      setHState("missing");
    }
  }

  useEffect(() => { if (mode === "direct" && hState === "idle") connect(); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { savePrintSettings({ printer, rotation }); }, [printer, rotation]);

  // Live preview = the exact image that will be sent to the printer.
  const first = selAssets[0];
  useEffect(() => {
    let cancelled = false;
    if (mode !== "direct" || !first) { setPreview(""); return; }
    renderLabel(labelData(first), rotation).then(url => { if (!cancelled) setPreview(url); });
    return () => { cancelled = true; };
  }, [mode, first?.id, rotation]); // eslint-disable-line react-hooks/exhaustive-deps

  async function printDirect() {
    if (!helper || !printer || selAssets.length === 0) return;
    if (selAssets.length > 10 && !confirm(`Print ${selAssets.length} labels on ${printer}?`)) return;
    const total = selAssets.length;
    let failed = 0;
    setProgress({ done: 0, total, failed: 0 });
    for (let i = 0; i < total; i++) {
      try {
        const png = await renderLabel(labelData(selAssets[i]), rotation);
        const ok = await printImage(helper.base, printer, png);
        if (!ok) failed++;
      } catch { failed++; }
      setProgress({ done: i + 1, total, failed });
    }
  }

  // ─── WePrint / A4 ──────────────────────────────────────────────────────────
  function exportForWePrint() {
    exportWePrintLabels(selAssets.map(a => ({ ...labelData(a), purchased: labelDate(a.pDate) })));
  }

  function buildFlatLabelHtml(a) {
    const wsName = getWorkstationName(a.id);
    const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(a.code)}&bgcolor=ffffff&color=000000&margin=2`;
    return `<div class="label">
  <img class="qr" src="${qrUrl}" alt="${a.code}" />
  <div class="info">
    <img class="logo" src="${location.origin}/label-logo.svg" alt="Unico" />
    <div class="name">${a.name.slice(0, 45)}</div>
    <div class="code">${a.code}</div>
    ${a.loc ? `<div class="ws"><b>Loc:</b> ${a.loc.slice(0, 30)}</div>` : ""}
    ${labelDate(a.pDate) ? `<div class="ws"><b>Purchased:</b> ${labelDate(a.pDate)}</div>` : ""}
    ${wsName ? `<div class="ws"><b>WS:</b> ${wsName.slice(0, 28)}</div>` : ""}
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
  .ws{font-size:5.5pt;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .logo{height:3mm;width:auto;align-self:flex-start;margin-bottom:0.6mm;}
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

  const none = selAssets.length === 0;
  const printing = progress && progress.done < progress.total;
  const pill = (active) => ({ padding: "6px 14px", borderRadius: 8, border: `2px solid ${active ? C.ac : C.br}`, background: active ? `${C.ac}15` : "transparent", color: active ? C.acD : C.mu, cursor: "pointer", fontSize: 12, fontFamily: "'Inter',sans-serif" });

  return (
    <Modal
      title="Print QR Labels"
      sub={`${selAssets.length} label${selAssets.length !== 1 ? "s" : ""} selected`}
      onClose={onClose}
      wide
      footer={
        <>
          <Btn onClick={onClose} variant="secondary">Close</Btn>
          {mode === "direct"  && <Btn onClick={printDirect} variant="primary" disabled={none || hState !== "ready" || !printer || printing}>{printing ? `Printing ${progress.done}/${progress.total}…` : `🖨 Print ${selAssets.length || ""} label${selAssets.length !== 1 ? "s" : ""}`}</Btn>}
          {mode === "weprint" && <Btn onClick={exportForWePrint} variant="primary" disabled={none}>⬇ Export (.xlsx)</Btn>}
          {mode === "a4"      && <Btn onClick={printA4} variant="primary" disabled={none}>🖨 A4 Preview</Btn>}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Mode toggle */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {MODES.map(([k, label, sub]) => (
            <button key={k} onClick={() => setMode(k)}
              style={{ padding: "9px 6px", borderRadius: 10, border: `2px solid ${mode === k ? C.ac : C.br}`, background: mode === k ? `${C.ac}15` : C.el, color: mode === k ? C.acD : C.mu, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Inter',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0 }}>
              <span style={{ whiteSpace: "nowrap" }}>{label}</span>
              <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.8, textAlign: "center" }}>{sub}</span>
            </button>
          ))}
        </div>

        {/* Direct print panel */}
        {mode === "direct" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {hState === "checking" && <div style={{ fontSize: 13, color: C.mu }}>Looking for the label printer on this device…</div>}

            {hState === "missing" && (
              <div style={{ background: `${C.err}0D`, border: `1px solid ${C.err}30`, borderRadius: 10, padding: "12px 14px", fontSize: 12.5, color: C.mu, lineHeight: 1.6 }}>
                <div style={{ color: C.tx, fontWeight: 700, marginBottom: 4 }}>Label printer not reachable from this device</div>
                Direct printing works on the <strong style={{ color: C.tx }}>PC the DP27 is plugged into</strong>, in Chrome or Edge. Make sure the printer's <strong style={{ color: C.tx }}>dtpweb</strong> service is running (it's installed with the driver). If Chrome asked to allow access to <em>apps and devices on this device</em>, choose <strong style={{ color: C.tx }}>Allow</strong>.
                <div style={{ marginTop: 6 }}>On a phone, use the <strong style={{ color: C.tx }}>WePrint</strong> tab instead.</div>
                <div style={{ marginTop: 10 }}><Btn onClick={connect} variant="secondary" style={{ fontSize: 12, padding: "6px 14px" }}>↻ Retry</Btn></div>
              </div>
            )}

            {hState === "ready" && (
              <>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: C.ok, fontWeight: 700 }}>● Connected</span>
                  <select value={printer} onChange={e => setPrinter(e.target.value)} style={{ width: "auto", minWidth: 180, flex: 1 }}>
                    {printers.length === 0 && <option value="">No printers found</option>}
                    {printers.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: C.mu }}>Rotate:</span>
                  {[0, 90, 180, 270].map(d => <button key={d} onClick={() => setRotation(d)} style={pill(rotation === d)}>{d}°</button>)}
                </div>
              </>
            )}

            {/* Preview of the exact image sent to the printer */}
            {hState !== "missing" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                {preview
                  ? <img src={preview} alt="Label preview" style={{ width: "100%", maxWidth: 320, aspectRatio: "2 / 1", background: "#fff", borderRadius: 6, border: `1px solid ${C.br}`, imageRendering: "pixelated" }} />
                  : <div style={{ fontSize: 12, color: C.mu2, padding: "10px 0" }}>Select an asset below to preview its label.</div>}
                {preview && <div style={{ fontSize: 10, color: C.mu2 }}>Preview · 50 × 25 mm{selAssets.length > 1 ? ` · showing 1 of ${selAssets.length}` : ""}</div>}
              </div>
            )}

            {progress && (
              <div style={{ fontSize: 12.5, fontWeight: 600, color: progress.failed ? C.err : progress.done === progress.total ? C.ok : C.mu }}>
                {progress.done < progress.total
                  ? `Printing ${progress.done} of ${progress.total}…`
                  : progress.failed
                    ? `Done — ${progress.total - progress.failed} printed, ${progress.failed} failed`
                    : `✓ Printed ${progress.total} label${progress.total !== 1 ? "s" : ""}`}
              </div>
            )}
          </div>
        )}

        {/* WePrint instructions */}
        {mode === "weprint" && (
          <div style={{ background: `${C.ac}0D`, border: `1px solid ${C.ac}30`, borderRadius: 10, padding: "12px 14px", fontSize: 12.5, color: C.mu, lineHeight: 1.7 }}>
            <div>1. Export the selected labels and open <strong style={{ color: C.tx }}>WePrint</strong> (app or web).</div>
            <div>2. <strong style={{ color: C.tx }}>One-time:</strong> template <strong style={{ color: C.tx }}>50 × 25 mm</strong>, type Label, gap 3 mm. Bind a QRCode to <strong style={{ color: C.tx }}>Code</strong> and Text to <strong style={{ color: C.tx }}>Name</strong> / <strong style={{ color: C.tx }}>Code</strong> / <strong style={{ color: C.tx }}>Workstation</strong>.</div>
            <div>3. Load the Excel file into the template and bulk print.</div>
          </div>
        )}

        {/* A4 columns */}
        {mode === "a4" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: C.mu }}>Columns:</span>
            {[3, 4, 5, 6].map(n => <button key={n} onClick={() => setA4Cols(n)} style={pill(a4Cols === n)}>{n}</button>)}
          </div>
        )}

        {/* Selection */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, code, serial, tag…" />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          <Btn onClick={() => setSelected(s => new Set([...s, ...visible.map(a => a.id)]))} variant="ghost">Select {search ? "shown" : "all"} ({visible.length})</Btn>
          <Btn onClick={() => setSelected(new Set())} variant="ghost">Clear</Btn>
          {Object.entries(CATS).map(([k, v]) => (
            <Btn key={k} onClick={() => setSelected(new Set(assets.filter(a => a.cat === k).map(a => a.id)))} variant="ghost" style={{ padding: "4px 8px" }} title={v.label}><CatIcon cat={k} size={16} /></Btn>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
          {visible.map(a => {
            const wsName = getWorkstationName(a.id);
            const on = selected.has(a.id);
            return (
              <div key={a.id} onClick={() => toggle(a.id)} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", background: on ? `${C.ac}10` : C.el, border: `1px solid ${on ? C.ac : C.br}`, borderRadius: 10, cursor: "pointer" }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${on ? C.ac : C.mu}`, background: on ? C.ac : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {on && <span style={{ color: C.acTx, fontSize: 13, lineHeight: 1, fontWeight: 800 }}>✓</span>}
                </div>
                <div style={{ fontSize: 18, flexShrink: 0 }}><CatIcon cat={a.cat} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: C.mu, fontFamily: "'Noto Sans Mono',monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.code}
                    {wsName && <span style={{ marginLeft: 8, color: C.ac2 }}>🖥 {wsName}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {visible.length === 0 && <div style={{ fontSize: 12, color: C.mu, padding: 10, textAlign: "center" }}>No assets match “{search}”.</div>}
        </div>
      </div>
    </Modal>
  );
}
