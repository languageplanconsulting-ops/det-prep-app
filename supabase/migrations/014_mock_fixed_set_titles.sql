alter table public.mock_fixed_sets
  add column if not exists internal_name text,
  add column if not exists user_title text;

update public.mock_fixed_sets
set internal_name = coalesce(internal_name, name),
    user_title = coalesce(user_title, name);

create unique index if not exists mock_fixed_sets_internal_name_unique
  on public.mock_fixed_sets (lower(internal_name));
