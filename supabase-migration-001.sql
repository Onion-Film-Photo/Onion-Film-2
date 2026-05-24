-- Run this in your Supabase SQL editor to apply the photo visibility feature
-- and update the default shots_per_guest from 10 to 27

ALTER TABLE events
  ALTER COLUMN shots_per_guest SET DEFAULT 27;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS photo_visibility    text NOT NULL DEFAULT 'after_event'
    CHECK (photo_visibility IN ('immediately', 'after_event', 'after_date')),
  ADD COLUMN IF NOT EXISTS photo_visible_after timestamptz;
