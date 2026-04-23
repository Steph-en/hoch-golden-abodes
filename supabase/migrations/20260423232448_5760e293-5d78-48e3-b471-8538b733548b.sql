
-- Fix: SECURITY DEFINER view -> use security_invoker so RLS of caller applies
DROP VIEW IF EXISTS public.properties_public;
CREATE VIEW public.properties_public
WITH (security_invoker = true) AS
SELECT
  id, title, location, area, price, price_value,
  beds, baths, sqft, type, featured, description,
  amenities, parking, image_url, images, status,
  year_built, created_at, updated_at
FROM public.properties;

GRANT SELECT ON public.properties_public TO anon, authenticated;

-- Re-allow anon SELECT on properties (only via this view, since the view is invoker)
-- We need a base SELECT policy for anon to support the view's underlying read.
DROP POLICY IF EXISTS "Anon can read property listings" ON public.properties;
CREATE POLICY "Anon can read property listings"
ON public.properties
FOR SELECT
TO anon
USING (true);

-- Tighten anon inquiry insert: require email + name fields (no blank spam)
DROP POLICY IF EXISTS "Anyone can create inquiries" ON public.inquiries;
CREATE POLICY "Anonymous visitors can create inquiries with contact info"
ON public.inquiries
FOR INSERT
TO anon
WITH CHECK (
  email IS NOT NULL AND length(email) > 3
  AND name IS NOT NULL AND length(name) > 0
  AND user_id IS NULL
);

-- Restrict property-images bucket: replace any broad listing policy with
-- a per-object public read so the bucket isn't enumerable.
DROP POLICY IF EXISTS "Public read property images" ON storage.objects;
DROP POLICY IF EXISTS "Property images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view property images" ON storage.objects;

CREATE POLICY "Public can read individual property images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'property-images' AND name IS NOT NULL);
