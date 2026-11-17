// Renders the audit report email (HTML + plain text) and the CSV attachment.
// Pure function — no I/O — so it can be previewed and tested on its own.

export type Check = {
  assetId: string; assetCode?: string; assetName?: string; loc?: string;
  found: boolean | null; condition?: string; notes?: string; checkedAt?: string | null;
};
export type Audit = {
  id: string; name: string; status: string; dueDate?: string; scope?: string; scopeValue?: string;
  notes?: string; checklist?: Check[]; completedAt?: string; submittedAt?: string; submittedBy?: string;
};
export type Signer = { name: string; at: string };

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const csvCell = (s: unknown) => {
  let v = String(s ?? "");
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`; // stop spreadsheet apps running it as a formula
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

export function buildReport(audit: Audit, signers: Signer[], appUrl: string, tz: string) {
  const fmt = (d?: string | null, withTime = true) => d
    ? new Date(d).toLocaleString("en-IN", {
        timeZone: tz, day: "2-digit", month: "short", year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : "—";

  const items = audit.checklist ?? [];
  const total = items.length;
  const found = items.filter(c => c.found === true);
  const missing = items.filter(c => c.found === false);
  const unchecked = items.filter(c => c.found === null || c.found === undefined);
  const conditions = found.reduce<Record<string, number>>((m, c) => {
    const k = c.condition || "Not recorded";
    m[k] = (m[k] ?? 0) + 1;
    return m;
  }, {});
  const scope = audit.scope && audit.scope !== "all"
    ? `${audit.scope[0].toUpperCase()}${audit.scope.slice(1)}: ${audit.scopeValue || "—"}`
    : "All assets";

  const subject = `Audit signed off: ${audit.name} — ${found.length}/${total} found` +
    (missing.length ? `, ${missing.length} missing` : "");

  // ── HTML (inline styles; email clients ignore <style> blocks) ──
  const stat = (label: string, value: number, color: string) => `
    <td style="padding:14px 16px;border:1px solid #E9ECF1;border-radius:12px;background:#fff;width:25%">
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6B7280;font-weight:600">${label}</div>
      <div style="font-size:24px;font-weight:800;color:${color};margin-top:4px">${value}</div>
    </td>`;

  const row = (c: Check) => {
    const status = c.found === true ? `<span style="color:#059669;font-weight:700">Found</span>`
      : c.found === false ? `<span style="color:#DC2626;font-weight:700">Missing</span>`
      : `<span style="color:#9AA1AE">Not checked</span>`;
    return `<tr>
      <td style="padding:8px 10px;border-bottom:1px solid #E9ECF1"><b>${esc(c.assetName)}</b><br><span style="font-family:monospace;font-size:11px;color:#6B7280">${esc(c.assetCode)}</span></td>
      <td style="padding:8px 10px;border-bottom:1px solid #E9ECF1;color:#6B7280">${esc(c.loc || "—")}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #E9ECF1">${status}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #E9ECF1;color:#6B7280">${esc(c.condition || "—")}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #E9ECF1;color:#6B7280">${esc(c.notes || "—")}</td>
    </tr>`;
  };

  const table = (rows: Check[]) => `
    <table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;font-size:13px">
      <tr style="text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6B7280">
        <th style="padding:8px 10px;border-bottom:1px solid #E9ECF1">Asset</th>
        <th style="padding:8px 10px;border-bottom:1px solid #E9ECF1">Location</th>
        <th style="padding:8px 10px;border-bottom:1px solid #E9ECF1">Status</th>
        <th style="padding:8px 10px;border-bottom:1px solid #E9ECF1">Condition</th>
        <th style="padding:8px 10px;border-bottom:1px solid #E9ECF1">Notes</th>
      </tr>
      ${rows.map(row).join("")}
    </table>`;

  const html = `<!doctype html><html><body style="margin:0;background:#F3F5F8;font-family:Inter,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0F1115">
  <div style="max-width:720px;margin:0 auto;padding:24px 16px">
    <div style="background:#fff;border:1px solid #E9ECF1;border-radius:18px;overflow:hidden">
      <div style="height:6px;background:#FFD200"></div>
      <div style="padding:24px 24px 8px">
        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6B7280;font-weight:600">UNICO · Audit report</div>
        <h1 style="font-size:22px;margin:6px 0 4px">${esc(audit.name)}</h1>
        <div style="font-size:13px;color:#6B7280">${esc(scope)} · Due ${fmt(audit.dueDate, false)} · Completed ${fmt(audit.completedAt)}</div>
        ${audit.notes ? `<div style="font-size:13px;color:#6B7280;margin-top:8px">${esc(audit.notes)}</div>` : ""}
      </div>

      <div style="padding:16px 24px">
        <table cellspacing="8" cellpadding="0" style="width:100%;border-collapse:separate;margin:0 -8px"><tr>
          ${stat("In scope", total, "#0F1115")}
          ${stat("Found", found.length, "#059669")}
          ${stat("Missing", missing.length, missing.length ? "#DC2626" : "#0F1115")}
          ${stat("Not checked", unchecked.length, unchecked.length ? "#F59E0B" : "#0F1115")}
        </tr></table>
      </div>

      <div style="padding:4px 24px 16px">
        <div style="font-size:15px;font-weight:700;margin-bottom:6px">Signed off by</div>
        ${signers.map(s => `<div style="font-size:13px;padding:3px 0">✓ <b>${esc(s.name)}</b> <span style="color:#6B7280">— ${fmt(s.at)}</span></div>`).join("")}
        ${audit.submittedBy ? `<div style="font-size:12px;color:#9AA1AE;margin-top:6px">Checklist submitted by ${esc(audit.submittedBy)} on ${fmt(audit.submittedAt)}</div>` : ""}
      </div>

      ${Object.keys(conditions).length ? `
      <div style="padding:4px 24px 16px">
        <div style="font-size:15px;font-weight:700;margin-bottom:6px">Condition of found assets</div>
        <div style="font-size:13px;color:#374151">${Object.entries(conditions).map(([k, v]) => `${esc(k)}: <b>${v}</b>`).join(" &nbsp;·&nbsp; ")}</div>
      </div>` : ""}

      ${missing.length ? `
      <div style="padding:4px 24px 16px">
        <div style="font-size:15px;font-weight:700;margin-bottom:6px;color:#DC2626">Missing assets (${missing.length})</div>
        ${table(missing)}
      </div>` : ""}

      <div style="padding:4px 24px 24px">
        <div style="font-size:15px;font-weight:700;margin-bottom:6px">Full checklist (${total})</div>
        ${table(items)}
        <div style="margin-top:20px">
          <a href="${esc(appUrl)}" style="display:inline-block;background:#FFD200;color:#0F1115;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:10px">Open UNICO Assets</a>
        </div>
      </div>
    </div>
    <div style="font-size:11px;color:#9AA1AE;text-align:center;margin-top:14px">The full checklist is attached as a CSV. Sent to all active UNICO Assets users.</div>
  </div></body></html>`;

  const text = [
    `UNICO audit report — ${audit.name}`,
    `${scope} · Due ${fmt(audit.dueDate, false)} · Completed ${fmt(audit.completedAt)}`,
    ``,
    `In scope: ${total} · Found: ${found.length} · Missing: ${missing.length} · Not checked: ${unchecked.length}`,
    ``,
    `Signed off by:`,
    ...signers.map(s => `  ✓ ${s.name} — ${fmt(s.at)}`),
    ...(missing.length ? [``, `Missing assets:`, ...missing.map(c => `  ✗ ${c.assetCode ?? ""} ${c.assetName ?? ""} (${c.loc || "—"})${c.notes ? ` — ${c.notes}` : ""}`)] : []),
    ``,
    `Full checklist attached as CSV. Open the app: ${appUrl}`,
  ].join("\n");

  const csv = [
    ["Code", "Asset", "Location", "Status", "Condition", "Notes", "Checked at"].join(","),
    ...items.map(c => [
      c.assetCode, c.assetName, c.loc,
      c.found === true ? "Found" : c.found === false ? "Missing" : "Not checked",
      c.condition, c.notes, c.checkedAt ? fmt(c.checkedAt) : "",
    ].map(csvCell).join(",")),
  ].join("\r\n");

  const slug = audit.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "audit";
  return { subject, html, text, csv, csvName: `${slug}-audit-report.csv` };
}
