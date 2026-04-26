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
    lower(trim(new.email)),
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

drop trigger if exists on_auth_user_created_create_profile on auth.users;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row
execute function public.handle_auth_user_profile();

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
select
  au.id,
  lower(trim(au.email)),
  nullif(trim(coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')), ''),
  nullif(trim(coalesce(au.raw_user_meta_data->>'avatar_url', '')), ''),
  'user',
  'free',
  false,
  coalesce(au.created_at, now()),
  now()
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null
  and au.email is not null
on conflict (id) do update
set
  email = excluded.email,
  full_name = coalesce(public.profiles.full_name, excluded.full_name),
  avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
  updated_at = now();
