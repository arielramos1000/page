-- Enable required extension for UUIDs (usually already enabled in Supabase)
create extension if not exists "pgcrypto";

create table if not exists public.lead_submissions (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    nome text not null,
    whatsapp text not null,
    cidade text not null,
    estado text not null,
    prompt_text text,
    kml_path text not null,
    kml_filename text not null,
    ip_address text,
    user_agent text
);

alter table public.lead_submissions enable row level security;

create table if not exists public.farm_page_leads (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    form_type text not null,
    nome text not null,
    telefone text not null,
    cidade text not null,
    estado text not null,
    page text not null default 'farm_page',
    ip_address text,
    user_agent text
);

alter table public.farm_page_leads enable row level security;

-- Storage bucket for KML uploads
insert into storage.buckets (id, name, public)
values ('kml-uploads', 'kml-uploads', false)
on conflict (id) do nothing;
