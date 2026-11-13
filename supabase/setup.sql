-- ALittleCandleTestBuilder: one-time database setup.
-- In Supabase: SQL Editor → New query → paste all of this → Run.
-- Safe to run again; it won't erase anything.

-- Each person's questions (one row per question)
create table if not exists public.questions (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists questions_user_updated on public.questions (user_id, updated_at);

-- Each person's courses, test settings and current test
create table if not exists public.app_state (
  user_id    uuid        primary key default auth.uid() references auth.users(id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- The server sets the time of every change (so computers with wrong clocks still sync)
create or replace function public.alctb_touch() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists questions_touch on public.questions;
create trigger questions_touch before insert or update on public.questions
  for each row execute function public.alctb_touch();
drop trigger if exists app_state_touch on public.app_state;
create trigger app_state_touch before insert or update on public.app_state
  for each row execute function public.alctb_touch();

-- Everyone can only see and change their own rows
alter table public.questions enable row level security;
alter table public.app_state enable row level security;
drop policy if exists "own questions" on public.questions;
create policy "own questions" on public.questions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own state" on public.app_state;
create policy "own state" on public.app_state for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Pictures (diagrams, graphs). Each person uploads into their own folder.
-- File names are long random-looking codes, so they can't be guessed.
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;
drop policy if exists "alctb read own pictures" on storage.objects;
create policy "alctb read own pictures" on storage.objects for select to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "alctb add own pictures" on storage.objects;
create policy "alctb add own pictures" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "alctb update own pictures" on storage.objects;
create policy "alctb update own pictures" on storage.objects for update to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
