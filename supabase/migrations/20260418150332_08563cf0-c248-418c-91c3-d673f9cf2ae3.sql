INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view property images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

CREATE POLICY "Admins can upload property images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update property images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete property images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-images' AND has_role(auth.uid(), 'admin'::app_role));