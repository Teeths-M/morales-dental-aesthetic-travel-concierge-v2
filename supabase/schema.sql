-- ============================================================================
-- Morales — Medical Travel Safety : Supabase schema
-- Derived from the app's Base44 domain model + safety-gate / freshness logic.
-- Tables: patients, doctors, clinics, bookings, safety_reviews, documents
-- RLS forced by default. Safety + freshness gates enforced in-database.
-- Idempotent: safe to paste & re-run in the Supabase SQL Editor.
--
-- ROLE SOURCE: role strings mirror src/lib/roles.js -> src/lib/constants.js ROLES.
--   ADMIN_ROLES = ['admin','platform_admin'].  There is NO coordinator/super_admin
--   role in this system, so is_staff() == the admin set (see note on is_staff()).
--   Doctors are matched by a doctors row (user_id = auth.uid()), which covers both
--   'doctor' and 'local_doctor' without hardcoding a role string.
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;   -- gen_random_uuid(), digest() for the hash chain

-- ── Enums ───────────────────────────────────────────────────────────────────
do $$ begin create type safet_risk_level as enum ('low','review','elevated','high');
exception when duplicate_object then null; end $$;

do $$ begin create type booking_status as enum ('draft','admin_review','pending','confirmed','cancelled','completed');
exception when duplicate_object then null; end $$;

do $$ begin create type operating_status as enum ('operating','closed','suspended','unknown');
exception when duplicate_object then null; end $$;

do $$ begin create type verification_status as enum ('unverified','pending','verified','rejected');
exception when duplicate_object then null; end $$;

do $$ begin create type document_type as enum
  ('x_ray','blood_work','mri_ct','prescription','photo','procedure_report','passport','other');
exception when duplicate_object then null; end $$;

do $$ begin create type review_decider as enum ('deterministic_engine','human_reviewer');
exception when duplicate_object then null; end $$;

-- ── Shared helpers ──────────────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

-- Append-only guard: block UPDATE/DELETE on hash-chained tables.
create or replace function public.forbid_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'append-only: % is not permitted on %', TG_OP, TG_TABLE_NAME;
end $$;

-- Role source for RLS. profiles.role holds the ROLES strings from src/lib/constants.js.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'client',   -- ROLES.CLIENT
  full_name  text,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so RLS helpers can read profiles without recursive RLS.
create or replace function public.user_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon');
$$;

-- ADMIN_ROLES from src/lib/roles.js.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.user_role() in ('admin','platform_admin');
$$;

-- "Staff" == the admin set today. There is no coordinator/care_coordinator role
-- in src/lib/roles.js; if one is added, extend the list HERE (single point) so
-- every "staff" policy picks it up. Kept as a distinct name for policy readability.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.user_role() in ('admin','platform_admin');
$$;

-- NOTE: public.current_doctor_id() and public.owns_patient() are defined LATER
-- (just before ROW LEVEL SECURITY) — a SQL function body is validated against the
-- tables it references at CREATE time, so they must come after doctors/patients.

-- ── Data-freshness config (externalized TTLs; mirrors _shared/freshness.ts) ──
-- Single source of truth for how long a stored status may be treated as current
-- before it must be re-verified. `kind` matches freshness.ts FreshnessKind /
-- DataFreshnessReview.subject_type. Change a TTL here — the booking gate reads it.
create table if not exists public.freshness_config (
  kind        text primary key,
  ttl         interval not null,
  description text,
  updated_at  timestamptz not null default now()
);

insert into public.freshness_config (kind, ttl, description) values
  ('clinic_status',   interval '24 hours', 'Clinic operating status — live-checked at booking; blocks if older'),
  ('doctor_license',  interval '7 days',   'Doctor licence — scheduled daily (US) / weekly (scrape)'),
  ('visa_rule',       interval '7 days',   'Visa rule — weekly + on destination×nationality selection'),
  ('regulatory_rule', interval '30 days',  'Regulatory rule — monthly + daily change-detection')
on conflict (kind) do update
  set ttl = excluded.ttl, description = excluded.description, updated_at = now();

-- SECURITY DEFINER so the in-trigger booking gate can read the TTL regardless of
-- the calling user's RLS on freshness_config.
create or replace function public.freshness_ttl(p_kind text) returns interval
language sql stable security definer set search_path = public as $$
  select ttl from public.freshness_config where kind = p_kind;
