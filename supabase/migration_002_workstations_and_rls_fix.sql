-- ============================================================
-- Migration 002 — Workstations + RLS fix for non-admin checkouts
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to run once against a database that already has schema.sql applied.
-- ============================================================


-- ─── Fix: assets/audits UPDATE was admin-only, blocking regular-user
--     check-out/check-in and audit start/run/complete actions ──────────────────
DROP POLICY IF EXISTS "Admin update assets" ON public.assets;
CREATE POLICY "Authenticated update assets" ON public.assets FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manage audits" ON public.audits;
CREATE POLICY "Admin insert audits"         ON public.audits FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Authenticated update audits" ON public.audits FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete audits"         ON public.audits FOR DELETE TO authenticated USING (public.is_admin());


-- ─── New: Workstations ────────────────────────────────────────────────────────
-- A bundle of assets (e.g. CPU + monitor + keyboard) assigned/checked out as one unit.
CREATE TABLE IF NOT EXISTS public.workstations (
  id          TEXT        PRIMARY KEY,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workstations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read workstations"   ON public.workstations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert workstations"         ON public.workstations FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Authenticated update workstations" ON public.workstations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete workstations"         ON public.workstations FOR DELETE TO authenticated USING (public.is_admin());

DROP TRIGGER IF EXISTS workstations_updated_at ON public.workstations;
CREATE TRIGGER workstations_updated_at
  BEFORE UPDATE ON public.workstations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
