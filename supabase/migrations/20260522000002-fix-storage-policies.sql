-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260522000002_fix_storage_policies
-- Purpose  : (a) Add missing original_document_storage_path column
--            (b) Fix storage RLS so super_admins can upload originals and
--                users can read original documents uploaded on their behalf.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 0. Add missing column ────────────────────────────────────────────────────
-- original_document_storage_path was referenced in code but never added to the
-- agreements table. IF NOT EXISTS makes this safe to re-run.

ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS original_document_storage_path text DEFAULT NULL;

COMMENT ON COLUMN public.agreements.original_document_storage_path IS
  'Storage path of the admin-uploaded original document. '
  'Used to generate fresh signed URLs on demand.';


-- ── 1. Super admin INSERT policy ─────────────────────────────────────────────
-- Admins upload originals at: {adminId}/originals/{userId}/{timestamp}_{name}
-- The existing "Users can upload own agreements" policy checks [1] = auth.uid(),
-- which passes for the admin's own folder but fails when trying to write to
-- a path starting with someone else's uid.
-- This new policy lets any super_admin upload to any path in the bucket.

DROP POLICY IF EXISTS "super_admin_insert_agreement_files" ON storage.objects;

CREATE POLICY "super_admin_insert_agreement_files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'agreements'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role   = 'super_admin'
    )
  );


-- ── 2. Super admin UPDATE policy ─────────────────────────────────────────────
-- Needed when overwriting/replacing a document.

DROP POLICY IF EXISTS "super_admin_update_agreement_files" ON storage.objects;

CREATE POLICY "super_admin_update_agreement_files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'agreements'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role   = 'super_admin'
    )
  );


-- ── 3. User SELECT policy for originals uploaded on their behalf ──────────────
-- Path structure: {adminId}/originals/{userId}/{filename}
-- storage.foldername(name) returns an array; element [3] is the third folder.
-- This allows the target user to read their own original documents even though
-- the file lives under the admin's top-level folder.

DROP POLICY IF EXISTS "users_can_view_originals_uploaded_for_them" ON storage.objects;

CREATE POLICY "users_can_view_originals_uploaded_for_them"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'agreements'
    AND (storage.foldername(name))[3] = auth.uid()::text
  );

-- Note: the pre-existing "Users can view own agreements" policy covers
-- (storage.foldername(name))[1] = auth.uid() (user-uploaded signed docs).
-- Multiple SELECT policies are OR-ed together, so both remain active.