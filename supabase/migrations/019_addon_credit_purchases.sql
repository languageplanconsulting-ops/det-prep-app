create table public.addon_credit_purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('mock','feedback')),
  sku text not null,
  credits_granted integer not null check (credits_granted > 0),
  credits_used integer not null default 0 check (credits_used >= 0),
  amount integer not null check (amount >= 0),
  currency text not null default 'thb',
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','expired')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.addon_credit_purchases enable row level security;

create policy "Users read own addon purchases"
  on public.addon_credit_purchases
  for select
  using (auth.uid() = user_id);

create policy "Admins manage addon purchases"
  on public.addon_credit_purchases
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

create index idx_addon_credit_purchases_user
  on public.addon_credit_purchases(user_id, created_at desc);

create index idx_addon_credit_purchases_status
  on public.addon_credit_purchases(status, expires_at);
