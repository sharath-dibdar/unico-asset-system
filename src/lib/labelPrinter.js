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
import JsBarcode from "jsbarcode";

const BASES = [
  "http://127.0.0.1:15216",
  "http://127.0.0.1:35216",
  "https://lht.d6688.cn:15217", // newer helpers serve HTTPS on a hostname that resolves to 127.0.0.1
  "https://lht.d6688.cn:35217",
];

export const LABEL_W_MM = 50;
export const LABEL_H_MM = 25;

// Supported label stock. QR needs height; Code 128 fits the 15 mm strip.
export const LABEL_SIZES = {
  qr50x25:  { w: 50, h: 25, kind: "qr",      label: "50 × 25 mm · QR" },
  bar50x15: { w: 50, h: 15, kind: "barcode", label: "50 × 15 mm · Barcode" },
};
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

// The DP27 head is 48 mm (384 dots) on 50 mm stock: ~1 mm each side never
// prints. Keep everything this far in from the 50 mm edges (~2.2 mm).
const SAFE_X = 18;
const SAFE_Y = 12;

// Thermal heads print dots, not greys. Canvas text is anti-aliased, and the
// printer's own threshold drops the grey edge pixels, so thin strokes break
// up. Snap to pure black/white here, leaning greys towards black, so text
// comes out solid — and the preview shows exactly what will print.
function toMonochrome(canvas, cutoff = 190) {
  const g = canvas.getContext("2d");
  const img = g.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = d[i + 3] < 128 || lum >= cutoff ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return canvas;
}

// 50×15 mm Code 128 label: barcode on top, code + name, then location · date
// and a small logo. Only 0°/180° make sense — the barcode needs the long edge.
async function renderBarcodeLabel({ name, code, location, purchaseDate }, rotation) {
  const W = Math.round(50 * PX_PER_MM), H = Math.round(15 * PX_PER_MM); // 400 × 120
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  g.imageSmoothingEnabled = false;

  // Bars: 2 dots (0.25 mm) per module; fall back to 1 dot for very long codes
  // so the bars stay inside the printable width with a quiet zone.
  const bars = document.createElement("canvas");
  const draw = moduleW => JsBarcode(bars, String(code || ""), { format: "CODE128", width: moduleW, height: 50, margin: 0, displayValue: false, background: "#ffffff", lineColor: "#000000" });
  draw(2);
  if (bars.width > W - 2 * (SAFE_X + 4)) draw(1);
  g.drawImage(bars, Math.round((W - bars.width) / 2), 4);

  const logo = await loadLogo();
  const left = SAFE_X, right = W - SAFE_X, inner = right - left;
  g.fillStyle = "#000"; g.textBaseline = "top";

  // Line 1: code left, name right
  let y = 60;
  g.font = `bold 20px ${SANS}`;
  const codeTxt = wrap(g, code, inner, 1)[0] || "";
  g.fillText(codeTxt, left, y);
  const used = g.measureText(codeTxt).width + 12;
  g.font = `bold 18px ${SANS}`;
  const nm = wrap(g, name, inner - used, 1)[0] || "";
  g.textAlign = "right"; g.fillText(nm, right, y + 1); g.textAlign = "left";

  // Line 2: location · date left, logo right
  y = 87;
  const logoH = logo ? 17 : 0, logoW = logoH * LOGO_RATIO;
  if (logo) g.drawImage(logo, right - logoW, y + 1, logoW, logoH);
  const meta = [location, labelDate(purchaseDate)].filter(Boolean).join(" · ");
  g.font = `bold 17px ${SANS}`;
  g.fillText(wrap(g, meta, inner - logoW - 10, 1)[0] || "", left, y);

  toMonochrome(c);
  if (rotation !== 180) return c.toDataURL("image/png");
  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  const o = out.getContext("2d");
  o.translate(W, H); o.rotate(Math.PI); o.drawImage(c, 0, 0);
  return out.toDataURL("image/png");
}

