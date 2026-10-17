-- Keep the last few concrete instances of each repeated grammar mistake so a
-- report can say "last time you wrote ... " instead of only "N times".
-- Additive: older rows start with an empty list.
alter table public.production_weakness_history
  add column if not exists examples jsonb not null default '[]'::jsonb;

create or replace function public.record_production_weakness(
  p_user_id uuid,
  p_topics jsonb,
  p_scope_filter text,
  p_surface text,
  p_attempt_id text,
  p_clean_streak_limit integer
) returns void
language plpgsql
as $$
declare
  v_keys text[];
begin
  if exists (
    select 1 from public.production_weakness_history
     where user_id = p_user_id and last_attempt_id = p_attempt_id
  ) then
    return;
  end if;

  select coalesce(array_agg(t->>'topicKey'), '{}'::text[])
    into v_keys
    from jsonb_array_elements(coalesce(p_topics, '[]'::jsonb)) as t;

  insert into public.production_weakness_history (
    user_id, topic_key, topic_en, topic_th, scope,
    occurrence_count, clean_streak, last_surface, last_attempt_id, examples
  )
  select
    p_user_id, t->>'topicKey', t->>'topicEn', t->>'topicTh', t->>'scope',
    1, 0, p_surface, p_attempt_id,
    case when jsonb_typeof(t->'example') = 'object'
         then jsonb_build_array(t->'example') else '[]'::jsonb end
  from jsonb_array_elements(coalesce(p_topics, '[]'::jsonb)) as t
  on conflict (user_id, topic_key) do update set
    occurrence_count = public.production_weakness_history.occurrence_count + 1,
    clean_streak = 0,
    topic_en = excluded.topic_en,
    topic_th = excluded.topic_th,
    scope = excluded.scope,
    last_seen_at = now(),
    last_surface = excluded.last_surface,
    last_attempt_id = excluded.last_attempt_id,
    -- Newest first, capped at 3.
    examples = (
      select coalesce(jsonb_agg(e order by i), '[]'::jsonb)
        from (
          select e, i
            from jsonb_array_elements(
                   excluded.examples || public.production_weakness_history.examples
                 ) with ordinality as x(e, i)
           order by i
           limit 3
        ) s
    ),
    updated_at = now();

  update public.production_weakness_history
     set clean_streak = clean_streak + 1,
         updated_at = now()
   where user_id = p_user_id
     and clean_streak < p_clean_streak_limit
     and not (topic_key = any (v_keys))
     and (p_scope_filter is null or scope = p_scope_filter);
end;
$$;
