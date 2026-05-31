-- ============================================================
-- Enhanced Payment Management System
-- Adds verification workflow, document metadata, audit logging
-- ============================================================

-- 1. Enhance payments table with verification fields
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank_transfer',
  ADD COLUMN IF NOT EXISTS receipt_path TEXT; -- Supabase storage path for regenerating signed URLs

-- Migrate existing status to verification_status
UPDATE public.payments SET
  verification_status = CASE
    WHEN status = 'Confirmed' THEN 'confirmed'
    WHEN status = 'Rejected'  THEN 'rejected'
    ELSE 'pending'
  END
WHERE verification_status = 'pending';

-- 2. Payment documents table — persistent, never deleted after confirmation
CREATE TABLE IF NOT EXISTS public.payment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT,           -- cached public/signed URL (may expire)
  file_path TEXT NOT NULL, -- storage path — source of truth for fresh signed URLs
  file_name TEXT,
  file_type TEXT,          -- MIME type e.g. image/jpeg, application/pdf
  file_size BIGINT,        -- bytes
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_docs_payment_id ON public.payment_documents(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_docs_user_id    ON public.payment_documents(user_id);

ALTER TABLE public.payment_documents ENABLE ROW LEVEL SECURITY;

-- 3. Payment audit logs
CREATE TABLE IF NOT EXISTS public.payment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- submitted | under_review | confirmed | rejected | notes_updated | document_viewed
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_email TEXT,
  old_status TEXT,
  new_status TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_payment_id ON public.payment_audit_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_created_at ON public.payment_audit_logs(created_at DESC);

ALTER TABLE public.payment_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies
-- ============================================================

-- payment_documents: users see own; super_admins see all
CREATE POLICY "Users can view own payment documents"
  ON public.payment_documents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all payment documents"
  ON public.payment_documents FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Users can insert own payment documents"
  ON public.payment_documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can update payment documents"
  ON public.payment_documents FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Prevent deletion of verified documents (DELETE blocked for confirmed/rejected)
CREATE POLICY "Only super admins can delete unverified payment documents"
  ON public.payment_documents FOR DELETE TO authenticated
  USING (public.is_super_admin() AND verification_status = 'pending');

-- payment_audit_logs: super_admin read; system write
CREATE POLICY "Super admins can view payment audit logs"
  ON public.payment_audit_logs FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Authenticated users can insert own audit log entries"
  ON public.payment_audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = performed_by OR public.is_super_admin());

-- ============================================================
-- Helper function: log a payment action
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_payment_action(
  _payment_id UUID,
  _action TEXT,
  _old_status TEXT DEFAULT NULL,
  _new_status TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email TEXT;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.payment_audit_logs (
    payment_id, action, performed_by, performed_by_email,
    old_status, new_status, notes, metadata
  ) VALUES (
    _payment_id, _action, auth.uid(), _email,
    _old_status, _new_status, _notes, _metadata
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_payment_action TO authenticated;

-- ============================================================
-- Trigger: auto-log payment verification changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_payment_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email TEXT;
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.payment_audit_logs (
      payment_id, action, performed_by, performed_by_email,
      old_status, new_status, notes, metadata
    ) VALUES (
      NEW.id,
      CASE NEW.verification_status
        WHEN 'confirmed'     THEN 'confirmed'
        WHEN 'rejected'      THEN 'rejected'
        WHEN 'under_review'  THEN 'under_review'
        ELSE 'status_changed'
      END,
      auth.uid(),
      _email,
      OLD.verification_status,
      NEW.verification_status,
      NEW.verification_notes,
      jsonb_build_object('amount', NEW.amount, 'property_id', NEW.property_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_payment_verification ON public.payments;
CREATE TRIGGER trg_audit_payment_verification
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_payment_verification();

-- ============================================================
-- Trigger: protect confirmed payment documents from deletion
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_confirmed_payment_docs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.verification_status IN ('confirmed', 'rejected') THEN
    RAISE EXCEPTION 'Cannot delete verified payment documents (status: %)', OLD.verification_status;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_confirmed_docs ON public.payment_documents;
CREATE TRIGGER trg_protect_confirmed_docs
  BEFORE DELETE ON public.payment_documents
  FOR EACH ROW EXECUTE FUNCTION public.protect_confirmed_payment_docs();

-- ============================================================
-- Realtime
-- ============================================================
ALTER TABLE public.payment_documents REPLICA IDENTITY FULL;
ALTER TABLE public.payment_audit_logs REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='payment_audit_logs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_audit_logs';
  END IF;
END $$;