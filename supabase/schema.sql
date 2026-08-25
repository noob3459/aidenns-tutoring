-- Aidenn's Tutoring — booking requests table
-- Paste this whole file into the Supabase SQL Editor and run it once.

create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),

  parent_name text not null,
  student_name text not null,
  grade text not null,
  format text not null check (format in ('Online', 'In-Person')),

  -- Real ISO date for the requested session, plus a human-readable label
  -- ("Mon, Aug 25") kept alongside it so emails/UI don't have to reformat it.
  requested_date date not null,
  requested_date_label text not null,
  requested_time text not null,

  email text not null,
  phone text not null,
  notes text default '',

  -- Bookings start as requests. Nothing is auto-confirmed — update this
  -- column by hand in the Table Editor (or a future admin tool) once you've
  -- actually agreed on the time with the family.
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'completed')),

  created_at timestamptz not null default now(),

  -- One booking per date+time slot — the second person to request an
  -- already-taken slot gets a clean "that time was just taken" error
  -- instead of a silent double-booking.
  unique (requested_date, requested_time)
);

-- Speeds up the API's per-email rate-limit check (count recent requests
-- from the same email address).
create index if not exists bookings_email_created_idx
  on public.bookings (email, created_at desc);

-- Row Level Security is turned on and intentionally given ZERO policies.
-- That means the public "anon" key (the only key ever allowed near the
-- browser) can neither read nor write this table — full stop. Only the
-- "service_role" key, which lives exclusively in the Vercel serverless
-- function's environment variables and is never sent to the client, can
-- bypass RLS and touch this data.
alter table public.bookings enable row level security;
