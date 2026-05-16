-- Agreement history + versioning
-- Adds version/signature/audit tables and extends agreements lifecycle fields.

begin;

-- 1) Extend agreements with full lifecycle metadata if missing
-- (Existing migration created agreements with limited fields.)
ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS agreement_number TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ;

-- Keep backwards compatibility with approval_status: map it to status semantics via trigger.
-- If a record uses approval_status only, we will still render status using status/last_updated.

-- 2) Create agreement_versions
CREATE TABLE IF NOT EXISTS public.agreement_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  modified_by UUID,
  modified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  document_url TEXT,
  signed_document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agreement_versions_agreement_id_version_uniq
  ON public.agreement_versions (agreement_id, version);

-- 3) Create agreement_signatures
CREATE TABLE IF NOT EXISTS public.agreement_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  agreement_version_id UUID REFERENCES public.agreement_versions(id) ON DELETE SET NULL,
  signer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signer_name TEXT,
  signer_email TEXT,
  signature_type TEXT DEFAULT 'draw',
  signature_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature_image_url TEXT,
  signed_document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Create agreement_audit_logs
CREATE TABLE IF NOT EXISTS public.agreement_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) Enable RLS
ALTER TABLE public.agreement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_audit_logs ENABLE ROW LEVEL SECURITY;

-- 6) RLS policies: users access their own
CREATE POLICY IF NOT EXISTS "Users can view own agreement versions"
  ON public.agreement_versions FOR SELECT TO authenticated
  USING (
    exists (
      select 1 from public.agreements a
      where a.id = agreement_versions.agreement_id
        and a.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can view own agreement signatures"
  ON public.agreement_signatures FOR SELECT TO authenticated
  USING (
    exists (
      select 1 from public.agreements a
      where a.id = agreement_signatures.agreement_id
        and a.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can view own agreement audit logs"
  ON public.agreement_audit_logs FOR SELECT TO authenticated
  USING (
    exists (
      select 1 from public.agreements a
      where a.id = agreement_audit_logs.agreement_id
        and a.user_id = auth.uid()
    )
  );

-- Admins access all
CREATE POLICY IF NOT EXISTS "Admins can view all agreement versions"
  ON public.agreement_versions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY IF NOT EXISTS "Admins can view all agreement signatures"
  ON public.agreement_signatures FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY IF NOT EXISTS "Admins can view all agreement audit logs"
  ON public.agreement_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 7) Agreement versioning trigger:
-- If signed_at exists and user edits document_url/signed_document_url/admin_notes/expiration -> create new version row.

CREATE OR REPLACE FUNCTION public.handle_agreement_versioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version int;
BEGIN
  -- If nothing relevant changed, do nothing.
  IF NEW.document_url IS NOT DISTINCT FROM OLD.document_url
     AND NEW.expires_at IS NOT DISTINCT FROM OLD.expires_at
     AND NEW.signed_document_url IS NOT DISTINCT FROM OLD.signed_document_url
     AND NEW.admin_notes IS NOT DISTINCT FROM OLD.admin_notes
     AND NEW.signature_url IS NOT DISTINCT FROM OLD.signature_url
     AND NEW.signature_type IS NOT DISTINCT FROM OLD.signature_type
     AND NEW.approval_status IS NOT DISTINCT FROM OLD.approval_status
     AND NEW.status IS NOT DISTINCT FROM OLD.status
  THEN
    RETURN NEW;
  END IF;

  -- Only version if NEW differs AFTER it has been signed (or currently status indicates Signed/Active).
  IF OLD.signed_at IS NOT NULL OR OLD.status IN ('Signed','Active','Expired','Cancelled') THEN
    SELECT COALESCE(MAX(v.version), OLD.version) + 1 INTO next_version
    FROM public.agreement_versions v
    WHERE v.agreement_id = OLD.id;

    INSERT INTO public.agreement_versions (
      agreement_id, user_id, property_id, version, status,
      signed_at, expires_at, cancelled_at, archived_at,
      modified_by, modified_at,
      document_url, signed_document_url
    )
    VALUES (
      OLD.id,
      OLD.user_id,
      OLD.property_id,
      next_version,
      NEW.status,
      NEW.signed_at,
      NEW.expires_at,
      NEW.cancelled_at,
      NEW.archived_at,
      auth.uid(),
      now(),
      NEW.document_url,
      NEW.signed_document_url
    );

    INSERT INTO public.agreement_audit_logs (agreement_id, user_id, action, metadata)
    VALUES (
      OLD.id,
      OLD.user_id,
      'agreement_version_created',
      jsonb_build_object('from_version', OLD.version, 'to_version', next_version)
    );

    -- Update agreement current version and last_updated
    NEW.version := next_version;
    NEW.last_updated_at := now();
  ELSE
    -- not signed yet: keep current row updated
    NEW.last_updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agreement_versioning ON public.agreements;
CREATE TRIGGER trg_agreement_versioning
BEFORE UPDATE ON public.agreements
FOR EACH ROW
EXECUTE FUNCTION public.handle_agreement_versioning();

-- 8) Trigger to keep status in sync with old approval_status defaults
CREATE OR REPLACE FUNCTION public.sync_agreement_status_from_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If approval_status exists, map to status
  IF NEW.approval_status = 'Approved' AND OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    -- When approved but not signed, keep Pending Signature.
    IF NEW.signature_url IS NULL AND NEW.signed_document_url IS NULL THEN
      NEW.status := 'Pending Signature';
    ELSE
      NEW.status := 'Signed';
    END IF;
  END IF;

  -- Signed date
  IF NEW.signed_at IS NULL AND NEW.signed_document_url IS NOT NULL THEN
    NEW.signed_at := COALESCE(NEW.updated_at, now());
  END IF;

  -- Active/Expired derived from expires_at
  IF NEW.expires_at IS NOT NULL THEN
    IF NEW.archived_at IS NULL AND NEW.cancelled_at IS NULL THEN
      IF NEW.expires_at < now() AND NEW.status IN ('Signed','Active','Pending Signature') THEN
        NEW.status := 'Expired';
      END IF;
    END IF;
  END IF;

  -- Archived
  IF NEW.archived_at IS NOT NULL THEN
    NEW.status := 'Archived';
  END IF;

  NEW.last_updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agreement_status_sync ON public.agreements;
CREATE TRIGGER trg_agreement_status_sync
BEFORE UPDATE ON public.agreements
FOR EACH ROW
EXECUTE FUNCTION public.sync_agreement_status_from_approval();

-- 9) prevent hard deletes of signed agreements: disallow delete when signed/signed_document_url exists
CREATE OR REPLACE FUNCTION public.prevent_delete_signed_agreements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.signed_document_url IS NOT NULL OR OLD.signed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot delete agreements after signing. Use archive instead.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_signed_delete ON public.agreements;
CREATE TRIGGER trg_prevent_signed_delete
BEFORE DELETE ON public.agreements
FOR EACH ROW
EXECUTE FUNCTION public.prevent_delete_signed_agreements();

commit;

