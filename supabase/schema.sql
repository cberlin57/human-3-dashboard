-- Run once in the Supabase SQL editor.
create table if not exists kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
-- Only the server (service role key) touches this table.
alter table kv enable row level security;