$$;

alter table public.freshness_config enable row level security;
alter table public.freshness_config force row level security;
drop policy if exists freshness_read on public.freshness_config;
create policy freshness_read on public.freshness_config for select using (public.is_staff());
drop policy if exists freshness_write on public.freshness_config;
create policy freshness_write on public.freshness_config for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.freshness_config to authenticated;

-- ============================================================================
-- TABLES  (created FK-order: clinics → doctors → patients → bookings →
--          safety_reviews → documents; the bookings↔safety_reviews cycle is
--          closed with a deferred ALTER after both exist.)
-- ============================================================================

-- ── clinics ─────────────────────────────────────────────────────────────────
create table if not exists public.clinics (
  id                uuid primary key default gen_random_uuid(),
  clinic_name       text not null,
  country           text not null,
  city              text,
  registration_ref  text,
  operating_status  operating_status not null default 'unknown',  -- fail-closed
  last_verified_at  timestamptz,                                   -- freshness (TTL below)
  verified_by       uuid references auth.users(id),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── doctors ─────────────────────────────────────────────────────────────────
create table if not exists public.doctors (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id) on delete set null,
  full_name            text not null,
  specialty            text,
  bio                  text,
  photo_url            text,
  clinic_id            uuid references public.clinics(id) on delete set null,
  license_number       text,
  license_country      text,
  license_verified_at  timestamptz,                                 -- doctor-licence freshness
  years_experience     int,
  rating               numeric(2,1),
  review_count         int not null default 0,
  verification_status  verification_status not null default 'unverified', -- fail-closed; only staff may set 'verified'
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── patients ────────────────────────────────────────────────────────────────
create table if not exists public.patients (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid references auth.users(id) on delete set null, -- null = guest-created
  full_name                   text not null,
  email                       text,
  phone                       text,
  date_of_birth               date,
  is_minor                    boolean not null default false,       -- derived on write (see trigger)
  gender                      text,
  nationality                 text,
  client_country              text,
  emergency_contact_name      text,
  emergency_contact_number    text,
  guardian_required           boolean not null default false,
  guardian_name               text,
  guardian_contact            text,
  guardian_consent            boolean not null default false,
  medical_conditions          jsonb not null default '[]',
  allergies                   jsonb not null default '[]',
  medications                 jsonb not null default '[]',
  data_processing_consent     boolean not null default false,
  data_processing_consent_at  timestamptz,
  data_processing_consent_version text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- Derive is_minor / guardian_required from DOB at write time (current_date is
-- not immutable, so this can't be a generated column). Mirrors ageFromDob().
create or replace function public.patients_derive_minor() returns trigger
language plpgsql as $$
begin
  if new.date_of_birth is not null then
    new.is_minor := new.date_of_birth > (current_date - interval '18 years');
  end if;
  if new.is_minor then new.guardian_required := true; end if;
  return new;
end $$;

-- ── bookings ────────────────────────────────────────────────────────────────
create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references public.patients(id) on delete cascade,
  doctor_id           uuid references public.doctors(id) on delete set null,   -- preferred/assigned surgeon
  clinic_id           uuid references public.clinics(id) on delete set null,
  procedure_interest  text,
  procedures          jsonb not null default '[]',                             -- multi-procedure (RED-stacking input)
  destination_country text,
  procedure_country   text,
  preferred_date      date,
  status              booking_status not null default 'draft',
  safet_risk_level    safet_risk_level,                                        -- null until screened
  safety_review_id    uuid,                                                    -- FK added after safety_reviews exists
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── safety_reviews  (append-only, hash-chained — the SAFE-T screening log) ───
create table if not exists public.safety_reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references public.bookings(id) on delete cascade,
  patient_id  uuid references public.patients(id) on delete cascade,
  risk_level  safet_risk_level not null default 'review',   -- fail-closed default
  flags       jsonb not null default '[]',
  narration   text,                                         -- AI narrates; never decides
  decided_by  review_decider not null default 'deterministic_engine',
  prev_hash   text not null default '',
  entry_hash  text not null default '',
  created_at  timestamptz not null default now()
);

-- Close the bookings → safety_reviews reference now that both tables exist.
do $$ begin
  alter table public.bookings
    add constraint bookings_safety_review_fk
    foreign key (safety_review_id) references public.safety_reviews(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ── documents ───────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  booking_id    uuid references public.bookings(id) on delete set null,
  document_type document_type not null default 'other',
  file_url      text not null,          -- Supabase Storage path/URL
  uploaded_by   uuid references auth.users(id),
  encrypted     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- SAFETY + FRESHNESS GATES  (the M Principle, enforced in-database)
-- ============================================================================

-- SAFE-T hash chain: each row seals prev_hash + its own content (append-only,
-- tamper-evident — matches SafeTScreening / the audit hash chain).
create or replace function public.safety_reviews_seal() returns trigger
language plpgsql as $$
declare v_prev text;
begin
  select entry_hash into v_prev
    from public.safety_reviews order by created_at desc, id desc limit 1;
  new.prev_hash  := coalesce(v_prev, '');
  new.created_at := coalesce(new.created_at, now());
  new.entry_hash := encode(digest(
      new.prev_hash || new.id::text || coalesce(new.booking_id::text,'')
      || coalesce(new.patient_id::text,'') || new.risk_level::text
      || coalesce(new.flags::text,'') || coalesce(new.narration,'')
      || new.decided_by::text || new.created_at::text, 'sha256'), 'hex');
  return new;
end $$;

-- A booking can only be CONFIRMED when every gate passes. Fail closed: any
-- missing/ambiguous input raises, so it can never silently confirm.
create or replace function public.enforce_booking_gates() returns trigger
language plpgsql as $$
declare v_review public.safety_reviews; v_clinic public.clinics; v_pat public.patients;
        -- Clinic TTL now comes from freshness_config. Fail-safe: fall back to the
        -- known-safe 24h if the config row is missing, so a deleted/absent config
        -- can never WIDEN the gate.
        clinic_ttl interval := coalesce(public.freshness_ttl('clinic_status'), interval '24 hours');
begin
  if new.status = 'confirmed' then
    -- 1) SAFE-T review must exist and be cleared (elevated/high require a human).
    if new.safety_review_id is null then
      raise exception 'M-SAFETY: cannot confirm a booking with no SAFE-T review';
    end if;
    select * into v_review from public.safety_reviews where id = new.safety_review_id;
    if v_review.id is null then
      raise exception 'M-SAFETY: referenced SAFE-T review does not exist';
    end if;
    if v_review.risk_level in ('elevated','high') then
      raise exception 'M-SAFETY: SAFE-T risk % needs human review before confirmation', v_review.risk_level;
    end if;

    -- 2) Under-18 guardian hard-gate (never auto-processed).
    select * into v_pat from public.patients where id = new.patient_id;
    if v_pat.is_minor and (coalesce(btrim(v_pat.guardian_name),'') = ''
                           or coalesce(btrim(v_pat.guardian_contact),'') = '') then
      raise exception 'M-SAFETY: patient is under 18 without a captured guardian — cannot confirm';
    end if;

    -- 3) Clinic must be operating AND fresh (freshness fail-safe, not fail-silent).
    if new.clinic_id is not null then
      select * into v_clinic from public.clinics where id = new.clinic_id;
      if v_clinic.operating_status is distinct from 'operating' then
        raise exception 'M-FRESHNESS: clinic is not confirmed operating — cannot confirm booking';
      end if;
      if v_clinic.last_verified_at is null or v_clinic.last_verified_at < (now() - clinic_ttl) then
        raise exception 'M-FRESHNESS: clinic operating status is stale (past TTL) — re-verify first';
      end if;
    end if;
  end if;
  return new;
