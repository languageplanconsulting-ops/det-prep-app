-- Paste into the Supabase SQL editor to deploy product feedback notes (one-question
-- qualitative prompt after the free mini-diagnosis). Idempotent / safe to re-run.

create table if not exists public.product_feedback_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  prompt_key text not null,
  response text not null,
  page_path text,
  created_at timestamptz not null default now()
);

create index if not exists product_feedback_notes_created_at_idx
  on public.product_feedback_notes (created_at desc);

alter table public.product_feedback_notes enable row level security;

-- Anonymous and signed-in users can submit their own feedback (or none, user_id null).
-- No select policy for regular users by design — this is insert-only from the client.
drop policy if exists "Users insert own product feedback notes" on public.product_feedback_notes;
create policy "Users insert own product feedback notes"
  on public.product_feedback_notes for insert
  with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()));

drop policy if exists "Admins read product feedback notes" on public.product_feedback_notes;
create policy "Admins read product feedback notes"
  on public.product_feedback_notes for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
