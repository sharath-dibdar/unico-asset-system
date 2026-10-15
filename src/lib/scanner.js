// ─── Code scanning: camera (QR + 1D barcodes) and hardware scanners ─────────
import { useEffect, useRef } from "react";

// QR plus the common 1D symbologies: our Code 128 labels, and manufacturer
// serial / product barcodes (Code 39, EAN/UPC, ITF).
const FORMATS = ["qr_code", "code_128", "code_39", "code_93", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "data_matrix"];

let detectorPromise;

// Returns a BarcodeDetector. Uses the browser's native one when it supports
// our formats (Android Chrome — fast, ML-based); otherwise lazily loads the
// ZXing WebAssembly decoder (iPhone, desktop), served from this site.
export function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      if ("BarcodeDetector" in window) {
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats();
          const formats = FORMATS.filter(f => supported.includes(f));
          if (formats.includes("qr_code") && formats.includes("code_128")) return new window.BarcodeDetector({ formats });
        } catch { /* fall through to WASM */ }
      }
      const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
        import("barcode-detector/ponyfill"),
        import("zxing-wasm/reader/zxing_reader.wasm?url"),
      ]);
      prepareZXingModule({
        overrides: { locateFile: (path, prefix) => (path.endsWith(".wasm") ? wasmUrl : prefix + path) },
        fireImmediately: true,
      });
      return new BarcodeDetector({ formats: FORMATS });
    })().catch(e => { detectorPromise = undefined; throw e; });
  }
  return detectorPromise;
}

// Find the asset a scanned value refers to: our asset code first, then the
// manufacturer serial number (so the maker's own barcode sticker works too).
export function findAssetByScan(assets, raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (!v) return null;
  return assets.find(a => a.code?.toLowerCase() === v)
      || assets.find(a => a.serial && a.serial !== "N/A" && a.serial.trim().toLowerCase() === v)
      || null;
}

// USB / Bluetooth barcode scanners act as keyboards: they "type" the code very
// fast and press Enter. This hook spots that pattern anywhere on the page
// (ignoring normal typing in inputs) and calls onScan(code).
export function useScannerWedge(onScan, enabled = true) {
  const cb = useRef(onScan);
  useEffect(() => { cb.current = onScan; }, [onScan]);
  useEffect(() => {
    if (!enabled) return;
    let buf = "", last = 0;
    const onKey = e => {
      const t = e.target;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (typing) return; // form fields (incl. the scan box) handle their own input
      const now = performance.now();
      if (now - last > 60) buf = "";              // human typing is slower than this between keys
      last = now;
      if (e.key === "Enter") {
        if (buf.length >= 4) { e.preventDefault(); const code = buf; buf = ""; cb.current(code); }
        buf = "";
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buf += e.key;
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [enabled]);
}
