alter table public.profiles
add column if not exists ai_quota_mode text not null default 'default';

alter table public.profiles
add column if not exists ai_monthly_limit_override integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_ai_quota_mode_check'
  ) then
    alter table public.profiles
    add constraint profiles_ai_quota_mode_check
    check (ai_quota_mode in ('default', 'monthly_override'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_ai_monthly_limit_override_check'
  ) then
    alter table public.profiles
    add constraint profiles_ai_monthly_limit_override_check
    check (ai_monthly_limit_override is null or ai_monthly_limit_override >= 0);
  end if;
end
$$;
