-- Run this in your Supabase SQL editor

-- Events
create table events (
  id              uuid primary key default gen_random_uuid(),
  host_id         uuid references auth.users(id) on delete cascade not null,
  name            text not null,
  guest_limit     int not null check (guest_limit > 0),
  filter          text not null check (filter in ('natural','noir','golden_hour','dreamy','kodak_pop')),
  shots_per_guest int not null default 10 check (shots_per_guest > 0),
  qr_token        text unique not null,
  status          text not null default 'active' check (status in ('active','ended')),
  created_at      timestamptz default now()
);

-- Guest sessions (one per guest per event)
create table guest_sessions (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid references events(id) on delete cascade not null,
  email       text not null,
  phone       text not null,
  shots_taken int not null default 0,
  created_at  timestamptz default now(),
  unique(event_id, email)
);

-- Photos
create table photos (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid references events(id) on delete cascade not null,
  session_id   uuid references guest_sessions(id) on delete cascade not null,
  storage_path text not null,
  filter       text not null,
  created_at   timestamptz default now()
);

-- Row Level Security
alter table events enable row level security;
alter table guest_sessions enable row level security;
alter table photos enable row level security;

-- Hosts can only see/edit their own events
create policy "host_own_events" on events
  for all using (auth.uid() = host_id);

-- guest_sessions and photos: no direct client access (service-role only)
-- (no permissive policies = denied by default)

-- Storage bucket (create manually in Supabase dashboard or via CLI)
-- bucket name: event-photos, private
