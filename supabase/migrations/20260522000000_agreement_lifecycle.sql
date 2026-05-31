-- ============================================================
-- Agreement Document Lifecycle Management
-- Adds verification workflow, document metadata, audit policies
-- ============================================================

-- 1. Extend agreements with lifecycle fields
ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS agreement_status TEXT NOT NULL DEFAULT 'pending_signature',
  ADD COLUMN IF NOT EXISTS original_document_url TEXT,
  ADD COLUMN IF NOT EXISTS signed_document_file_name TEXT,
  ADD COLUMN IF NOT EXISTS signed_document_file_type TEXT,
  ADD COLUMN IF NOT EXISTS signed_document_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS signed_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- 2. Backfill original_document_url (immutable copy)
UPDATE public.agreements
SET original_document_url = document_url
WHERE original_document_url IS NULL AND document_url IS NOT NULL;

-- 3. Map existing approval_status → agreement_status
UPDATE public.agreements SET agreement_status = CASE
  WHEN approval_status = 'Approved' THEN 'verified'
  WHEN approval_status = 'Rejected' THEN 'rejected'
  WHEN signed_document_url IS NOT NULL THEN 'uploaded'
  ELSE 'pending_signature'
END
WHERE agreement_status = 'pending_signature';

-- 4. Status constraint
ALTER TABLE public.agreements
  DROP CONSTRAINT IF EXISTS agreements_status_check;
ALTER TABLE public.agreements
  ADD CONSTRAINT agreements_status_check
  CHECK (agreement_status IN (
    'pending_signature', 'uploaded', 'under_review',
    'verified', 'rejected', 'archived'
  ));

-- 5. Audit log: allow users to insert for their own agreements
DROP POLICY IF EXISTS "Users can insert own agreement audit logs" ON public.agreement_audit_logs;
CREATE POLICY "Users can insert own agreement audit logs"
  ON public.agreement_audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agreements a
      WHERE a.id = agreement_id AND a.user_id = auth.uid()
    )
    OR public.is_super_admin()
  );

-- 6. Audit log: super_admin broad insert
DROP POLICY IF EXISTS "Super admins can insert agreement audit logs" ON public.agreement_audit_logs;
CREATE POLICY "Super admins can insert agreement audit logs"
  ON public.agreement_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

-- 7. Storage: super_admin can access all agreement files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND policyname = 'Super admins view all agreement files'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Super admins view all agreement files"
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = 'agreements' AND public.is_super_admin())
    $p$;
  END IF;
END $$;

-- 8. Users can update their own agreements (for uploading signed docs)
DROP POLICY IF EXISTS "Users can update own agreements" ON public.agreements;
CREATE POLICY "Users can update own agreements"
  ON public.agreements FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 9. Realtime for agreements and audit logs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agreements'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.agreements';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agreement_audit_logs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.agreement_audit_logs';
  END IF;
END $$;

ALTER TABLE public.agreements REPLICA IDENTITY FULL;