end $$;

-- Doctors may never self-verify — verification routes to a human (staff only).
create or replace function public.guard_doctor_verification() returns trigger
language plpgsql as $$
begin
  if new.verification_status = 'verified'
     and (tg_op = 'INSERT' or old.verification_status is distinct from 'verified')
     and not public.is_staff() then
    raise exception 'M-TRUST: only staff may set a doctor to verified';
  end if;
  return new;
end $$;

-- Stamp clinic freshness whenever a human sets it operating (agents may block, never clear).
create or replace function public.stamp_clinic_verification() returns trigger
language plpgsql as $$
begin
  if new.operating_status = 'operating'
     and (tg_op = 'INSERT' or old.operating_status is distinct from 'operating') then
    new.last_verified_at := coalesce(new.last_verified_at, now());
    new.verified_by      := coalesce(new.verified_by, auth.uid());
  end if;
  return new;
end $$;

-- ── Triggers ─────────────────────────────────────────────────────────────────
drop trigger if exists trg_patients_minor      on public.patients;
create trigger trg_patients_minor      before insert or update on public.patients
  for each row execute function public.patients_derive_minor();

drop trigger if exists trg_booking_gates       on public.bookings;
create trigger trg_booking_gates       before insert or update on public.bookings
  for each row execute function public.enforce_booking_gates();

