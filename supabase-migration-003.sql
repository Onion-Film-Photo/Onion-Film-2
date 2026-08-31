-- Migration 003: Guest signup webhooks (ONI-27)
-- Run this in your Supabase SQL editor after migration 002

alter table events
  add column webhook_url text;
