// ─── Direct label printing via the DothanTech "dtpweb" print helper ──────────
// The Seznik/Detonger printer driver installs a local service (dtpweb) that
// listens on 127.0.0.1. It accepts CORS requests from any origin, so this web
// app can print straight to the label printer from the PC it is installed on.
//
// Protocol (reverse-engineered from the vendor's WeiDa web app):
//   GET  {base}/local/ServerInfo                 → health check
//   POST {base}/lpapi/GetPrinters                → { printers:[{name,type,ip}] }
//   POST {base}/lpapi/PrintImageD?{params}       → body = PNG data URL
//        params: printerName, printWidth/printHeight (0.01 mm), scaleUnit=1,
//                threshold (0-255 b/w cutoff), jobName="dtpweb"
import QRCode from "qrcode";

const BASES = [
  "http://127.0.0.1:15216",
  "http://127.0.0.1:35216",
  "https://lht.d6688.cn:15217", // newer helpers serve HTTPS on a hostname that resolves to 127.0.0.1
  "https://lht.d6688.cn:35217",
];

export const LABEL_W_MM = 50;
export const LABEL_H_MM = 25;
const DPI = 203;
const PX_PER_MM = DPI / 25.4;

function withTimeout(ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  return { signal: ctl.signal, done: () => clearTimeout(t) };
}

// Find a running helper. Resolves to { base, version } or null.
export async function detectHelper() {
  const attempts = BASES.map(async base => {
    const to = withTimeout(2500);
    try {
      const r = await fetch(`${base}/local/ServerInfo`, { signal: to.signal });
      const j = await r.json();
      if (j?.statusCode === 0) return { base, version: j.resultInfo?.version || "" };
      throw new Error("bad status");
    } finally { to.done(); }
  });
  try { return await Promise.any(attempts); } catch { return null; }
}

async function lpapi(base, action, params = {}, body, contentType, timeoutMs = 15000) {
  const qs = new URLSearchParams(params).toString();
  const to = withTimeout(timeoutMs);
  try {
    const r = await fetch(`${base}/lpapi/${action}${qs ? "?" + qs : ""}`, {
      method: "POST",
      headers: { "Content-Type": contentType || "application/x-www-form-urlencoded;charset=utf-8" },
      body: body ?? qs,
      signal: to.signal,
    });
    return await r.json();
  } finally { to.done(); }
}

// Printer names reported by the helper (deduplicated — it lists one entry per network interface).
export async function getPrinters(base) {
  const j = await lpapi(base, "GetPrinters", { onlyOnline: true, onlySupported: true });
  const list = j?.resultInfo?.printers || [];
  return [...new Set(list.map(p => p.name).filter(Boolean))];
}

// Wrap text to at most `maxLines` lines within `maxW` px, ellipsizing the last line.
function wrap(ctx, text, maxW, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const all = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (!cur || ctx.measureText(test).width <= maxW) cur = test;
    else { all.push(cur); cur = w; }
  }
  if (cur) all.push(cur);
  const fit = s => { while (s.length > 1 && ctx.measureText(s).width > maxW) s = s.slice(0, -1); return s; };
  const lines = all.slice(0, maxLines).map(fit);
  if (lines.length && (all.length > maxLines || lines.some((l, i) => l !== all[i]))) {
    let last = lines[lines.length - 1];
    while (last && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
    lines[lines.length - 1] = last + "…";
  }
  return lines;
}

// Render one 50×25 mm label to a PNG data URL at printer resolution.
// rotation (0/90/180/270) rotates the artwork within the label, for printers
// that feed the media sideways.
export async function renderLabel({ name, code, workstation }, rotation = 0) {
  const W = Math.round(LABEL_W_MM * PX_PER_MM); // 400
  const H = Math.round(LABEL_H_MM * PX_PER_MM); // 200
  const portrait = rotation === 90 || rotation === 270;
  const cw = portrait ? H : W, ch = portrait ? W : H; // artwork box before rotation

  // Artwork canvas
  const art = document.createElement("canvas");
  art.width = cw; art.height = ch;
  const a = art.getContext("2d");
  a.fillStyle = "#fff"; a.fillRect(0, 0, cw, ch);
  a.imageSmoothingEnabled = false;

  const pad = Math.round(1.5 * PX_PER_MM);
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, String(code || ""), { margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });

  a.fillStyle = "#000";
  a.textBaseline = "top";
  if (!portrait) {
    // QR left, text right
    const qr = ch - pad * 2;
    a.drawImage(qrCanvas, pad, pad, qr, qr);
    const tx = pad + qr + Math.round(2 * PX_PER_MM);
    const tw = cw - tx - pad;
    const nameFont = 22, codeFont = 20, wsFont = 17;
    a.font = `bold ${nameFont}px Arial, Helvetica, sans-serif`;
    const nameLines = wrap(a, name, tw, 3);
    const blockH = nameLines.length * nameFont * 1.15 + 6 + codeFont * 1.15 + (workstation ? 4 + wsFont * 1.15 : 0);
    let y = Math.max(pad, (ch - blockH) / 2);
    nameLines.forEach(l => { a.fillText(l, tx, y); y += nameFont * 1.15; });
    y += 6;
    a.font = `bold ${codeFont}px "Courier New", Consolas, monospace`;
    a.fillText(wrap(a, code, tw, 1)[0] || "", tx, y); y += codeFont * 1.15;
    if (workstation) {
      y += 4;
      a.font = `${wsFont}px Arial, Helvetica, sans-serif`;
      a.fillText(wrap(a, "WS: " + workstation, tw, 1)[0] || "", tx, y);
    }
  } else {
    // Portrait artwork: QR top, text below (centered)
    const qr = cw - pad * 2;
    a.drawImage(qrCanvas, pad, pad, qr, qr);
    a.textAlign = "center";
    const tw = cw - pad * 2;
    let y = pad + qr + 8;
    a.font = `bold 20px Arial, Helvetica, sans-serif`;
    wrap(a, name, tw, 3).forEach(l => { a.fillText(l, cw / 2, y); y += 23; });
    y += 4;
    a.font = `bold 18px "Courier New", Consolas, monospace`;
    a.fillText(wrap(a, code, tw, 1)[0] || "", cw / 2, y); y += 22;
    if (workstation) {
      a.font = `15px Arial, Helvetica, sans-serif`;
      a.fillText(wrap(a, workstation, tw, 1)[0] || "", cw / 2, y + 2);
    }
  }

  // Compose onto the final W×H label, rotated.
  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  const o = out.getContext("2d");
  o.fillStyle = "#fff"; o.fillRect(0, 0, W, H);
  o.imageSmoothingEnabled = false;
  o.translate(W / 2, H / 2);
  o.rotate((rotation * Math.PI) / 180);
  o.drawImage(art, -cw / 2, -ch / 2);
  return out.toDataURL("image/png");
}

// Print one rendered label. Returns true on success.
export async function printImage(base, printerName, dataUrl, { threshold = 160 } = {}) {
  const params = {
    printerName,
    printWidth: LABEL_W_MM * 100,
    printHeight: LABEL_H_MM * 100,
    scaleUnit: 1,
    threshold,
    jobName: "dtpweb",
  };
  const j = await lpapi(base, "PrintImageD", params, dataUrl, "application/octet-stream;encoding=base64", 60000);
  return j?.statusCode === 0;
}

// ─── Per-PC settings (printer choice + rotation) ─────────────────────────────
const KEY = "unico.labelPrinter";
export function loadPrintSettings() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
export function savePrintSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}