drop trigger if exists trg_safety_seal         on public.safety_reviews;
create trigger trg_safety_seal         before insert on public.safety_reviews
  for each row execute function public.safety_reviews_seal();

drop trigger if exists trg_safety_immutable    on public.safety_reviews;
create trigger trg_safety_immutable    before update or delete on public.safety_reviews
  for each row execute function public.forbid_mutation();

drop trigger if exists trg_doctor_verify_guard on public.doctors;
create trigger trg_doctor_verify_guard before insert or update on public.doctors
  for each row execute function public.guard_doctor_verification();

drop trigger if exists trg_clinic_verify_stamp on public.clinics;
create trigger trg_clinic_verify_stamp before insert or update on public.clinics
  for each row execute function public.stamp_clinic_verification();

-- updated_at maintenance
drop trigger if exists trg_clinics_updated  on public.clinics;
create trigger trg_clinics_updated  before update on public.clinics  for each row execute function public.set_updated_at();
drop trigger if exists trg_doctors_updated  on public.doctors;
create trigger trg_doctors_updated  before update on public.doctors  for each row execute function public.set_updated_at();
drop trigger if exists trg_patients_updated on public.patients;
create trigger trg_patients_updated before update on public.patients for each row execute function public.set_updated_at();
drop trigger if exists trg_bookings_updated on public.bookings;
create trigger trg_bookings_updated before update on public.bookings for each row execute function public.set_updated_at();

-- ── RLS helper functions that reference tables (defined here, after the tables
--    exist, because a SQL function body is validated at CREATE time). ──────────
create or replace function public.current_doctor_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.doctors where user_id = auth.uid() limit 1;
$$;

create or replace function public.owns_patient(p_patient_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.patients p
    where p.id = p_patient_id
      and (p.user_id = auth.uid() or p.email = (auth.jwt() ->> 'email'))
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY  (enabled AND forced on every table)
-- ============================================================================
alter table public.profiles       enable row level security;  alter table public.profiles       force row level security;
alter table public.clinics        enable row level security;  alter table public.clinics        force row level security;
alter table public.doctors        enable row level security;  alter table public.doctors        force row level security;
alter table public.patients       enable row level security;  alter table public.patients       force row level security;
alter table public.bookings       enable row level security;  alter table public.bookings       force row level security;
alter table public.safety_reviews enable row level security;  alter table public.safety_reviews force row level security;
alter table public.documents      enable row level security;  alter table public.documents      force row level security;

-- profiles: a user sees/edits only their own; staff see all.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_staff());
drop policy if exists profiles_self_upd on public.profiles;
create policy profiles_self_upd on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- clinics: public read (directory/booking); staff-only writes.
drop policy if exists clinics_read on public.clinics;
create policy clinics_read on public.clinics for select using (true);
drop policy if exists clinics_write on public.clinics;
create policy clinics_write on public.clinics for all using (public.is_staff()) with check (public.is_staff());

-- doctors: public reads VERIFIED doctors; the doctor + staff read all of theirs;
-- doctor edits own; staff manage. (Self-verify blocked by trigger above.)
drop policy if exists doctors_read_public on public.doctors;
create policy doctors_read_public on public.doctors for select
  using (verification_status = 'verified' or user_id = auth.uid() or public.is_staff());
drop policy if exists doctors_insert on public.doctors;
create policy doctors_insert on public.doctors for insert
  with check (user_id = auth.uid() or public.is_staff());
