-- ============================================================
-- Migration 005 — Audit sign-off by approvers + emailed report
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to run more than once.
-- ============================================================
--
-- WHAT THIS DOES
-- --------------
-- An audit is no longer "completed" when the checklist is finished.
-- Finishing the checklist moves it to "awaiting_signoff"; it becomes
-- "completed" only when EVERY approver (profiles.audit_approver = true)
-- has signed off. Then the app emails the audit report to all active
-- users through the send-audit-report Edge Function.
--
-- Sign-offs live in their own table rather than inside the audit's JSON,
-- because any signed-in user can edit audit JSON. The rules below are
-- enforced by the database, so they hold even if someone bypasses the UI:
--   • only an approver can sign, only for themselves, only while the
--     audit is awaiting sign-off, and only once;
--   • an audit can't be marked completed until every approver has signed;
--   • results are locked while awaiting sign-off, and final once completed;
--   • only an admin can reopen an audit awaiting sign-off, which clears
--     the sign-offs so the corrected results get signed again;
--   • users can't grant themselves approver (or admin) rights.
--
-- AFTER RUNNING: make sure both approvers are ticked in
-- Users & Access → Edit user → "Audit approver". Sharath is set below;
-- set Manu there (or uncomment the line in step 1 with Manu's email).


-- ─── 1. Who must sign off ─────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS audit_approver BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles SET audit_approver = true
WHERE lower(email) = 'sharath@unicographix.com';
-- UPDATE public.profiles SET audit_approver = true WHERE lower(email) = 'manu@REPLACE-WITH-MANUS-EMAIL';


-- ─── 2. Report delivery bookkeeping ──────────────────────────────────────────
-- Columns (not JSON) so the Edge Function can claim a send atomically and a
-- stale copy of the audit saved by a client can't erase them.
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS report_sent_at    TIMESTAMPTZ;
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS report_recipients INTEGER;


-- ─── 3. Sign-offs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_signoffs (
  audit_id    TEXT        NOT NULL REFERENCES public.audits(id)   ON DELETE CASCADE,
  profile_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (audit_id, profile_id)
);

ALTER TABLE public.audit_signoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read audit signoffs" ON public.audit_signoffs;
CREATE POLICY "Authenticated read audit signoffs"
  ON public.audit_signoffs FOR SELECT TO authenticated USING (true);

-- An approver signs for themselves, only while the audit awaits sign-off.
-- No UPDATE/DELETE policies: a signature can't be edited or withdrawn from
-- the app. Reopening an audit (admin) clears them via the trigger in step 6.
DROP POLICY IF EXISTS "Approver signs own" ON public.audit_signoffs;
CREATE POLICY "Approver signs own"
  ON public.audit_signoffs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id
        AND p.auth_id = auth.uid()
        AND p.audit_approver
        AND p.active
    )
    AND EXISTS (
      SELECT 1 FROM public.audits a
      WHERE a.id = audit_id
        AND a.data->>'status' = 'awaiting_signoff'
    )
  );


-- ─── 4. Has every current approver signed? ───────────────────────────────────
-- False when there are no approvers at all, so an audit can never complete
-- with nobody having signed it.
CREATE OR REPLACE FUNCTION public.audit_fully_signed(p_audit_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE audit_approver AND active)
     AND NOT EXISTS (
       SELECT 1 FROM profiles p
       WHERE p.audit_approver AND p.active
         AND NOT EXISTS (
           SELECT 1 FROM audit_signoffs s
           WHERE s.audit_id = p_audit_id AND s.profile_id = p.id
         )
     );
$$;


-- ─── 5. The last sign-off completes the audit ────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_signoff_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lock the audit so two approvers signing at the same moment are
  -- serialised: whoever goes second sees the first one's signature and
  -- completes the audit, instead of both seeing only their own.
  PERFORM 1 FROM audits WHERE id = NEW.audit_id FOR UPDATE;

  IF audit_fully_signed(NEW.audit_id) THEN
    UPDATE audits
       SET data = data || jsonb_build_object('status', 'completed', 'completedAt', to_jsonb(NOW()))
     WHERE id = NEW.audit_id
       AND data->>'status' = 'awaiting_signoff';
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS audit_signoff_complete ON public.audit_signoffs;
CREATE TRIGGER audit_signoff_complete
  AFTER INSERT ON public.audit_signoffs
  FOR EACH ROW EXECUTE FUNCTION public.audit_signoff_complete();


-- ─── 6. Guard audit status changes ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audits_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_st TEXT := OLD.data->>'status';
  new_st TEXT := NEW.data->>'status';
BEGIN
  -- Completed audits are final: a client saving an older copy can't change
  -- the status, the results, or when it was completed.
  IF old_st = 'completed' THEN
    NEW.data := NEW.data || jsonb_build_object(
      'status',      OLD.data->'status',
      'completedAt', OLD.data->'completedAt',
      'checklist',   OLD.data->'checklist'
    );
    RETURN NEW;
  END IF;

  IF new_st = 'completed' AND NOT audit_fully_signed(OLD.id) THEN
    RAISE EXCEPTION 'This audit needs sign-off from every approver before it can be completed.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF old_st = 'awaiting_signoff' THEN
    -- The results being signed can't change underneath the approvers.
    IF new_st = 'awaiting_signoff'
       AND NEW.data->'checklist' IS DISTINCT FROM OLD.data->'checklist' THEN
      RAISE EXCEPTION 'Audit results are locked while awaiting sign-off. An admin must reopen the audit to change them.'
        USING ERRCODE = 'check_violation';
    END IF;

    -- Reopening: admin only, and every existing signature is cleared.
    IF new_st IS DISTINCT FROM 'awaiting_signoff' AND new_st IS DISTINCT FROM 'completed' THEN
      IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only an admin can reopen an audit that is awaiting sign-off.'
          USING ERRCODE = 'insufficient_privilege';
      END IF;
      DELETE FROM audit_signoffs WHERE audit_id = OLD.id;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS audits_guard ON public.audits;
CREATE TRIGGER audits_guard
  BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.audits_guard();


-- ─── 7. Users can't promote themselves ───────────────────────────────────────
-- The profiles UPDATE policy lets users update their own row (needed for
-- first-login linking), which also let them change their own role. Without
-- this, anyone could make themselves an approver — or an admin — and the
-- sign-off rule would mean nothing. Admins, and the SQL Editor/service
-- role (no auth.uid()), can still change these fields.
CREATE OR REPLACE FUNCTION public.profiles_guard_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_admin() THEN
    NEW.role           := OLD.role;
    NEW.audit_approver := OLD.audit_approver;
    NEW.active         := OLD.active;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_guard_privileges ON public.profiles;
CREATE TRIGGER profiles_guard_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_privileges();


-- ─── 8. Keep these internal ──────────────────────────────────────────────────
-- Supabase exposes public-schema functions over the REST API (/rpc). These
-- run only from triggers (Postgres doesn't check EXECUTE when a trigger
-- fires), so nobody needs to call them directly.
REVOKE EXECUTE ON FUNCTION public.audit_signoff_complete()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audits_guard()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_privileges() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_fully_signed(TEXT)    FROM PUBLIC, anon, authenticated;


-- ─── Done ────────────────────────────────────────────────────────────────────
-- Check the approvers:
--   SELECT name, email, audit_approver FROM public.profiles WHERE active ORDER BY name;
--
-- Audits completed before this migration keep their "completed" status.
-- They have no sign-offs, so no report is emailed for them.
