-- VIP COURSE GRANTS
create table public.vip_course_grants (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  granted_at timestamptz default now(),
  granted_by uuid references public.profiles(id),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id),
  is_active boolean default true,
  notes text,
  created_at timestamptz default now()
);

-- INDEX for fast email lookup on signup
create index idx_vip_grants_email
  on public.vip_course_grants(email)
  where is_active = true;

alter table public.vip_course_grants enable row level security;

create policy "Admins can read vip_course_grants"
  on public.vip_course_grants
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "Admins can insert vip_course_grants"
  on public.vip_course_grants
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "Admins can update vip_course_grants"
  on public.vip_course_grants
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "Admins can delete vip_course_grants"
  on public.vip_course_grants
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );
