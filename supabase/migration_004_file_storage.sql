-- ============================================================
-- Migration 004 — Move asset photos & documents to Supabase Storage
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to run more than once.
-- ============================================================
--
-- WHY THIS EXISTS
-- ---------------
-- Photos and documents (invoices, warranty cards) were stored as base64
-- inside each asset's JSONB row. Every app launch downloads the whole
-- assets table, so two ~1.5 MB PDFs made every launch a 3 MB download.
-- Files now live in a private Storage bucket; the asset row only keeps
-- the file's path, and a file is downloaded only when someone opens it.
--
-- This script only PREPARES storage and takes a backup. It does not move
-- any data. The move is done from the app (Users & Access → File storage)
-- after this has run, one asset at a time, verifying each upload before
-- the asset row is changed.


-- ─── 1. Safety backup of the assets table ─────────────────────────────────
-- A full copy taken before any file is moved. IF NOT EXISTS keeps the
-- first (pre-migration) copy if this script is run again.
-- RLS is enabled with no policies, so the copy is only reachable from the
-- SQL Editor, never through the app/API.
-- Restore (only if ever needed):
--   UPDATE public.assets a SET data = b.data
--   FROM public.assets_backup_20261015 b WHERE a.id = b.id;
-- Once you're happy everything works, you can drop it:
--   DROP TABLE public.assets_backup_20261015;
CREATE TABLE IF NOT EXISTS public.assets_backup_20261015 AS
  SELECT * FROM public.assets;
ALTER TABLE public.assets_backup_20261015 ENABLE ROW LEVEL SECURITY;


-- ─── 2. Private bucket for asset files (20 MB per file limit) ─────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('asset-files', 'asset-files', false, 20971520)
ON CONFLICT (id) DO NOTHING;


-- ─── 3. Access rules ──────────────────────────────────────────────────────
-- Signed-in users can view and upload asset files; only admins can delete.
DROP POLICY IF EXISTS "asset-files: authenticated read"   ON storage.objects;
DROP POLICY IF EXISTS "asset-files: authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "asset-files: admin delete"         ON storage.objects;

CREATE POLICY "asset-files: authenticated read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'asset-files');

CREATE POLICY "asset-files: authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'asset-files');

CREATE POLICY "asset-files: admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'asset-files' AND public.is_admin());


-- ─── 4. Check ─────────────────────────────────────────────────────────────
-- Should return one row for the bucket and the backup row count.
SELECT
  (SELECT count(*) FROM storage.buckets WHERE id = 'asset-files') AS bucket_ready,
  (SELECT count(*) FROM public.assets_backup_20261015)            AS assets_backed_up,
  (SELECT count(*) FROM public.assets)                            AS assets_live;
