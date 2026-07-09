
-- 1. Invoices bucket: remove public SELECT policy
DROP POLICY IF EXISTS "Anyone can view invoices" ON storage.objects;

-- 2. Property-images: replace ineffective policy with a clear bucket-scoped public read
DROP POLICY IF EXISTS "Public can view property images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;
DROP POLICY IF EXISTS "Property images are publicly accessible" ON storage.objects;
CREATE POLICY "Public read property-images bucket only"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-images');

-- 3. role_audit_log: block direct client inserts (SECURITY DEFINER functions bypass RLS)
DROP POLICY IF EXISTS "No direct inserts to role audit log" ON public.role_audit_log;
CREATE POLICY "No direct inserts to role audit log"
ON public.role_audit_log FOR INSERT
TO anon, authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "No direct updates to role audit log" ON public.role_audit_log;
CREATE POLICY "No direct updates to role audit log"
ON public.role_audit_log FOR UPDATE
TO anon, authenticated
USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No direct deletes from role audit log" ON public.role_audit_log;
CREATE POLICY "No direct deletes from role audit log"
ON public.role_audit_log FOR DELETE
TO anon, authenticated
USING (false);

-- Same hardening for property_audit_log while we're here (analogous surface)
DROP POLICY IF EXISTS "No direct inserts to property audit log" ON public.property_audit_log;
CREATE POLICY "No direct inserts to property audit log"
ON public.property_audit_log FOR INSERT
TO anon, authenticated
WITH CHECK (false);

-- 4. Revoke EXECUTE on trigger-only SECURITY DEFINER functions from anon & authenticated
REVOKE EXECUTE ON FUNCTION public.handle_agreement_approved() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_payment_confirmed() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_property_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_booking_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_property_slug() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_overlap_blocks() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- Also revoke anon from admin-only RPCs (still callable by authenticated users; each enforces admin check internally)
REVOKE EXECUTE ON FUNCTION public.assign_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.revoke_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_role_audit_log(text, app_role, timestamptz, timestamptz, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_admin_count() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_admin_users() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_users_with_roles() FROM anon, public;

-- 5. Fix mutable search_path on slugify
CREATE OR REPLACE FUNCTION public.slugify(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(_input,'')), '[^a-z0-9]+', '-', 'g'));
$function$;
