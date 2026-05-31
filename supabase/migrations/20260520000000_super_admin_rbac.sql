-- ============================================================
-- RBAC: Super Admin only RLS policies
-- Run this in Supabase SQL editor or via supabase db push
-- ============================================================

-- 1. Helper: check super_admin role
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

-- 2. agreements
DROP POLICY IF EXISTS "Admins can view all agreements" ON public.agreements;
DROP POLICY IF EXISTS "Admins can manage agreements" ON public.agreements;
CREATE POLICY "Super admins can view all agreements"
  ON public.agreements FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super admins can manage agreements"
  ON public.agreements FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 3. payments
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
CREATE POLICY "Super admins can view all payments"
  ON public.payments FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super admins can manage payments"
  ON public.payments FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 4. invoices
DROP POLICY IF EXISTS "Admins can view all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;
CREATE POLICY "Super admins can view all invoices"
  ON public.invoices FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super admins can manage invoices"
  ON public.invoices FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 5. inquiries
DROP POLICY IF EXISTS "Admins can view all inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Admins can update inquiries" ON public.inquiries;
CREATE POLICY "Super admins can view all inquiries"
  ON public.inquiries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin());
CREATE POLICY "Super admins can update inquiries"
  ON public.inquiries FOR UPDATE TO authenticated USING (public.is_super_admin());

-- 6. profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_super_admin());
CREATE POLICY "Super admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_super_admin());

-- 7. user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Super admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin());

-- 8. activity_logs
DROP POLICY IF EXISTS "Admins can view all activity" ON public.activity_logs;
CREATE POLICY "Super admins can view all activity"
  ON public.activity_logs FOR SELECT TO authenticated USING (public.is_super_admin());

-- 9. role_audit_log
DROP POLICY IF EXISTS "Admins can view role audit log" ON public.role_audit_log;
CREATE POLICY "Super admins can view role audit log"
  ON public.role_audit_log FOR SELECT TO authenticated USING (public.is_super_admin());

-- 10. property_audit_log
DROP POLICY IF EXISTS "Admins view property audit" ON public.property_audit_log;
CREATE POLICY "Super admins view property audit"
  ON public.property_audit_log FOR SELECT TO authenticated USING (public.is_super_admin());

-- 11. enquiry_messages
DROP POLICY IF EXISTS "Admins can view all enquiry messages" ON public.enquiry_messages;
DROP POLICY IF EXISTS "Only admins can update enquiry messages" ON public.enquiry_messages;
DROP POLICY IF EXISTS "Users can insert messages to their enquiries" ON public.enquiry_messages;
CREATE POLICY "Super admins can view all enquiry messages"
  ON public.enquiry_messages FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (SELECT 1 FROM public.inquiries i WHERE i.id = enquiry_id AND i.user_id = auth.uid())
  );
CREATE POLICY "Super admins can update enquiry messages"
  ON public.enquiry_messages FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Users and super admins can insert enquiry messages"
  ON public.enquiry_messages FOR INSERT TO authenticated
  WITH CHECK (
    (sender_role = 'user' AND sender_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.inquiries i WHERE i.id = enquiry_id AND i.user_id = auth.uid()))
    OR (sender_role IN ('admin','super_admin') AND public.is_super_admin())
  );

-- 12. enquiry_message_receipts
DROP POLICY IF EXISTS "Admins can view all receipts" ON public.enquiry_message_receipts;
CREATE POLICY "Super admins can view all receipts"
  ON public.enquiry_message_receipts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin());

-- 13. notifications
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "System inserts via definer" ON public.notifications;
CREATE POLICY "Super admins can view all notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin());
CREATE POLICY "Users and super admins can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_super_admin());

-- 14. bookings: admin + super_admin access kept
DROP POLICY IF EXISTS "Admins view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins manage bookings" ON public.bookings;
CREATE POLICY "Admins and super admins view all bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.is_super_admin());
CREATE POLICY "Admins and super admins manage bookings"
  ON public.bookings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin());

-- 15. rooms: admin + super_admin kept
DROP POLICY IF EXISTS "Admins can manage rooms" ON public.rooms;
CREATE POLICY "Admins and super admins manage rooms"
  ON public.rooms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin());

-- 16. room_availability: admin + super_admin kept
DROP POLICY IF EXISTS "Admins manage availability" ON public.room_availability;
CREATE POLICY "Admins and super admins manage availability"
  ON public.room_availability FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin());

