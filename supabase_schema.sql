-- ==============================================================================
-- VISIOLOG Database Schema Definition
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Table for Main Spreadsheet Records (replaces JSONBin)
create table if not exists public.visiolog_data (
    key text primary key,
    value jsonb not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row-Level Security (optional, disable or add rules as needed)
alter table public.visiolog_data enable row level security;

-- Create policy to allow all reads and writes for simplicity in testing
create policy "Allow public access to visiolog_data" on public.visiolog_data
    for all using (true) with check (true);


-- 2. Table for Asynchronous Ingestion Queue
create table if not exists public.visiolog_scans (
    id uuid primary key default gen_random_uuid(),
    filename text not null,
    status text not null default 'pending', -- pending, processing, completed, failed
    error_message text,
    extracted_data jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row-Level Security
alter table public.visiolog_scans enable row level security;

-- Create policy to allow all reads and writes
create policy "Allow public access to visiolog_scans" on public.visiolog_scans
    for all using (true) with check (true);
