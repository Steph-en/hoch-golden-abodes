
-- Rooms and availability: require authentication
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.rooms;
CREATE POLICY "Authenticated users can view rooms" ON public.rooms
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view availability" ON public.room_availability;
CREATE POLICY "Authenticated users can view availability" ON public.room_availability
  FOR SELECT TO authenticated USING (true);

-- Property-images bucket: drop redundant broad SELECT policy
DROP POLICY IF EXISTS "Public read property-images bucket only" ON storage.objects;
DROP POLICY IF EXISTS "Public can read individual property images" ON storage.objects;
CREATE POLICY "Public can read property images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'property-images' AND name IS NOT NULL AND position('/' in name) > 0);

-- Revoke EXECUTE from PUBLIC/anon on all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assign_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_users_with_roles() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_admin_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_role_audit_log(text, app_role, timestamptz, timestamptz, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_count() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.archive_property(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restore_property(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.permanent_delete_property(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_booking(uuid, date, date, integer, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_room_availability(uuid, date, date) FROM PUBLIC, anon;

-- Trigger-only functions: revoke from authenticated too
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_agreement_approved() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_payment_confirmed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_booking_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_property_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_property_slug() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_overlap_blocks() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.slugify(text) FROM PUBLIC, anon, authenticated;
