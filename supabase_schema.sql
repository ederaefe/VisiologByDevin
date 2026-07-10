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
    status text not null default 'pending', -- pending, processing, validating, completed, needs_review, failed
    error_message text,
    extracted_data jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row-Level Security
alter table public.visiolog_scans enable row level security;

-- Create policy to allow all reads and writes
create policy "Allow public access to visiolog_scans" on public.visiolog_scans
    for all using (true) with check (true);


-- 3. Source of truth for extracted visitor records
create table if not exists public.visiolog_records (
    id uuid primary key default gen_random_uuid(),
    scan_id uuid not null references public.visiolog_scans(id) on delete cascade,
    name text,
    matric_number text,
    staff_id text,
    visitor_category text,
    department text,
    faculty text,
    hall text,
    phone_number text,
    parent_phone text,
    phone_brand text,
    phone_imei text,
    laptop_brand text,
    laptop_imei text,
    time_in text,
    time_out text,
    visit_date text,
    security_officer text,
    page_number text,
    row_index integer not null,
    confidence jsonb not null default '{}'::jsonb,
    overall_confidence numeric not null default 0,
    validation_status text not null,
    validation_errors jsonb not null default '[]'::jsonb,
    review_status text not null,
    ai_model_version text not null,
    raw_extra jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists visiolog_records_matric_number_idx
    on public.visiolog_records (matric_number);
create index if not exists visiolog_records_phone_imei_idx
    on public.visiolog_records (phone_imei);
create index if not exists visiolog_records_laptop_imei_idx
    on public.visiolog_records (laptop_imei);
create index if not exists visiolog_records_visit_date_idx
    on public.visiolog_records (visit_date);
create index if not exists visiolog_records_review_status_idx
    on public.visiolog_records (review_status);

alter table public.visiolog_records enable row level security;

create policy "Allow public access to visiolog_records" on public.visiolog_records
    for all using (true) with check (true);
