-- Client-callable admin promotion (no service role). Fixes cookie timing where
-- POST /api/auth/sync-admin-role ran before session cookies reached the server.

create or replace function public.claim_bootstrap_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  em text;
begin
  select au.email into em from auth.users au where au.id = auth.uid();
  if em is null then
    return;
  end if;
  if lower(trim(em)) <> lower(trim('languageplanconsulting@gmail.com')) then
    return;
  end if;

  insert into public.profiles (id, email, role, updated_at)
  values (
    auth.uid(),
    lower(trim(em)),
    'admin',
    now()
  )
  on conflict (id) do update
    set
      role = 'admin',
      email = excluded.email,
      updated_at = now();
end;
$$;

grant execute on function public.claim_bootstrap_admin() to authenticated;
