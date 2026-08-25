-- =====================================================================
-- Aidenn's Tutoring — full database schema
--
-- This file is both:
--   1. The complete schema for a brand-new Supabase project, and
--   2. A SAFE migration to paste into the EXISTING production project —
--      every statement is idempotent (`if not exists` / `or replace`),
--      and nothing here drops or destructively rewrites `bookings`.
--      Existing booking rows and their data are fully preserved.
--
-- Availability slots are never physically deleted once created. "Removing"
-- a slot in the admin UI archives it (`archived_at` set) — the row, and
-- any booking's reference to it, stays intact forever. See the
-- `availability_slots` and `claim_slot_and_book_v2` sections below.
--
-- PHASED ROLLOUT — this file is "migration one" and is PURELY ADDITIVE
-- with respect to functions: the legacy 11-parameter `claim_slot_and_book`
-- is left completely untouched (not dropped, not altered) so a currently
-- deployed frontend/API calling it keeps working without interruption.
-- The corrected logic lives entirely in a new `claim_slot_and_book_v2`
-- function instead. Once the new frontend/API (which calls
-- `claim_slot_and_book_v2`) is deployed and verified, run the separate
-- `supabase/cleanup-legacy-claim-function.sql` to remove the legacy
-- function. See that file's header for the full rollout order.
--
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- bookings — booking requests submitted through the public site.
-- (Unchanged from the original install; `if not exists` means this is a
-- no-op on the existing database — included so a fresh install gets the
-- same table.)
-- ---------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),

  parent_name text not null,
  student_name text not null,
  grade text not null,
  format text not null check (format in ('Online', 'In-Person')),

  requested_date date not null,
  requested_date_label text not null,
  requested_time text not null,

  email text not null,
  phone text not null,
  notes text default '',

  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'completed')),

  created_at timestamptz not null default now(),

  unique (requested_date, requested_time)
);

create index if not exists bookings_email_created_idx
  on public.bookings (email, created_at desc);

alter table public.bookings enable row level security;

