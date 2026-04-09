-- If you get "syntax error at or near supabase" you pasted the PATH (e.g. supabase/...sql).
-- Open this file in your code editor, copy the SQL statements below, paste into Supabase SQL Editor.
-- Do NOT type or paste the filename as line 1.
--
-- Creates public.vip_course_grants WITHOUT requiring public.profiles to exist first
-- (no foreign keys). Your Next.js API uses the service role key, which bypasses RLS.
--
-- After you add public.profiles (e.g. run supabase/migrations/001_initial_schema.sql),
-- you can optionally add FKs:
--   ALTER TABLE public.vip_course_grants
--     ADD CONSTRAINT vip_course_grants_granted_by_fkey
--     FOREIGN KEY (granted_by) REFERENCES public.profiles(id);
--   (same for revoked_by)

CREATE TABLE IF NOT EXISTS public.vip_course_grants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid,
  revoked_at timestamptz,
  revoked_by uuid,
  is_active boolean DEFAULT true NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.vip_course_grants
  ADD COLUMN IF NOT EXISTS grant_expires_at timestamptz;

COMMENT ON COLUMN public.vip_course_grants.grant_expires_at IS
  'When set, course VIP access ends at this time (mirrored to profiles.tier_expires_at). Null = no grant-level expiry.';

CREATE INDEX IF NOT EXISTS idx_vip_grants_email
  ON public.vip_course_grants (email)
  WHERE is_active = true;

-- RLS: no policies = deny for anon/authenticated JWT. Service role (server) bypasses RLS.
ALTER TABLE public.vip_course_grants ENABLE ROW LEVEL SECURITY;

-- Drop old policies if you ran an earlier version that referenced profiles
DROP POLICY IF EXISTS "Admins can read vip_course_grants" ON public.vip_course_grants;
DROP POLICY IF EXISTS "Admins can insert vip_course_grants" ON public.vip_course_grants;
DROP POLICY IF EXISTS "Admins can update vip_course_grants" ON public.vip_course_grants;
DROP POLICY IF EXISTS "Admins can delete vip_course_grants" ON public.vip_course_grants;
