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

// Unico logo (public/label-logo.svg, 1533×445), loaded once and reused.
let logoPromise;
function loadLogo() {
  if (!logoPromise) {
    logoPromise = new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // label still prints without it
      img.src = "/label-logo.svg";
    });
  }
  return logoPromise;
}
const LOGO_RATIO = 1533.25 / 444.86;

// "2023-04-05" → "05 Apr 2023"; blank when missing.
export function labelDate(d) {
  if (!d || d === "N/A") return "";
  const dt = new Date(d);
  return isNaN(dt) ? "" : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const SANS = "Arial, Helvetica, sans-serif";
const MONO = '"Courier New", Consolas, monospace';

// Render one 50×25 mm label to a PNG data URL at printer resolution.
// rotation (0/90/180/270) rotates the artwork within the label, for printers
// that feed the media sideways.
export async function renderLabel({ name, code, workstation, location, purchaseDate }, rotation = 0) {
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
  const [logo, qrCanvas] = await Promise.all([loadLogo(), (async () => {
    const c = document.createElement("canvas");
    await QRCode.toCanvas(c, String(code || ""), { margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
    return c;
  })()]);

  const meta = [
    ["Loc", location],
    ["Purchased", labelDate(purchaseDate)],
    ["WS", workstation],
  ].filter(([, v]) => v);

  a.fillStyle = "#000";
  a.textBaseline = "top";

  // Lay out the text block at scale s; returns its height, drawing only if `draw`.
  // Shrinks fonts in steps until everything fits the available height.
  const textBlock = (x, top, width, s, align, draw) => {
    const nameF = Math.round(21 * s), codeF = Math.round(18 * s), metaF = Math.round(15 * s);
    const logoH = logo ? Math.round(28 * s) : 0;
    let y = top;
    const ax = align === "center" ? x + width / 2 : x;
    a.textAlign = align;
    if (logo) {
      const lw = logoH * LOGO_RATIO;
      if (draw) a.drawImage(logo, align === "center" ? x + (width - lw) / 2 : x, y, lw, logoH);
      y += logoH + Math.round(8 * s);
    }
    a.font = `bold ${nameF}px ${SANS}`;
    for (const l of wrap(a, name, width, 2)) { if (draw) a.fillText(l, ax, y); y += nameF * 1.15; }
    y += 3;
    a.font = `bold ${codeF}px ${MONO}`;
    if (draw) a.fillText(wrap(a, code, width, 1)[0] || "", ax, y);
    y += codeF * 1.15 + 4;
    for (const [label, value] of meta) {
      a.font = `bold ${metaF}px ${SANS}`;
      const prefix = `${label}: `;
      const pw = a.measureText(prefix).width;
      a.font = `${metaF}px ${SANS}`;
      const rest = wrap(a, value, width - pw, 1)[0] || "";
      if (draw) {
        if (align === "center") {
          const full = pw + a.measureText(rest).width;
          const sx = x + (width - full) / 2;
          a.textAlign = "left";
          a.font = `bold ${metaF}px ${SANS}`; a.fillText(prefix, sx, y);
          a.font = `${metaF}px ${SANS}`;      a.fillText(rest, sx + pw, y);
          a.textAlign = align;
        } else {
          a.font = `bold ${metaF}px ${SANS}`; a.fillText(prefix, x, y);
          a.font = `${metaF}px ${SANS}`;      a.fillText(rest, x + pw, y);
        }
      }
      y += metaF * 1.25;
    }
    return y - top;
  };
  const fit = (x, top, width, avail, align) => {
    let s = 1;
    while (s > 0.7 && textBlock(x, top, width, s, align, false) > avail) s -= 0.05;
    return s;
  };

  if (!portrait) {
    // QR left (~19 mm), logo + details right, vertically centred
    const qr = 150; // px ≈ 19 mm at 203 dpi
    a.drawImage(qrCanvas, pad, Math.round((ch - qr) / 2), qr, qr);
    const tx = pad + qr + Math.round(1.8 * PX_PER_MM);
    const tw = cw - tx - pad;
    const s = fit(tx, 0, tw, ch - pad * 2, "left");
    const h = textBlock(tx, 0, tw, s, "left", false);
    textBlock(tx, Math.max(pad, Math.round((ch - h) / 2)), tw, s, "left", true);
  } else {
    // Portrait artwork: QR top, logo + details below (centred)
    const qr = cw - pad * 2;
    a.drawImage(qrCanvas, pad, pad, qr, qr);
    const top = pad + qr + 10;
    const s = fit(pad, top, cw - pad * 2, ch - top - pad, "center");
    textBlock(pad, top, cw - pad * 2, s, "center", true);
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
