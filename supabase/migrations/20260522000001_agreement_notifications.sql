-- ============================================================
-- Agreement lifecycle in-app notifications
-- Auto-notifies users and super_admins on status changes
-- ============================================================

-- 1. Notify user when agreement status changes, and notify
--    super_admins when a signed document is uploaded.

CREATE OR REPLACE FUNCTION public.notify_agreement_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _title  text;
  _body   text;
  _type   text := 'agreement';
  _link   text := '/dashboard';
BEGIN
  -- ── INSERT: new agreement created → notify user ──────────────────────────
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, body, type, link, metadata)
    VALUES (
      NEW.user_id,
      'New agreement ready for review',
      'An agreement has been created for your property. Please open it, download the document, sign it, and upload the signed copy.',
      _type,
      _link,
      jsonb_build_object(
        'agreement_id', NEW.id,
        'property_id',  NEW.property_id,
        'status',       NEW.agreement_status
      )
    );
    RETURN NEW;
  END IF;

  -- ── UPDATE: only act when agreement_status actually changes ──────────────
  IF OLD.agreement_status IS NOT DISTINCT FROM NEW.agreement_status THEN
    RETURN NEW;
  END IF;

  -- Determine message for the user
  CASE NEW.agreement_status
    WHEN 'uploaded' THEN
      -- Confirm receipt to user
      _title := 'Signed agreement received';
      _body  := 'We have received your signed agreement. Our team will review it shortly.';
    WHEN 'under_review' THEN
      _title := 'Agreement under review';
      _body  := 'Your signed agreement is currently being reviewed by our team.';
    WHEN 'verified' THEN
      _title := '✓ Agreement verified';
      _body  := 'Great news — your agreement has been verified and approved.';
    WHEN 'rejected' THEN
      _title := 'Agreement submission rejected';
      _body  := 'Your agreement submission was not accepted. Please check the admin notes in your dashboard and upload a corrected signed document.';
    WHEN 'archived' THEN
      _title := 'Agreement archived';
      _body  := 'Your agreement has been archived for your records.';
    ELSE
      -- Unknown status: still return without notification
      RETURN NEW;
  END CASE;

  -- Notify the agreement owner
  INSERT INTO public.notifications (user_id, title, body, type, link, metadata)
  VALUES (
    NEW.user_id,
    _title,
    _body,
    _type,
    _link,
    jsonb_build_object(
      'agreement_id',     NEW.id,
      'property_id',      NEW.property_id,
      'status',           NEW.agreement_status,
      'verification_notes', NEW.verification_notes
    )
  );

  -- When user uploads a signed doc, also notify all super_admins
  IF NEW.agreement_status = 'uploaded'
     AND OLD.agreement_status IS DISTINCT FROM 'uploaded'
  THEN
    INSERT INTO public.notifications (user_id, title, body, type, link, metadata)
    SELECT
      ur.user_id,
      'Signed agreement uploaded — awaiting review',
      'A client has uploaded a signed agreement document that requires your verification.',
      'agreement',
      '/admin',
      jsonb_build_object(
        'agreement_id', NEW.id,
        'property_id',  NEW.property_id,
        'user_id',      NEW.user_id,
        'status',       NEW.agreement_status
      )
    FROM public.user_roles ur
    WHERE ur.role = 'super_admin';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Attach trigger (INSERT + UPDATE)
DROP TRIGGER IF EXISTS trg_agreement_notifications ON public.agreements;
CREATE TRIGGER trg_agreement_notifications
  AFTER INSERT OR UPDATE ON public.agreements
  FOR EACH ROW EXECUTE FUNCTION public.notify_agreement_change();

-- 3. Ensure agreements are in realtime publication (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agreements'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.agreements';
  END IF;
END $$;