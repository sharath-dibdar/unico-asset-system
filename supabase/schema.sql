-- ============================================================
-- UNICO Asset Intelligence System — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ─── Profiles ────────────────────────────────────────────────────────────────
-- Stores user records. Admin pre-creates these; auth_id is filled on first login.
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id     UUID        UNIQUE,           -- linked to auth.users.id after first login
  email       TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Helper: check if the calling user is an active admin ────────────────────
-- Defined after profiles exists, since this function body references it.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_id = auth.uid()
      AND role = 'admin'
      AND active = true
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read all profiles (needed for session display)
CREATE POLICY "Authenticated read profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

-- Admin can insert new profiles
CREATE POLICY "Admin insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- Admin can update any profile; a user can update their own (name only enforced by app)
CREATE POLICY "Admin update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin() OR auth_id = auth.uid());

-- Bootstrap: when no profiles exist yet, any authenticated user may insert their own
CREATE POLICY "Bootstrap first admin"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.profiles)
    AND auth_id = auth.uid()
  );


-- ─── Assets ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assets (
  id          TEXT        PRIMARY KEY,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read assets"   ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert assets"         ON public.assets FOR INSERT TO authenticated WITH CHECK (public.is_admin());
-- Any signed-in user can update assets: check-out/check-in changes status/assignTo
-- on the asset row itself, and that action isn't admin-restricted in the UI.
CREATE POLICY "Authenticated update assets" ON public.assets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete assets"         ON public.assets FOR DELETE TO authenticated USING (public.is_admin());


-- ─── Vendors ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendors (
  id          TEXT        PRIMARY KEY,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read vendors" ON public.vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage vendors"       ON public.vendors FOR ALL    TO authenticated USING (public.is_admin());


-- ─── Audits ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audits (
  id          TEXT        PRIMARY KEY,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read audits"   ON public.audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert audits"         ON public.audits FOR INSERT TO authenticated WITH CHECK (public.is_admin());
-- Any signed-in user can start/run/complete an audit (not admin-restricted in the UI).
CREATE POLICY "Authenticated update audits" ON public.audits FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete audits"         ON public.audits FOR DELETE TO authenticated USING (public.is_admin());


-- ─── Workstations ────────────────────────────────────────────────────────────
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
-- Any signed-in user can check a workstation in/out (updates assignTo/status only).
CREATE POLICY "Authenticated update workstations" ON public.workstations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete workstations"         ON public.workstations FOR DELETE TO authenticated USING (public.is_admin());


-- ─── Checkouts ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.checkouts (
  id          TEXT        PRIMARY KEY,
  data        JSONB       NOT NULL,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read checkouts"       ON public.checkouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert checkouts"     ON public.checkouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner or admin update checkouts"    ON public.checkouts FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admin delete checkouts"             ON public.checkouts FOR DELETE TO authenticated USING (public.is_admin());


-- ─── Device sessions ─────────────────────────────────────────────────────────
-- Tracks which device/browser each user logged in from. Admin can revoke.
CREATE TABLE IF NOT EXISTS public.device_sessions (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id  UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  data        JSONB       NOT NULL,   -- { browser, os, ua, screen, lang }
  revoked     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own or admin reads all sessions"
  ON public.device_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Insert own session"
  ON public.device_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner or admin update session"
  ON public.device_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admin delete session"
  ON public.device_sessions FOR DELETE TO authenticated
  USING (public.is_admin());


-- ─── Auto-update updated_at ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS assets_updated_at       ON public.assets;
DROP TRIGGER IF EXISTS audits_updated_at       ON public.audits;
DROP TRIGGER IF EXISTS checkouts_updated_at    ON public.checkouts;
DROP TRIGGER IF EXISTS workstations_updated_at ON public.workstations;

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER audits_updated_at
  BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER workstations_updated_at
  BEFORE UPDATE ON public.workstations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER checkouts_updated_at
  BEFORE UPDATE ON public.checkouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── Done ─────────────────────────────────────────────────────────────────────
-- Tables created: profiles, assets, vendors, audits, checkouts, device_sessions
-- RLS enabled on all tables.
-- First person to complete OTP login becomes admin automatically.
