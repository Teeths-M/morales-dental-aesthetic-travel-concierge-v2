-- ============================================================================
-- Morales — Supabase Storage policies for the 'documents' bucket
-- Run AFTER schema.sql (reuses public.owns_patient() and public.is_staff()).
--
-- Rigor parity with the database tables:
--   • A patient may ONLY ever access their own files.
--   • Staff (ADMIN_ROLES) may access files their role requires (review/coordination).
--   • NO public / anonymous access to any uploaded file — ever.
--
-- PATH CONVENTION (enforced below): {patient_id}/{category}/{filename}
--   category ∈ passport | medical_history | lab_clearance | companion_contact_confirmation
--   The first path segment IS the patient_id, so ownership is derived from the
--   object key itself and can never be spoofed into another patient's folder.
--
-- Idempotent: safe to paste & re-run in the Supabase SQL Editor.
-- ============================================================================

-- ── Private bucket (public = false → no public URLs, ever) ───────────────────
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

-- RLS is already enabled on storage.objects by Supabase. All policies below are
-- scoped `to authenticated` ONLY — the anon role is never granted, so
-- unauthenticated requests are denied by default (no public/anonymous access).

-- Allowed document categories (second path segment) — matches the app's set.
-- Kept as a helper so it's the single point to extend if categories change.
create or replace function public.is_allowed_doc_category(seg text) returns boolean
language sql immutable as $$
  select seg in ('passport','medical_history','lab_clearance','companion_contact_confirmation');
$$;

-- ── Patient: read ONLY their own files ───────────────────────────────────────
drop policy if exists "documents: patient reads own" on storage.objects;
create policy "documents: patient reads own"
on storage.objects for select to authenticated
using (
  bucket_id = 'documents'
  and public.owns_patient((((storage.foldername(name))[1]))::uuid)
);

-- ── Patient: upload ONLY into their own folder, ONLY a valid category ─────────
drop policy if exists "documents: patient uploads own" on storage.objects;
create policy "documents: patient uploads own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents'
  and public.owns_patient((((storage.foldername(name))[1]))::uuid)
  and public.is_allowed_doc_category((storage.foldername(name))[2])
);

-- ── Patient: update/replace ONLY their own files ─────────────────────────────
drop policy if exists "documents: patient updates own" on storage.objects;
create policy "documents: patient updates own"
on storage.objects for update to authenticated
using (
  bucket_id = 'documents'
  and public.owns_patient((((storage.foldername(name))[1]))::uuid)
)
with check (
  bucket_id = 'documents'
  and public.owns_patient((((storage.foldername(name))[1]))::uuid)
);

-- ── Patient: delete ONLY their own files ─────────────────────────────────────
drop policy if exists "documents: patient deletes own" on storage.objects;
create policy "documents: patient deletes own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'documents'
  and public.owns_patient((((storage.foldername(name))[1]))::uuid)
);

-- ── Staff (ADMIN_ROLES): full access for review/coordination ─────────────────
-- "Only what their role requires" == staff, and staff is the admin set today
-- (see is_staff() note in schema.sql). If a narrower coordinator role is added,
-- tighten here (e.g. restrict certain categories) — single point of change.
drop policy if exists "documents: staff manage" on storage.objects;
create policy "documents: staff manage"
on storage.objects for all to authenticated
using (bucket_id = 'documents' and public.is_staff())
with check (bucket_id = 'documents' and public.is_staff());

-- NOTE — assigned doctors are intentionally NOT granted file access here. The
-- documents *table* lets an assigned doctor read the metadata row (and, for a
-- MINOR, only after Admin-Review clears the booking — see patients_read /
-- documents_read in schema.sql). Storage is stricter still: the actual file
-- bytes are never exposed to a provider from this bucket regardless of role.