drop policy if exists doctors_update on public.doctors;
create policy doctors_update on public.doctors for update
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());
drop policy if exists doctors_delete on public.doctors;
create policy doctors_delete on public.doctors for delete using (public.is_staff());

-- patients: owner (by auth uid or matching email) + staff; assigned doctor may read.
-- MINOR PHI GATE: an assigned doctor may read a MINOR's row ONLY once the booking
-- has cleared Admin-Review (status not in draft/admin_review) — same fail-closed
-- principle as the booking-confirm gate. Adult patients are unaffected.
drop policy if exists patients_read on public.patients;
create policy patients_read on public.patients for select
  using (
    user_id = auth.uid()
    or email = (auth.jwt() ->> 'email')
    or public.is_staff()
    or exists (select 1 from public.bookings b
               where b.patient_id = patients.id
                 and b.doctor_id = public.current_doctor_id()
                 and (not patients.is_minor or b.status not in ('draft','admin_review')))
  );
drop policy if exists patients_insert on public.patients;
create policy patients_insert on public.patients for insert
  with check (user_id = auth.uid() or public.is_staff());
drop policy if exists patients_update on public.patients;
create policy patients_update on public.patients for update
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());
drop policy if exists patients_delete on public.patients;
create policy patients_delete on public.patients for delete using (public.is_staff());

-- bookings: patient owner + assigned doctor + staff. (Confirm gates run in-trigger.)
drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings for select
  using (public.owns_patient(patient_id) or doctor_id = public.current_doctor_id() or public.is_staff());
drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings for insert
  with check (public.owns_patient(patient_id) or public.is_staff());
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings for update
  using (public.owns_patient(patient_id) or doctor_id = public.current_doctor_id() or public.is_staff())
  with check (public.owns_patient(patient_id) or doctor_id = public.current_doctor_id() or public.is_staff());
drop policy if exists bookings_delete on public.bookings;
create policy bookings_delete on public.bookings for delete using (public.is_staff());

-- safety_reviews: append-only. Read by owner/doctor/staff; INSERT by staff
-- (the deterministic engine writes via the service_role, which bypasses RLS).
-- NO update/delete policies exist → both are denied (belt: forbid_mutation trigger).
drop policy if exists safety_read on public.safety_reviews;
create policy safety_read on public.safety_reviews for select
  using (public.owns_patient(patient_id) or public.is_staff()
         or exists (select 1 from public.bookings b
                    join public.patients p on p.id = b.patient_id
                    where b.id = safety_reviews.booking_id
                      and b.doctor_id = public.current_doctor_id()
                      and (not p.is_minor or b.status not in ('draft','admin_review'))));
drop policy if exists safety_insert on public.safety_reviews;
create policy safety_insert on public.safety_reviews for insert with check (public.is_staff());

-- documents: owner patient + assigned doctor + staff.
drop policy if exists documents_read on public.documents;
create policy documents_read on public.documents for select
  using (public.owns_patient(patient_id) or public.is_staff()
         or exists (select 1 from public.bookings b
                    join public.patients p on p.id = b.patient_id
                    where b.id = documents.booking_id
                      and b.doctor_id = public.current_doctor_id()
                      and (not p.is_minor or b.status not in ('draft','admin_review'))));
drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents for insert
  with check (public.owns_patient(patient_id) or public.is_staff());
drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents for update
  using (public.owns_patient(patient_id) or public.is_staff())
  with check (public.owns_patient(patient_id) or public.is_staff());
drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents for delete using (public.is_staff());

-- ── Grants (RLS still gates rows; roles need table privileges to reach them) ──
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.profiles, public.doctors, public.patients,
     public.bookings, public.safety_reviews, public.documents to authenticated;
grant select, insert, update, delete on public.clinics to authenticated;
grant select on public.doctors, public.clinics to anon;   -- public directory reads only

-- Helpful indexes
create index if not exists idx_bookings_patient   on public.bookings(patient_id);
create index if not exists idx_bookings_doctor    on public.bookings(doctor_id);
create index if not exists idx_bookings_status    on public.bookings(status);
create index if not exists idx_safety_booking     on public.safety_reviews(booking_id);
create index if not exists idx_documents_patient  on public.documents(patient_id);
create index if not exists idx_doctors_clinic     on public.doctors(clinic_id);
