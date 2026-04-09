-- Optional expiry for course VIP grants (e.g. Duolingo Fast Track 6-month access).
-- When set, copied to profiles.tier_expires_at on signup; access ends after this date.
alter table public.vip_course_grants
  add column if not exists grant_expires_at timestamptz;

comment on column public.vip_course_grants.grant_expires_at is
  'When set, course VIP access ends at this time (mirrored to profiles.tier_expires_at). Null = no grant-level expiry.';
