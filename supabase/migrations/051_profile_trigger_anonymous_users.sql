-- Anonymous sign-ins (mini-diagnosis "try before signup") have no email. The trigger from
-- 023 inserted lower(trim(new.email)) = NULL into profiles.email (unique not null), which
-- aborted the auth.users insert — Supabase returned 500 "Database error creating anonymous
-- user" and every logged-out visitor fell through to the login wall.
--
-- Use the same per-user placeholder as ensureProfileForAuthUser (src/lib/ensure-profile.ts);
-- /api/mini-diagnosis/claim overwrites it with the real email when the user converts.

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    tier,
    vip_granted_by_course,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(
      nullif(lower(trim(new.email)), ''),
      'anon-' || new.id::text || '@anonymous.det.local'
    ),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'avatar_url', '')), ''),
    'user',
    'free',
    false,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

  return new;
end;
$$;