-- ---------------------------------------------------------------------
-- site_settings — single-row table holding all editable site copy
-- (contact info, hero/page headings, footer, stats). Replaces the old
-- localStorage-only settings store — the public site and the admin
-- dashboard both read/write this through server-side API routes.
-- ---------------------------------------------------------------------
create table if not exists public.site_settings (
  id smallint primary key default 1,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

alter table public.site_settings enable row level security;

-- One-time seed: only inserts if the table is empty (fresh install or
-- first run of this migration). Safe to re-run — `on conflict do nothing`
-- means it will never overwrite settings an admin has already edited.
insert into public.site_settings (id, data)
values (1, '{
  "contact": {
    "phone": "(949) 795-7036",
    "phoneTel": "+19497957036",
    "email": "aidenn@aidennstutoring.org",
    "donateEmail": "donate@aidennstutoring.org",
    "serving": "Online nationwide & in-person locally",
    "hours": "Mon-Fri · 3:00-7:00 PM"
  },
  "hero": {
    "eyebrow": "K-9 Math Tutoring · 100% Free",
    "line1": "Premium Math Tutoring.",
    "line2": "Always Free.",
    "subtext": "One-on-one K-9 math tutoring from a certified educator, online or in person. No tuition, no hidden fees, ever."
  },
  "pages": {
    "services": { "eyebrow": "╱ Everything We Offer", "heading1": "Every grade,", "heading2": "one tutor.", "sub": "K-9 math, covered start to finish, online or in person, always at no cost." },
    "approach": { "eyebrow": "╱ How It Works", "heading1": "Three steps.", "heading2": "No surprises.", "sub": "From a two-minute intake to a confirmed weekly session, every step is free." },
    "contact": { "eyebrow": "╱ Get In Touch", "heading1": "Let’s talk", "heading2": "math.", "sub": "Questions before you book? Reach out any time. We usually reply within a day." },
    "booking": { "eyebrow": "╱ Book a Free Session", "heading1": "Takes about", "heading2": "a minute.", "sub": "Pick your student’s grade, choose online or in person, and grab an open time slot. No card, no account, no cost." }
  },
  "footer": {
    "tagline1": "Math help you can",
    "tagline2": "count on.",
    "blurb": "Aidenn’s Tutoring: free K-9 math tutoring, online and in person, funded by generous donors."
  },
  "stats": { "sessions": 500, "freePercent": 100, "replyHours": 24 }
}'::jsonb)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- availability_days — per-date override. A missing row = no override
-- (that date's availability is governed purely by whatever slots exist
-- for it). is_closed ALWAYS wins over any slots that exist for that date
-- — every read path below checks this table first. Covers both "admin
-- closed this specific date" and "blackout date" with one mechanism.
-- Reopening a date (is_closed -> false) does not touch slot rows at all;
-- whatever was there before (open or booked) simply becomes visible
-- again, unchanged.
-- ---------------------------------------------------------------------
create table if not exists public.availability_days (
  day date primary key,
  is_closed boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.availability_days enable row level security;

-- ---------------------------------------------------------------------
-- availability_slots — one row per bookable time slot.
--
-- status: 'open' (bookable) | 'booked' (claimed by a pending, confirmed,
-- or completed booking). Declining or cancelling a booking flips its
-- slot back to 'open' via update_booking_status() below, in the same
-- transaction as the status change.
--
-- archived_at: NULL = active/visible. Non-null = archived — hidden from
-- the public site and from admin month-view counts, but the ROW ITSELF
-- IS NEVER DELETED. "Remove slot" in the admin UI archives; it never
-- issues a DELETE. This is what lets a booking's `slot_id` stay valid
-- forever, even for a slot the admin no longer wants publicly listed —
-- historical scheduling data is never destroyed, silently or otherwise.
-- `status` and `archived_at` are independent: a completed booking's slot
-- stays status='booked' AND can be archived — both facts are preserved.
-- ---------------------------------------------------------------------
create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  start_time time not null,
  duration_minutes int not null default 30 check (duration_minutes > 0 and duration_minutes <= 240),
  status text not null default 'open' check (status in ('open', 'booked')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (slot_date, start_time)
);

-- Partial index: every hot-path query (public availability, admin month
-- view) filters `archived_at is null`, so the index only needs to cover
-- active rows.
create index if not exists availability_slots_active_idx
  on public.availability_slots (slot_date, status)
  where archived_at is null;

alter table public.availability_slots enable row level security;

-- ---------------------------------------------------------------------
-- recurring_availability_rules — templates. Admin "Generate" action
-- inserts concrete availability_slots rows from these, skipping dates
-- that are closed/blacked-out or that already have that exact slot
-- (insert-if-not-exists against the unique constraint above) — it never
-- overwrites or deletes existing slots or bookings.
-- ---------------------------------------------------------------------
create table if not exists public.recurring_availability_rules (
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  duration_minutes int not null default 30 check (duration_minutes > 0 and duration_minutes <= 240),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.recurring_availability_rules enable row level security;

-- ---------------------------------------------------------------------
-- admin_login_attempts — rate-limits the admin login endpoint by a
-- salted hash of the client IP. Raw IP addresses are NEVER stored, only
-- an HMAC digest. The application layer enforces: max 5 failed attempts
-- per ip_hash per 15-minute window, and opportunistically deletes rows
-- older than 1 hour on every attempt (self-cleaning, no cron needed).
-- Keying by ip_hash (not a single global counter) means one attacker
-- spamming failed logins cannot lock out the real administrator.
-- ---------------------------------------------------------------------
create table if not exists public.admin_login_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_login_attempts_ip_idx
  on public.admin_login_attempts (ip_hash, created_at desc);

alter table public.admin_login_attempts enable row level security;

-- ---------------------------------------------------------------------
-- bookings — additive changes only. Existing rows/data fully preserved.
--
-- No ON DELETE clause is specified — it defaults to Postgres's NO ACTION,
-- which behaves like RESTRICT: if anything ever attempts to DELETE an
-- availability_slots row that a booking references, the database itself
-- rejects the statement with an error. Combined with the fact that no
-- application code path ever issues that DELETE (removal = archive,
-- always — see availability_slots above), this makes destroying
-- historical scheduling data fail loudly rather than fail silently.
-- ---------------------------------------------------------------------
alter table public.bookings
  add column if not exists slot_id uuid references public.availability_slots(id);

create index if not exists bookings_slot_id_idx on public.bookings (slot_id);

-- Widen status to add 'cancelled' (a booking that WAS confirmed and was
-- later called off — distinct from 'declined' = never accepted in the
-- first place). Existing rows keep whatever status they already have;
-- this only widens which values are allowed going forward.
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'declined', 'completed', 'cancelled'));

-- ---------------------------------------------------------------------
-- claim_slot_and_book — LEGACY, 11-parameter signature. Left completely
-- untouched (not dropped, not altered) in this migration so that
-- whatever is currently deployed and calling it keeps working during a
-- phased rollout. It trusts caller-supplied requested_date/date_label/
-- requested_time, and does not enforce closed-date or past-date rules
-- inside the function. Do not build anything new against this function
-- — new code calls claim_slot_and_book_v2 below. Once the v2-based
-- frontend/API is deployed and verified, this function is removed by
-- running supabase/cleanup-legacy-claim-function.sql (a separate file,
-- run later, not part of this migration).
-- ---------------------------------------------------------------------
create or replace function public.claim_slot_and_book(
  p_slot_id uuid,
  p_parent_name text,
  p_student_name text,
  p_grade text,
  p_format text,
  p_requested_date date,
  p_requested_date_label text,
  p_requested_time text,
  p_email text,
  p_phone text,
  p_notes text
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_slot public.availability_slots%rowtype;
  v_booking public.bookings%rowtype;
begin
  if p_slot_id is null then
    raise exception 'slot_id is required' using errcode = '22004';
  end if;
  if p_parent_name is null or length(trim(p_parent_name)) = 0
     or p_student_name is null or length(trim(p_student_name)) = 0
     or p_grade is null or p_format is null or p_requested_date is null
     or p_email is null or p_phone is null then
    raise exception 'missing required booking fields' using errcode = '22004';
  end if;

  select * into v_slot
  from public.availability_slots
  where id = p_slot_id and archived_at is null
  for update;

  if not found then
    raise exception 'slot_not_found' using errcode = 'P0002';
  end if;

  if v_slot.status <> 'open' then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  update public.availability_slots
  set status = 'booked'
  where id = p_slot_id;

  insert into public.bookings (
    slot_id, parent_name, student_name, grade, format,
    requested_date, requested_date_label, requested_time,
    email, phone, notes, status
  ) values (
    p_slot_id, p_parent_name, p_student_name, p_grade, p_format,
    p_requested_date, p_requested_date_label, p_requested_time,
    p_email, p_phone, coalesce(p_notes, ''), 'pending'
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.claim_slot_and_book(
  uuid, text, text, text, text, date, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.claim_slot_and_book(
  uuid, text, text, text, text, date, text, text, text, text, text
) to service_role;

-- ---------------------------------------------------------------------
-- claim_slot_and_book_v2 — the corrected function. New code (this
-- migration's api/book.js) calls THIS, never the legacy one above.
--
-- SECURITY-CRITICAL: does NOT accept requested_date, requested_date_label,
-- or requested_time as parameters at all. The legacy function did, which
-- meant a caller could submit a valid open slot_id but attach an
-- arbitrary, unrelated date/time to the stored booking. Every date/time
-- value written to `bookings` is derived here, server-side, from the
-- locked `availability_slots` row itself — there is nothing to forge
-- because the caller is never asked for those values at all.
--
-- Also newly enforced, all INSIDE this same transaction (not merely in
-- the public list API, which only controls what a visitor is ever shown
-- — a determined caller holding a slot_id could always bypass an
-- API-only check):
--   - the slot must not be archived (unchanged from before)
--   - the slot's date must not be in the past, evaluated in
--     America/Los_Angeles
--   - the slot's date must not have a `public.availability_days` row
--     with is_closed = true
--
-- The closed-date check specifically closes a race condition: a visitor
-- loads an available slot, the admin closes that date, and the visitor
-- claims the slot afterward. To make the check race-proof even when no
-- availability_days row exists yet for that date (the common case — a
-- row is normally only created the first time an admin closes/annotates
-- a date), this function first does
-- `insert ... on conflict (day) do nothing` to guarantee a row exists,
-- then locks THAT row with `for update` before reading is_closed. This
-- means a concurrent "close this date" admin action (itself an upsert
-- against the same row) and this claim genuinely serialize against each
-- other via Postgres's own row lock — whichever transaction commits
-- first is authoritative, and the other sees the result, rather than
-- both racing to completion independently. This is a real lock, not a
-- read-then-hope check, and it holds even for a date that has never
-- been touched before.
--
-- Hardened SECURITY DEFINER function:
--   - search_path restricted to pg_catalog, pg_temp only — NOT `public`.
--     Every reference inside is schema-qualified (public.bookings, etc),
--     so nothing in this function resolves an unqualified name through
--     `public` at all, closing off object-shadowing attacks where
--     someone creates a same-named function/type in the public schema.
--   - every table reference is schema-qualified
--   - EXECUTE revoked from public/anon/authenticated
--   - EXECUTE granted to service_role only
--   - validates grade, format, and every text field's length/format
--     itself (defense in depth beyond the app-layer validation in
--     api/_lib/validate.js — this function must be safe even if called
--     with hand-crafted input, not just input that passed the API layer)
-- Only ever invoked by api/book.js using the service-role client — it
-- is not reachable from any anon/public Supabase client.
-- ---------------------------------------------------------------------
create or replace function public.claim_slot_and_book_v2(
  p_slot_id uuid,
  p_parent_name text,
  p_student_name text,
  p_grade text,
  p_format text,
  p_email text,
  p_phone text,
  p_notes text
)
returns public.bookings
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_slot public.availability_slots%rowtype;
  v_booking public.bookings%rowtype;
  v_requested_time text;
  v_requested_date_label text;
  v_today_pacific date;
  v_day_closed boolean;
begin
  if p_slot_id is null then
    raise exception 'slot_id is required' using errcode = '22004';
  end if;

  if p_grade is null or p_grade not in ('K','1','2','3','4','5','6','7','8','9') then
    raise exception 'invalid_grade' using errcode = '22023';
  end if;

  if p_format is null or p_format not in ('Online', 'In-Person') then
    raise exception 'invalid_format' using errcode = '22023';
  end if;

  if p_parent_name is null or length(trim(p_parent_name)) = 0 or length(p_parent_name) > 120 then
    raise exception 'invalid_parent_name' using errcode = '22023';
  end if;

  if p_student_name is null or length(trim(p_student_name)) = 0 or length(p_student_name) > 120 then
    raise exception 'invalid_student_name' using errcode = '22023';
  end if;

  if p_email is null or length(p_email) > 200 or p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  if p_phone is null or length(p_phone) > 30 or length(regexp_replace(p_phone, '\D', '', 'g')) < 7 then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;

  if p_notes is not null and length(p_notes) > 1000 then
    raise exception 'invalid_notes' using errcode = '22023';
  end if;

  -- Lock the slot row first — this is the sole source of truth for the
  -- booking's date and time, and archived slots are excluded here too.
  select * into v_slot
  from public.availability_slots
  where id = p_slot_id and archived_at is null
  for update;

  if not found then
    raise exception 'slot_not_found' using errcode = 'P0002';
  end if;

  -- Past-date guard, evaluated in America/Los_Angeles — matching every
  -- other "today" boundary in this system (api/_lib/timezone.js and
  -- src/lib/timezone.js both use the same zone for this determination).
  v_today_pacific := (now() at time zone 'America/Los_Angeles')::date;
  if v_slot.slot_date < v_today_pacific then
    raise exception 'slot_past_date';
  end if;

  -- Closed-date guard — see the function-level comment above for why
  -- this is a real lock (insert-if-missing, then FOR UPDATE) rather than
  -- a plain read, and why that closes the race rather than merely
  -- narrowing it.
  insert into public.availability_days (day)
  values (v_slot.slot_date)
  on conflict (day) do nothing;

  select is_closed into v_day_closed
  from public.availability_days
  where day = v_slot.slot_date
  for update;

  if coalesce(v_day_closed, false) then
    raise exception 'date_closed';
  end if;

  if v_slot.status <> 'open' then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  update public.availability_slots
  set status = 'booked'
  where id = p_slot_id;

  -- Derive canonical display values from the locked slot — never from
  -- caller input. FM suppresses zero-padding ("3:30 PM" not "03:30 PM").
  v_requested_time := to_char(v_slot.slot_date + v_slot.start_time, 'FMHH12:MI AM');
  v_requested_date_label := to_char(v_slot.slot_date, 'FMDy, FMMon FMDD');

  insert into public.bookings (
    slot_id, parent_name, student_name, grade, format,
    requested_date, requested_date_label, requested_time,
    email, phone, notes, status
  ) values (
    p_slot_id, trim(p_parent_name), trim(p_student_name), p_grade, p_format,
    v_slot.slot_date, v_requested_date_label, v_requested_time,
    lower(trim(p_email)), trim(p_phone), coalesce(trim(p_notes), ''), 'pending'
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.claim_slot_and_book_v2(
  uuid, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.claim_slot_and_book_v2(
  uuid, text, text, text, text, text, text, text
) to service_role;

-- ---------------------------------------------------------------------
-- update_booking_status — atomic status transition used by the admin
-- "confirm / decline / cancel / complete" action, enforced against an
-- explicit state-transition matrix:
--
--   pending   -> confirmed | declined | cancelled
--   confirmed -> completed | cancelled
--   declined, cancelled, completed -> (terminal — no outgoing transition
--     at all, including re-selecting the same status, and including
--     back to 'pending')
--
-- This closes a real bug in the previous version: booking A cancelled
-- (reopens its slot) -> booking B claims that same slot -> re-confirming
-- A would have flipped the shared slot back to 'booked' on top of B's
-- own active booking, producing two conflicting booking records for one
-- slot. Terminal states can no longer be moved out of at all, so that
-- sequence is rejected at the first illegal step (re-confirming A).
--
-- Both the booking row AND its linked slot row are locked (`for update`)
-- for the duration of the transition, so this can never interleave with
-- a concurrent claim_slot_and_book_v2 (or the legacy claim_slot_and_book)
-- on the same slot. Reopening a slot
-- additionally double-checks no OTHER active (pending/confirmed) booking
-- has since claimed it before flipping it back to 'open' — belt-and-
-- suspenders on top of the transition matrix itself. Archiving
-- (`archived_at`) is never touched here — it is only ever set by the
-- admin's separate, explicit archive action.
-- ---------------------------------------------------------------------
create or replace function public.update_booking_status(
  p_booking_id uuid,
  p_new_status text
)
returns public.bookings
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_booking public.bookings%rowtype;
  v_slot public.availability_slots%rowtype;
  v_allowed boolean;
begin
  if p_new_status not in ('pending', 'confirmed', 'declined', 'completed', 'cancelled') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;

  v_allowed := (
    (v_booking.status = 'pending' and p_new_status in ('confirmed', 'declined', 'cancelled'))
    or (v_booking.status = 'confirmed' and p_new_status in ('completed', 'cancelled'))
  );

  if not v_allowed then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;

  -- Lock the linked slot too (if any), before mutating anything, so this
  -- can never race a concurrent claim_slot_and_book_v2 (or the legacy
  -- claim_slot_and_book) on the same slot.
  if v_booking.slot_id is not null then
    select * into v_slot from public.availability_slots where id = v_booking.slot_id for update;
  end if;

  update public.bookings set status = p_new_status where id = p_booking_id
  returning * into v_booking;

  if p_new_status in ('declined', 'cancelled') and v_booking.slot_id is not null then
    -- Defensive check: only reopen if no OTHER active booking has
    -- somehow come to reference this same slot in the meantime. Under
    -- the transition matrix above this should be structurally
    -- impossible, but this guards against any future code path that
    -- might otherwise violate the invariant.
    if not exists (
      select 1 from public.bookings
      where slot_id = v_booking.slot_id
        and id <> v_booking.id
        and status in ('pending', 'confirmed')
    ) then
      update public.availability_slots set status = 'open' where id = v_booking.slot_id;
    end if;
  end if;

  return v_booking;
end;
$$;

revoke all on function public.update_booking_status(uuid, text) from public, anon, authenticated;
grant execute on function public.update_booking_status(uuid, text) to service_role;

-- ---------------------------------------------------------------------
-- Explicit grants — every table, minimum required privileges for what
-- the application code actually does, service_role only. Being explicit
-- here (rather than assuming default privileges apply) avoids the
-- "permission denied for table bookings" error previously hit when a
-- grant was missing. `availability_slots` and `availability_days`
-- intentionally have NO delete grant — nothing in the application ever
-- deletes a row in either table (removal = archive/upsert, always).
-- `recurring_availability_rules` intentionally has NO update grant —
-- the app only ever creates or deletes a rule, never edits one in place.
-- ---------------------------------------------------------------------
grant usage on schema public to service_role;

grant select, insert on table public.bookings to service_role;
grant update on table public.bookings to service_role;

grant select, insert, update on table public.availability_slots to service_role;
grant select, insert, update on table public.availability_days to service_role;
grant select, insert, delete on table public.recurring_availability_rules to service_role;
grant select, insert, update on table public.site_settings to service_role;
grant select, insert, delete on table public.admin_login_attempts to service_role;

-- RLS stays ON with ZERO policies on every table above (bookings
-- included, unchanged from the original install). That means the public
-- "anon" key — the only key ever allowed near the browser — can neither
-- read nor write ANY of this data, full stop. Only the "service_role"
-- key, which lives exclusively in Vercel serverless function environment
-- variables and is never sent to the client, can bypass RLS and touch
-- this data — and even then, only within the explicit grants above.
