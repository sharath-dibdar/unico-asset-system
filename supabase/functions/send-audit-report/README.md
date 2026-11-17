# send-audit-report

Emails an audit's report to every active user once all audit approvers have
signed it off. The app calls it automatically after the last signature; an
admin can also send or resend from the audit page.

## Setup (in this order)

1. **Database** — run `supabase/migration_005_audit_signoffs.sql` in the
   Supabase SQL Editor.
2. **Approvers** — in the app, Users & Access → Edit user → tick
   *Audit approver* for each person who must sign (Sharath is pre-set by the
   migration).
3. **Email** — create a [Resend](https://resend.com) account, verify the
   sending domain (we use `uais.unicographix.com`), and create an API key.
   On Hostinger, `uais.unicographix.com` has its own DNS zone: add Resend's
   records in THAT zone with the names Resend shows minus the `.uais`
   suffix, or they won't resolve. The sender address in AUDIT_REPORT_FROM
   must use the verified domain.
4. **Deploy the function** (needs `npx supabase login` once):

   ```bash
   npx supabase secrets set --project-ref <ref> \
     RESEND_API_KEY=re_xxx \
     AUDIT_REPORT_FROM="Unico Assets <assets@uais.unicographix.com>"
   npx supabase functions deploy send-audit-report --project-ref <ref>
   ```

   `<ref>` is the project ID in your Supabase URL (`https://<ref>.supabase.co`).
   Optional secrets: `APP_URL` (default `https://uais.unicographix.com`),
   `AUDIT_TZ` (default `Asia/Kolkata`).
5. **Front end** — deploy the app last. Before steps 1–4 are done, submitted
   audits would wait for sign-offs that can't be recorded.

## What it sends

One email to all active users: totals (found / missing / not checked), who
signed and when, condition breakdown, missing assets, the full checklist, and
the checklist as a CSV attachment. `report.ts` renders it and has no I/O, so
it can be previewed locally.

## Safety

- Sends only for a `completed` audit that has sign-offs.
- Claims the send in the database first (`audits.report_sent_at`), so two
  approvers finishing together produce one email. If sending fails, the claim
  is released so it can be retried.
- Resending is admin-only.
