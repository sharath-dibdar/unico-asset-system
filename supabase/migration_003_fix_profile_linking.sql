-- ============================================================
-- Migration 003 — Fix first-login profile linking (auth_id)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to run once against a database that already has schema.sql +
-- migration_002 applied.
-- ============================================================
--
-- WHY THIS EXISTS
-- ---------------
-- Admin pre-creates a profile row (email + role), and the app links the
-- Supabase auth UID to that row on the user's first login
-- (AuthContext.resolveProfile → db.profiles.update({ auth_id })).
--
-- But the only UPDATE policy on profiles was:
--     USING (public.is_admin() OR auth_id = auth.uid())
-- On a first login the user is not yet an admin in the DB (their auth_id
-- isn't linked yet) and the row's auth_id is still NULL, so BOTH branches
-- are false. The linking UPDATE matched zero rows and failed silently.
--
-- Consequence: every user except the bootstrap first-admin ended up with
-- auth_id = NULL in the database. is_admin() is keyed on auth_id, so those
-- users were never recognised as admins by RLS — their INSERTs into
-- assets / audits / vendors / workstations were rejected and vanished on
-- refresh, even though the app UI showed them as "Admin".


-- ─── 1. Backfill: link every unclaimed profile to its auth user by email ──────
-- Runs as the SQL Editor (service role), so it bypasses RLS. This repairs
-- existing accounts (e.g. Shirsho, Akshay, Vishnu) whose auth_id was never set.
UPDATE public.profiles p
SET    auth_id = u.id
FROM   auth.users u
WHERE  lower(u.email) = lower(p.email)
  AND  p.auth_id IS NULL;


-- ─── 2. New policy: let a first-time user claim their own profile by email ────
-- Allows the AuthContext linking UPDATE to succeed going forward: an
-- authenticated user may set auth_id on an as-yet-unclaimed profile row whose
-- email matches their verified login email, and only to their own uid.
DROP POLICY IF EXISTS "Claim own profile by email" ON public.profiles;
CREATE POLICY "Claim own profile by email"
  ON public.profiles FOR UPDATE TO authenticated
  USING      (auth_id IS NULL AND lower(email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (auth_id = auth.uid() AND lower(email) = lower(auth.jwt() ->> 'email'));


-- ─── Done ─────────────────────────────────────────────────────────────────────
-- After running this:
--   • existing users are linked (auth_id populated), so is_admin() works and
--     admins can add assets that persist;
--   • future first-time logins self-link automatically.
--
-- Verify with:
--   SELECT email, role, active, auth_id FROM public.profiles ORDER BY created_at;
-- Every active user should now have a non-NULL auth_id.