-- 17. properties: admin + super_admin kept
DROP POLICY IF EXISTS "Admins can manage properties" ON public.properties;
CREATE POLICY "Admins and super admins manage properties"
  ON public.properties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin());

-- ============================================================
-- 18. Functions — DROP before recreating (avoids type errors)
-- ============================================================

DROP FUNCTION IF EXISTS public.list_users_with_roles();
CREATE FUNCTION public.list_users_with_roles()
RETURNS TABLE (
  user_id uuid, email text, display_name text,
  created_at timestamptz, roles app_role[]
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can list all users';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, p.display_name, u.created_at,
    COALESCE(ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}'::app_role[])
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  GROUP BY u.id, u.email, p.display_name, u.created_at
  ORDER BY u.created_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.list_role_audit_log(text, app_role, timestamptz, timestamptz, int);
CREATE FUNCTION public.list_role_audit_log(
  _action text DEFAULT NULL, _role app_role DEFAULT NULL,
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid, target_user_id uuid, target_email text, role app_role,
  action text, performed_by uuid, performed_by_email text, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can view the audit log';
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

DROP FUNCTION IF EXISTS public.get_admin_count();
CREATE FUNCTION public.get_admin_count()
RETURNS int LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _count int;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can view this';
  END IF;
  SELECT count(*) INTO _count FROM public.user_roles WHERE role = 'admin';
  RETURN _count;
END;
$$;

DROP FUNCTION IF EXISTS public.list_admin_users();
CREATE FUNCTION public.list_admin_users()
RETURNS TABLE (
  user_id uuid, email text, display_name text,
  created_at timestamptz, last_sign_in_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can view admin users';
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

DROP FUNCTION IF EXISTS public.assign_role(uuid, app_role);
CREATE FUNCTION public.assign_role(_target_user_id uuid, _role app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _caller_email text; _target_email text;
BEGIN
  IF _caller IS NULL OR NOT public.is_super_admin(_caller) THEN
    RAISE EXCEPTION 'Only super admins can assign roles';
  END IF;
  SELECT email INTO _caller_email FROM auth.users WHERE id = _caller;
  SELECT email INTO _target_email FROM auth.users WHERE id = _target_user_id;
  IF _target_email IS NULL THEN RAISE EXCEPTION 'Target user does not exist'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.role_audit_log (target_user_id, target_email, role, action, performed_by, performed_by_email)
    VALUES (_target_user_id, _target_email, _role, 'granted', _caller, _caller_email);
END;
$$;

DROP FUNCTION IF EXISTS public.revoke_role(uuid, app_role);
CREATE FUNCTION public.revoke_role(_target_user_id uuid, _role app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _caller_email text; _target_email text; _admin_count int;
BEGIN
  IF _caller IS NULL OR NOT public.is_super_admin(_caller) THEN
    RAISE EXCEPTION 'Only super admins can revoke roles';
  END IF;
  IF _role = 'admin' AND _caller = _target_user_id THEN
    RAISE EXCEPTION 'You cannot revoke your own admin role';
  END IF;
  IF _role = 'admin' THEN
    SELECT count(*) INTO _admin_count FROM public.user_roles WHERE role = 'admin';
    IF _admin_count <= 1 THEN RAISE EXCEPTION 'Cannot remove the last admin'; END IF;
  END IF;
  SELECT email INTO _caller_email FROM auth.users WHERE id = _caller;
  SELECT email INTO _target_email FROM auth.users WHERE id = _target_user_id;
  DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = _role;
  INSERT INTO public.role_audit_log (target_user_id, target_email, role, action, performed_by, performed_by_email)
    VALUES (_target_user_id, _target_email, _role, 'revoked', _caller, _caller_email);
END;
$$;

DROP FUNCTION IF EXISTS public.suspend_user(uuid, text);
CREATE FUNCTION public.suspend_user(_target_user_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can suspend users';
  END IF;
  UPDATE public.profiles SET suspended = true, suspended_at = now() WHERE id = _target_user_id;
END;
$$;

DROP FUNCTION IF EXISTS public.reactivate_user(uuid);
CREATE FUNCTION public.reactivate_user(_target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can reactivate users';
  END IF;
  UPDATE public.profiles SET suspended = false, suspended_at = NULL WHERE id = _target_user_id;
END;
$$;