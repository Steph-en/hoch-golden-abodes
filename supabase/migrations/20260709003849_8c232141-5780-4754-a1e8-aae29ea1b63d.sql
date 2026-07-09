
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_properties_is_archived ON public.properties(is_archived);

CREATE OR REPLACE FUNCTION public.archive_property(_property_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can archive properties'; END IF;
  UPDATE public.properties SET is_archived = true, updated_at = now() WHERE id = _property_id;
END; $$;

CREATE OR REPLACE FUNCTION public.restore_property(_property_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can restore properties'; END IF;
  UPDATE public.properties SET is_archived = false, deleted_at = NULL, updated_at = now() WHERE id = _property_id;
END; $$;

CREATE OR REPLACE FUNCTION public.permanent_delete_property(_property_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can delete properties'; END IF;
  DELETE FROM public.properties WHERE id = _property_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.archive_property(bigint), public.restore_property(bigint), public.permanent_delete_property(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_property(bigint), public.restore_property(bigint), public.permanent_delete_property(bigint) TO authenticated;
