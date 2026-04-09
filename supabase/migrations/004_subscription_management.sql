-- PAYMENT HISTORY
create table public.payment_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id)
    on delete cascade,
  stripe_payment_intent_id text unique,
  stripe_invoice_id text,
  stripe_subscription_id text,
  amount integer not null,
  currency text default 'thb',
  status text check (status in (
    'succeeded','failed','refunded',
    'disputed','pending'
  )),
  tier text check (tier in (
    'free','basic','premium','vip'
  )),
  payment_method text,
  description text,
  receipt_url text,
  created_at timestamptz default now()
);

-- ADMIN ACTIONS LOG
create table public.admin_actions (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references public.profiles(id),
  target_user_id uuid references public.profiles(id),
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz default now()
);

-- SUBSCRIPTION NOTES (admin internal notes per user)
create table public.subscription_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id)
    on delete cascade,
  admin_id uuid references public.profiles(id),
  note text not null,
  created_at timestamptz default now()
);

alter table public.payment_history enable row level security;
alter table public.admin_actions enable row level security;
alter table public.subscription_notes enable row level security;

create policy "Admins manage payment_history"
  on public.payment_history
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins manage admin_actions"
  on public.admin_actions
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins manage subscription_notes"
  on public.subscription_notes
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create index idx_payment_history_user on public.payment_history(user_id);
create index idx_payment_history_created on public.payment_history(created_at desc);
create index idx_admin_actions_target on public.admin_actions(target_user_id, created_at desc);
create index idx_subscription_notes_user on public.subscription_notes(user_id, created_at desc);

create unique index payment_history_stripe_invoice_id_uidx
  on public.payment_history (stripe_invoice_id)
  where stripe_invoice_id is not null;
