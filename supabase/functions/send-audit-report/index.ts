// send-audit-report — emails a signed-off audit's report to every active user.
//
// Called by the app right after the last approver signs (and by an admin's
// "Resend report" button). It only sends for an audit that is completed AND
// has sign-offs, and it claims the send in the database first, so two
// approvers finishing at the same moment can't produce two emails.
//
// Secrets (Supabase Dashboard → Edge Functions → Secrets, or `supabase secrets set`):
//   RESEND_API_KEY     API key from https://resend.com (domain uais.unicographix.com verified)
//   AUDIT_REPORT_FROM  e.g. "Unico Assets <assets@uais.unicographix.com>" (must be on the Resend-verified domain)
//   APP_URL            optional, default https://uais.unicographix.com
//   AUDIT_TZ           optional, default Asia/Kolkata
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
//
// Deploy:  npx supabase functions deploy send-audit-report --project-ref <ref>

import { createClient } from "jsr:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

import { buildReport, type Audit, type Signer } from "./report.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const FROM = Deno.env.get("AUDIT_REPORT_FROM");
  const APP_URL = Deno.env.get("APP_URL") ?? "https://uais.unicographix.com";
  const TZ = Deno.env.get("AUDIT_TZ") ?? "Asia/Kolkata";
  if (!RESEND_API_KEY || !FROM) {
    return json({ error: "email_not_configured", message: "Set the RESEND_API_KEY and AUDIT_REPORT_FROM secrets." }, 500);
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // ── Caller must be a signed-in, active user ───────────────────────────────
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = await db.auth.getUser(jwt);
  if (!user) return json({ error: "unauthorized" }, 401);
  const { data: caller } = await db.from("profiles").select("id, role, active").eq("auth_id", user.id).maybeSingle();
  if (!caller?.active) return json({ error: "forbidden" }, 403);

  let body: { auditId?: unknown; resend?: unknown };
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const auditId = typeof body.auditId === "string" ? body.auditId : null;
  const resend = body.resend === true;
  if (!auditId) return json({ error: "bad_request", message: "auditId is required" }, 400);
  if (resend && caller.role !== "admin") return json({ error: "forbidden", message: "Only an admin can resend a report." }, 403);

  // ── Only signed-off, completed audits get a report ───────────────────────
  const { data: row } = await db.from("audits").select("id, data, report_sent_at").eq("id", auditId).maybeSingle();
  if (!row) return json({ error: "not_found" }, 404);
  const audit = row.data as Audit;
  if (audit.status !== "completed") return json({ error: "not_completed" }, 409);

  const { data: signoffs } = await db.from("audit_signoffs")
    .select("profile_id, signed_at").eq("audit_id", auditId).order("signed_at");
  if (!signoffs?.length) return json({ error: "not_signed_off" }, 409);

  // ── Claim the send (first caller wins) ───────────────────────────────────
  if (!resend) {
    const { data: claimed, error } = await db.from("audits")
      .update({ report_sent_at: new Date().toISOString() })
      .eq("id", auditId).is("report_sent_at", null).select("id");
    if (error) return json({ error: "claim_failed", message: error.message }, 500);
    if (!claimed?.length) return json({ status: "already_sent" });
  }
  const release = () => resend ? Promise.resolve() :
    db.from("audits").update({ report_sent_at: null }).eq("id", auditId);

  const { data: profiles } = await db.from("profiles").select("id, name, email, active");
  const people = profiles ?? [];
  const recipients = [...new Set(people.filter(p => p.active && p.email).map(p => String(p.email).toLowerCase()))];
  if (!recipients.length) { await release(); return json({ error: "no_recipients" }, 409); }

  const signers: Signer[] = signoffs.map(s => ({
    name: people.find(p => p.id === s.profile_id)?.name ?? "Unknown",
    at: s.signed_at,
  }));

  const report = buildReport(audit, signers, APP_URL, TZ);

  // ── Send (Resend allows 50 addresses per message) ────────────────────────
  for (let i = 0; i < recipients.length; i += 50) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: recipients.slice(i, i + 50),
        subject: report.subject,
        html: report.html,
        text: report.text,
        attachments: [{ filename: report.csvName, content: encodeBase64(new TextEncoder().encode(report.csv)) }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      if (i === 0) await release(); // nothing went out — allow a retry
      return json({ error: "send_failed", detail }, 502);
    }
  }

  await db.from("audits")
    .update({ report_sent_at: new Date().toISOString(), report_recipients: recipients.length })
    .eq("id", auditId);

  return json({ status: "sent", recipients: recipients.length });
});
