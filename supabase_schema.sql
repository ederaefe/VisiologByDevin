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

-- 2. Configurable logbook templates
create table if not exists public.logbook_templates (
    id uuid primary key default gen_random_uuid(),
    key text unique not null,
    name text not null,
    industry text not null,
    is_default boolean not null default false,
    fields jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.logbook_templates enable row level security;

create policy "Allow public access to logbook_templates" on public.logbook_templates
    for all using (true) with check (true);

insert into public.logbook_templates (key, name, industry, is_default, fields)
values
(
    'security_gate',
    'Security Gate / Visitor',
    'Security',
    true,
    '[
      {"key":"name","label":"Name","type":"name","required":true,"identity":true,"dedupe_key":false},
      {"key":"matric_number","label":"Matric Number","type":"text","required":false,"identity":true,"dedupe_key":true},
      {"key":"staff_id","label":"Staff ID","type":"text","required":false,"identity":true,"dedupe_key":false},
      {"key":"visitor_category","label":"Visitor Category","type":"text","required":false,"identity":false,"dedupe_key":false},
      {"key":"department","label":"Department","type":"text","required":false,"identity":false,"dedupe_key":false},
      {"key":"faculty","label":"Faculty","type":"text","required":false,"identity":false,"dedupe_key":false},
      {"key":"hall","label":"Hall of Residence","type":"text","required":false,"identity":false,"dedupe_key":false},
      {"key":"phone_number","label":"Phone Number","type":"phone","required":false,"identity":false,"dedupe_key":false},
      {"key":"parent_phone","label":"Parent/Guardian Number","type":"phone","required":false,"identity":false,"dedupe_key":false},
      {"key":"phone_brand","label":"Phone Brand","type":"text","required":false,"identity":false,"dedupe_key":false},
      {"key":"phone_imei","label":"Phone IMEI","type":"imei","required":false,"identity":false,"dedupe_key":true},
      {"key":"laptop_brand","label":"Laptop Brand","type":"text","required":false,"identity":false,"dedupe_key":false},
      {"key":"laptop_imei","label":"Laptop IMEI","type":"imei","required":false,"identity":false,"dedupe_key":false},
      {"key":"time_in","label":"Time In","type":"time","required":false,"identity":false,"dedupe_key":false},
      {"key":"time_out","label":"Time Out","type":"time","required":false,"identity":false,"dedupe_key":false},
      {"key":"visit_date","label":"Visit Date","type":"date","required":false,"identity":false,"dedupe_key":false},
      {"key":"security_officer","label":"Security Officer","type":"text","required":false,"identity":false,"dedupe_key":false},
      {"key":"page_number","label":"Page Number","type":"number","required":false,"identity":false,"dedupe_key":false}
    ]'::jsonb
),
(
    'classroom_attendance',
    'Classroom Attendance',
    'Education',
    false,
    '[
      {"key":"name","label":"Name","type":"name","required":true,"identity":true,"dedupe_key":false},
      {"key":"matric_number","label":"Matric Number","type":"text","required":false,"identity":true,"dedupe_key":true},
      {"key":"department","label":"Department","type":"text","required":false,"identity":false,"dedupe_key":false},
      {"key":"level","label":"Level","type":"number","required":false,"identity":false,"dedupe_key":false},
      {"key":"course_code","label":"Course Code","type":"text","required":false,"identity":false,"dedupe_key":false},
      {"key":"date","label":"Date","type":"date","required":true,"identity":false,"dedupe_key":false},
      {"key":"time_in","label":"Time In","type":"time","required":false,"identity":false,"dedupe_key":false},
      {"key":"time_out","label":"Time Out","type":"time","required":false,"identity":false,"dedupe_key":false}
    ]'::jsonb
),
(
    'hospital_registry',
    'Hospital Registry',
    'Healthcare',
    false,
    '[
      {"key":"visitor_name","label":"Visitor Name","type":"name","required":true,"identity":true,"dedupe_key":false},
      {"key":"patient_name","label":"Patient Name","type":"name","required":false,"identity":true,"dedupe_key":false},
      {"key":"patient_id","label":"Patient ID","type":"text","required":false,"identity":false,"dedupe_key":false},
      {"key":"ward","label":"Ward","type":"text","required":false,"identity":false,"dedupe_key":false},
      {"key":"relationship","label":"Relationship","type":"text","required":false,"identity":false,"dedupe_key":false},
      {"key":"phone_number","label":"Phone Number","type":"phone","required":false,"identity":false,"dedupe_key":true},
      {"key":"time_in","label":"Time In","type":"time","required":false,"identity":false,"dedupe_key":false},
      {"key":"time_out","label":"Time Out","type":"time","required":false,"identity":false,"dedupe_key":false},
      {"key":"visit_date","label":"Visit Date","type":"date","required":false,"identity":false,"dedupe_key":false}
    ]'::jsonb
)
on conflict (key) do nothing;

-- 3. Table for Asynchronous Ingestion Queue
create table if not exists public.visiolog_scans (
    id uuid primary key default gen_random_uuid(),
    filename text not null,
    template_id uuid references public.logbook_templates(id),
    status text not null default 'pending', -- pending, processing, validating, completed, needs_review, failed
    attempt_count integer not null default 0,
    last_attempt_at timestamp with time zone,
    next_retry_at timestamp with time zone,
    error_message text,
    extracted_data jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row-Level Security
alter table public.visiolog_scans enable row level security;

-- Create policy to allow all reads and writes
create policy "Allow public access to visiolog_scans" on public.visiolog_scans
    for all using (true) with check (true);


-- 4. Source of truth for extracted records
create table if not exists public.visiolog_records (
    id uuid primary key default gen_random_uuid(),
    scan_id uuid not null references public.visiolog_scans(id) on delete cascade,
    template_id uuid references public.logbook_templates(id),
    data jsonb not null,
    row_index integer not null,
    confidence jsonb not null default '{}'::jsonb,
    overall_confidence numeric not null default 0,
    validation_status text not null,
    validation_errors jsonb not null default '[]'::jsonb,
    review_status text not null, -- pending, needs_review, approved, rejected
    ai_model_version text not null,
    raw_extra jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists visiolog_records_data_idx
    on public.visiolog_records using gin (data);
create index if not exists visiolog_records_review_status_idx
    on public.visiolog_records (review_status);

alter table public.visiolog_records enable row level security;

create policy "Allow public access to visiolog_records" on public.visiolog_records
    for all using (true) with check (true);

-- 5. Human review audit trail
create table if not exists public.visiolog_record_audit (
    id uuid primary key default gen_random_uuid(),
    record_id uuid not null references public.visiolog_records(id) on delete cascade,
    scan_id uuid references public.visiolog_scans(id) on delete set null,
    action text not null,
    changes jsonb not null default '{}'::jsonb,
    actor text not null default 'admin',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists visiolog_record_audit_record_id_idx
    on public.visiolog_record_audit (record_id);

alter table public.visiolog_record_audit enable row level security;

create policy "Allow public access to visiolog_record_audit" on public.visiolog_record_audit
    for all using (true) with check (true);
