// ─── Asset photos & documents in Supabase Storage ────────────────────────────
// Files used to be stored inline (base64 data URLs) inside the asset row, so
// loading the asset list downloaded every attachment. They now live in the
// private "asset-files" bucket and the row keeps only a path:
//   photos:    "data:…" (legacy)            → { path, type, size }
//   documents: { name, type, data:"data:…" } → { name, type, path, size, uploadedAt }
// Both shapes are supported everywhere, so old rows keep working.
import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import { uid } from "../utils.js";

export const BUCKET = "asset-files";

const isDataUrl = v => typeof v === "string" && v.startsWith("data:");

// True if the asset still carries any file inline in its row.
export function hasInlineFiles(a) {
  return (a.photos || []).some(isDataUrl) || (a.documents || []).some(d => isDataUrl(d?.data));
}

function dataUrlToBlob(dataUrl) {
  const comma = dataUrl.indexOf(",");
  const head = dataUrl.slice(0, comma);
  const mime = head.match(/^data:([^;,]+)/)?.[1] || "application/octet-stream";
  const body = dataUrl.slice(comma + 1);
  if (!/;base64/.test(head)) return new Blob([decodeURIComponent(body)], { type: mime });
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const safeName = n => (n || "file").replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80);

// Upload, then confirm the stored object exists with the exact byte size.
// Throws if either step fails — callers then keep the file inline.
async function uploadVerified(path, blob) {
  const store = supabase.storage.from(BUCKET);
  const { error } = await store.upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw new Error(`Upload failed for ${path}: ${error.message}`);
  const dir = path.slice(0, path.lastIndexOf("/"));
  const file = path.slice(path.lastIndexOf("/") + 1);
  const { data, error: listErr } = await store.list(dir, { search: file, limit: 10 });
  const found = (data || []).find(o => o.name === file);
  if (listErr || !found) throw new Error(`Upload not found after writing ${path}`);
  const size = found.metadata?.size;
  if (typeof size === "number" && size !== blob.size) throw new Error(`Size mismatch for ${path}: ${size} ≠ ${blob.size}`);
}

// Return a copy of the asset with every inline file uploaded and replaced by
// its storage path. Returns the same object if nothing was inline. Throws on
// any failure without returning a partial result, so the caller can keep the
// original (inline) asset untouched.
export async function externalizeAttachments(asset) {
  if (!hasInlineFiles(asset)) return asset;
  const photos = [];
  for (const ph of asset.photos || []) {
    if (!isDataUrl(ph)) { photos.push(ph); continue; }
    const blob = dataUrlToBlob(ph);
    const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const path = `${asset.id}/photo-${uid()}.${ext}`;
    await uploadVerified(path, blob);
    photos.push({ path, type: blob.type, size: blob.size });
  }
  const documents = [];
  for (const d of asset.documents || []) {
    if (!isDataUrl(d?.data)) { documents.push(d); continue; }
    const blob = dataUrlToBlob(d.data);
    const path = `${asset.id}/${uid()}-${safeName(d.name)}`;
    await uploadVerified(path, blob);
    const { data: _inline, ...meta } = d; // eslint-disable-line no-unused-vars
    documents.push({ ...meta, type: meta.type || blob.type, path, size: blob.size });
  }
  return { ...asset, photos, documents };
}

// ─── Reading files ───────────────────────────────────────────────────────────
const urlCache = new Map(); // key → { url, exp }
const URL_TTL = 3600; // seconds

async function signedUrl(path, download) {
  const key = `${path}|${download || ""}`;
  const hit = urlCache.get(key);
  if (hit && hit.exp > Date.now() + 60_000) return hit.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, URL_TTL, download ? { download } : undefined);
  if (error || !data?.signedUrl) throw new Error(error?.message || "No signed URL");
  urlCache.set(key, { url: data.signedUrl, exp: Date.now() + URL_TTL * 1000 });
  return data.signedUrl;
}

// Resolve a photo (data URL string or {path}) or a document ({data} or {path})
// to something usable as an <img src> / <a href>.
export function useFileSrc(item, download) {
  const inline = isDataUrl(item) ? item : isDataUrl(item?.data) ? item.data : "";
  const path = !inline && typeof item === "object" ? item?.path : "";
  const [src, setSrc] = useState(inline);
  useEffect(() => {
    if (inline) { setSrc(inline); return; }
    if (!path) { setSrc(""); return; }
    let live = true;
    signedUrl(path, download).then(u => { if (live) setSrc(u); }).catch(() => { if (live) setSrc(""); });
    return () => { live = false; };
  }, [inline, path, download]);
  return src;
}

// <img> for a stored or inline photo; shows a neutral block while loading.
export function StoredImg({ item, alt = "", style, ...rest }) {
  const src = useFileSrc(item);
  if (!src) return <div aria-hidden="true" style={{ ...style, background: "#F1F3F7" }} />;
  return <img src={src} alt={alt} style={style} {...rest} />;
}

// Download link for a stored or inline document.
export function DocLink({ doc, style, children }) {
  const href = useFileSrc(doc, doc?.name || "document");
  if (!href) return <span style={{ ...style, opacity: 0.5 }}>{children}</span>;
  return <a href={href} download={doc?.name} target="_blank" rel="noopener noreferrer" style={style}>{children}</a>;
}

// Approximate size in KB for display (works for both shapes).
export const docSizeKB = d => Math.round((d?.size ?? (d?.data?.length || 0) * 0.75) / 1024);
