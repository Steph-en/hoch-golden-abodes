
-- 1. Add super_admin role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Extend properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS gps_lat numeric,
  ADD COLUMN IF NOT EXISTS gps_lng numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS owner_email text,
  ADD COLUMN IF NOT EXISTS owner_phone text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 3. Slug generator
CREATE OR REPLACE FUNCTION public.slugify(_input text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(_input,'')), '[^a-z0-9]+', '-', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.set_property_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  base text;
  candidate text;
  n int := 0;
BEGIN
  IF NEW.slug IS NULL OR length(NEW.slug) = 0 THEN
    base := public.slugify(NEW.title);
    IF base = '' THEN base := 'property'; END IF;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.properties WHERE slug = candidate AND id <> COALESCE(NEW.id, -1)) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_property_slug ON public.properties;
CREATE TRIGGER trg_set_property_slug
  BEFORE INSERT OR UPDATE OF title, slug ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_property_slug();

-- Backfill slugs for existing rows
UPDATE public.properties SET slug = NULL WHERE slug IS NULL;
UPDATE public.properties p SET slug = public.slugify(p.title) || '-' || p.id WHERE p.slug IS NULL;

-- 4. Property audit log
CREATE TABLE IF NOT EXISTS public.property_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id integer,
  action text NOT NULL,
  performed_by uuid,
  performed_by_email text,
  changes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view property audit" ON public.property_audit_log;
CREATE POLICY "Admins view property audit" ON public.property_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_property_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.property_audit_log (property_id, action, performed_by, performed_by_email, changes)
    VALUES (NEW.id, 'created', auth.uid(), _email, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.property_audit_log (property_id, action, performed_by, performed_by_email, changes)
    VALUES (NEW.id, CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'soft_deleted' ELSE 'updated' END,
            auth.uid(), _email,
            jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.property_audit_log (property_id, action, performed_by, performed_by_email, changes)
    VALUES (OLD.id, 'deleted', auth.uid(), _email, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_property_change ON public.properties;
CREATE TRIGGER trg_log_property_change
  AFTER INSERT OR UPDATE OR DELETE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.log_property_change();

-- 5. Hide soft-deleted from public reads
DROP POLICY IF EXISTS "Anon can read property listings" ON public.properties;
CREATE POLICY "Anon can read property listings" ON public.properties
  FOR SELECT TO anon USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated users can view properties" ON public.properties;
CREATE POLICY "Authenticated users can view properties" ON public.properties
  FOR SELECT TO authenticated USING (deleted_at IS NULL OR public.has_role(auth.uid(), 'admin'));
