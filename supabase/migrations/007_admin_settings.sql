-- Server-only key/value for admin-managed app settings (service role in API routes).
-- RLS enabled with no policies: authenticated clients cannot read/write; service role bypasses RLS.

create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_settings enable row level security;

comment on table public.admin_settings is 'Key-value settings updated by server-side admin APIs (e.g. Gemini text model).';
