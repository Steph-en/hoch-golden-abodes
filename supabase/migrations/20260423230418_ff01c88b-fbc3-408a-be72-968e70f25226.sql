-- 1. Audit log table
CREATE TABLE public.role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  target_email text,
  role app_role NOT NULL,
  action text NOT NULL CHECK (action IN ('granted','revoked')),
  performed_by uuid,
  performed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view role audit log"
ON public.role_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- No direct INSERT policy: writes happen only via SECURITY DEFINER functions below.

-- 2. Assign role (admin only)
CREATE OR REPLACE FUNCTION public.assign_role(_target_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _caller_email text;
  _target_email text;
BEGIN
  IF _caller IS NULL OR NOT public.has_role(_caller, 'admin') THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;

  SELECT email INTO _caller_email FROM auth.users WHERE id = _caller;
  SELECT email INTO _target_email FROM auth.users WHERE id = _target_user_id;

  IF _target_email IS NULL THEN
    RAISE EXCEPTION 'Target user does not exist';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.role_audit_log (target_user_id, target_email, role, action, performed_by, performed_by_email)
  VALUES (_target_user_id, _target_email, _role, 'granted', _caller, _caller_email);
END;
$$;

-- 3. Revoke role (admin only) with self-revoke + last-admin guards
CREATE OR REPLACE FUNCTION public.revoke_role(_target_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _caller_email text;
  _target_email text;
  _admin_count int;
BEGIN
  IF _caller IS NULL OR NOT public.has_role(_caller, 'admin') THEN
    RAISE EXCEPTION 'Only admins can revoke roles';
  END IF;

  IF _role = 'admin' AND _caller = _target_user_id THEN
    RAISE EXCEPTION 'You cannot revoke your own admin role';
  END IF;

  IF _role = 'admin' THEN
    SELECT count(*) INTO _admin_count FROM public.user_roles WHERE role = 'admin';
    IF _admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last admin';
    END IF;
  END IF;

  SELECT email INTO _caller_email FROM auth.users WHERE id = _caller;
  SELECT email INTO _target_email FROM auth.users WHERE id = _target_user_id;

  DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = _role;

  INSERT INTO public.role_audit_log (target_user_id, target_email, role, action, performed_by, performed_by_email)
  VALUES (_target_user_id, _target_email, _role, 'revoked', _caller, _caller_email);
END;
$$;

-- 4. Ensure uniqueness for ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_uidx ON public.user_roles (user_id, role);

-- 5. Admin-only directory of users with their roles + emails
CREATE OR REPLACE FUNCTION public.list_users_with_roles()
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  roles app_role[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can list users';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    p.display_name,
    u.created_at,
    COALESCE(ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}'::app_role[]) AS roles
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  GROUP BY u.id, u.email, p.display_name, u.created_at
  ORDER BY u.created_at DESC;
END;
$$;