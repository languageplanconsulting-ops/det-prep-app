-- Teacher ("พี่ดอย") model-answer videos for speaking questions.
-- Video bytes live in a private Supabase Storage bucket; this table holds metadata
-- + subtitle cues. Visible only to active VIP / VIP Fast Track students.

create table if not exists public.speaking_samples (
  id uuid primary key default gen_random_uuid(),
  -- Which surface the sample is attached to + the stable id within that surface.
  target_kind text not null check (target_kind in (
    'standalone_read_then_speak',
    'standalone_speak_about_photo',
    'standalone_interactive_speaking',
    'mock_fixed_item'
  )),
  target_ref text not null,
  question_type text not null check (question_type in (
    'read_then_speak',
    'speak_about_photo',
    'interactive_speaking'
  )),
  storage_path text not null,            -- object path inside the speaking-samples bucket
  mime text not null,
  duration_ms integer,
  subtitle_cues jsonb not null default '[]'::jsonb,  -- [{ text, startMs, endMs }]
  title text,
  notes text,
  status text not null default 'uploading' check (status in (
    'uploading','ready','failed'
  )),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists speaking_samples_target_idx
  on public.speaking_samples (target_kind, target_ref, created_at desc);

alter table public.speaking_samples enable row level security;

-- Admin full control.
drop policy if exists "Admins manage speaking samples" on public.speaking_samples;
create policy "Admins manage speaking samples"
  on public.speaking_samples for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- VIP (incl. Duolingo Fast Track) may read READY samples.
-- Mirrors resolveEffectiveTierFromProfile: tier='vip' AND
-- (course-granted with no expiry OR a still-valid expiry date).
drop policy if exists "VIP read speaking samples" on public.speaking_samples;
create policy "VIP read speaking samples"
  on public.speaking_samples for select
  using (
    status = 'ready'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.tier = 'vip'
        and (
          (p.vip_granted_by_course = true and p.tier_expires_at is null)
          or (p.tier_expires_at is not null and p.tier_expires_at > now())
        )
    )
  );

-- Private bucket for the videos (served via short-lived signed URLs).
insert into storage.buckets (id, name, public)
values ('speaking-samples', 'speaking-samples', false)
on conflict (id) do nothing;

-- Admin can write/replace/delete objects in the bucket.
drop policy if exists "Admins write speaking sample objects" on storage.objects;
create policy "Admins write speaking sample objects"
  on storage.objects for all
  using (
    bucket_id = 'speaking-samples'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    bucket_id = 'speaking-samples'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- VIP can read objects directly (belt-and-suspenders; signed URLs are minted server-side).
drop policy if exists "VIP read speaking sample objects" on storage.objects;
create policy "VIP read speaking sample objects"
  on storage.objects for select
  using (
    bucket_id = 'speaking-samples'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.tier = 'vip'
        and (
          (p.vip_granted_by_course = true and p.tier_expires_at is null)
          or (p.tier_expires_at is not null and p.tier_expires_at > now())
        )
    )
  );
