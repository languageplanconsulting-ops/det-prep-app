create table if not exists public.speaking_partner_credit_locks (
  attempt_id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'charged')),
  charge_source text check (charge_source in ('plan', 'addon')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists speaking_partner_credit_locks_user_idx
  on public.speaking_partner_credit_locks(user_id, created_at desc);

alter table public.speaking_partner_credit_locks enable row level security;

create policy "Users manage own speaking partner credit locks"
on public.speaking_partner_credit_locks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
