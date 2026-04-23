
-- 1. Public properties view (safe columns only) for anonymous browsing
CREATE OR REPLACE VIEW public.properties_public AS
SELECT
  id, title, location, area, price, price_value,
  beds, baths, sqft, type, featured, description,
  amenities, parking, image_url, images, status,
  year_built, created_at, updated_at
FROM public.properties
WHERE status = 'Available' OR status = 'Sold' OR status = 'Reserved';

GRANT SELECT ON public.properties_public TO anon, authenticated;

-- 2. Tighten properties table: remove the broad "Anyone can view" policy,
--    keep public reads via the view above, allow authenticated users full read.
DROP POLICY IF EXISTS "Anyone can view properties" ON public.properties;

CREATE POLICY "Authenticated users can view properties"
ON public.properties
FOR SELECT
TO authenticated
USING (true);

-- 3. Make invoices bucket private (admins use service role / signed URLs)
UPDATE storage.buckets SET public = false WHERE id = 'invoices';

-- Storage policies for invoices: owner can read their files, admins manage all
DROP POLICY IF EXISTS "Users can read own invoices" ON storage.objects;
CREATE POLICY "Users can read own invoices"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'invoices'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Admins manage invoices bucket" ON storage.objects;
CREATE POLICY "Admins manage invoices bucket"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'));

-- 4. Admin-only RPC: filtered audit log
CREATE OR REPLACE FUNCTION public.list_role_audit_log(
  _action text DEFAULT NULL,
  _role app_role DEFAULT NULL,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  target_user_id uuid,
  target_email text,
  role app_role,
  action text,
  performed_by uuid,
  performed_by_email text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can view the audit log';
  END IF;

  RETURN QUERY
  SELECT a.id, a.target_user_id, a.target_email, a.role, a.action,
         a.performed_by, a.performed_by_email, a.created_at
  FROM public.role_audit_log a
  WHERE (_action IS NULL OR a.action = _action)
    AND (_role IS NULL OR a.role = _role)
    AND (_from IS NULL OR a.created_at >= _from)
    AND (_to IS NULL OR a.created_at <= _to)
  ORDER BY a.created_at DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;

-- 5. Admin-only RPC: current admin count (used by safety warnings)
CREATE OR REPLACE FUNCTION public.get_admin_count()
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can view this';
  END IF;
  SELECT count(*) INTO _count FROM public.user_roles WHERE role = 'admin';
  RETURN _count;
END;
$$;

-- 6. Admin-only RPC: list admins with last sign-in
CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can view admin users';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::text, p.display_name, u.created_at, u.last_sign_in_at
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE ur.role = 'admin'
  ORDER BY u.last_sign_in_at DESC NULLS LAST;
END;
$$;
