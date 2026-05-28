-- Migration 002: Video support (ONI-14)
-- Run this in your Supabase SQL editor after migration 001

-- Add video columns to events
alter table events
  add column video_enabled        bool not null default false,
  add column clips_per_guest      int  not null default 2 check (clips_per_guest between 1 and 5),
  add column clip_duration_seconds int  not null default 10 check (clip_duration_seconds in (5, 10, 15));

-- Videos table
create table videos (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid references events(id) on delete cascade not null,
  session_id       uuid references guest_sessions(id) on delete cascade not null,
  storage_path     text not null,
  duration_seconds int  not null,
  filter           text not null,
  created_at       timestamptz default now()
);

alter table videos enable row level security;
-- No permissive policies — service-role only (same as photos)

-- Storage bucket: event-videos (create manually in Supabase dashboard, set to private)