// Render one label to a PNG data URL at printer resolution.
// size: a LABEL_SIZES key. rotation (0/90/180/270) rotates the artwork within
// the label, for printers that feed the media sideways.
export async function renderLabel(data, rotation = 0, size = "qr50x25") {
  if (LABEL_SIZES[size]?.kind === "barcode") return renderBarcodeLabel(data, rotation === 180 ? 180 : 0);
  const { name, code, workstation, location, purchaseDate } = data;
  const W = Math.round(LABEL_W_MM * PX_PER_MM); // 400
  const H = Math.round(LABEL_H_MM * PX_PER_MM); // 200
  const portrait = rotation === 90 || rotation === 270;
  const cw = portrait ? H : W, ch = portrait ? W : H; // artwork box before rotation
  // Artwork x/y margins: the unprintable strips are on the label's 50 mm
  // edges, which become the artwork's top/bottom when rotated.
  const padX = portrait ? SAFE_Y : SAFE_X;
  const padY = portrait ? SAFE_X : SAFE_Y;

  // Artwork canvas
  const art = document.createElement("canvas");
  art.width = cw; art.height = ch;
  const a = art.getContext("2d");
  a.fillStyle = "#fff"; a.fillRect(0, 0, cw, ch);
  a.imageSmoothingEnabled = false;

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
  // Everything is bold Arial: thin strokes don't survive thermal printing.
  const textBlock = (x, top, width, s, align, draw) => {
    const nameF = Math.round(22 * s), codeF = Math.round(19 * s), metaF = Math.round(16 * s);
    const logoH = logo ? Math.round(26 * s) : 0;
    let y = top;
    const ax = align === "center" ? x + width / 2 : x;
    a.textAlign = align;
    if (logo) {
      const lw = logoH * LOGO_RATIO;
      if (draw) a.drawImage(logo, align === "center" ? x + (width - lw) / 2 : x, y, lw, logoH);
      y += logoH + Math.round(7 * s);
    }
    a.font = `bold ${nameF}px ${SANS}`;
    for (const l of wrap(a, name, width, 2)) { if (draw) a.fillText(l, ax, y); y += nameF * 1.15; }
    y += 3;
    a.font = `bold ${codeF}px ${SANS}`;
    if (draw) a.fillText(wrap(a, code, width, 1)[0] || "", ax, y);
    y += codeF * 1.15 + 4;
    a.font = `bold ${metaF}px ${SANS}`;
    for (const [label, value] of meta) {
      const line = wrap(a, `${label}: ${value}`, width, 1)[0] || "";
      if (draw) a.fillText(line, ax, y);
      y += metaF * 1.25;
    }
    return y - top;
  };
  const fit = (x, top, width, avail, align) => {
    let s = 1;
    while (s > 0.85 && textBlock(x, top, width, s, align, false) > avail) s -= 0.05;
    return s;
  };

  if (!portrait) {
    // QR left (~19 mm), logo + details right, vertically centred
    const qr = 150; // px ≈ 19 mm at 203 dpi
    a.drawImage(qrCanvas, padX, Math.round((ch - qr) / 2), qr, qr);
    const tx = padX + qr + 14;
    const tw = cw - tx - padX;
    const s = fit(tx, 0, tw, ch - padY * 2, "left");
    const h = textBlock(tx, 0, tw, s, "left", false);
    textBlock(tx, Math.max(padY, Math.round((ch - h) / 2)), tw, s, "left", true);
  } else {
    // Portrait artwork: QR top, logo + details below (centred)
    const qr = cw - padX * 2;
    a.drawImage(qrCanvas, padX, padY, qr, qr);
    const top = padY + qr + 10;
    const s = fit(padX, top, cw - padX * 2, ch - top - padY, "center");
    textBlock(padX, top, cw - padX * 2, s, "center", true);
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
  return toMonochrome(out).toDataURL("image/png");
}

// Print one rendered label. Returns true on success.
export async function printImage(base, printerName, dataUrl, { threshold = 128, size = "qr50x25" } = {}) {
  const dims = LABEL_SIZES[size] || LABEL_SIZES.qr50x25;
  const params = {
    printerName,
    printWidth: dims.w * 100,
    printHeight: dims.h * 100,
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
