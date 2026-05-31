
-- Properties table (migrated from static data)
CREATE TABLE public.properties (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  area TEXT,
  price TEXT NOT NULL,
  price_value NUMERIC NOT NULL DEFAULT 0,
  beds INTEGER NOT NULL DEFAULT 0,
  baths INTEGER NOT NULL DEFAULT 0,
  sqft TEXT,
  type TEXT NOT NULL DEFAULT 'Villa',
  featured BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  amenities TEXT[] DEFAULT '{}',
  year_built INTEGER,
  parking INTEGER DEFAULT 0,
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'Available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agreements table
CREATE TABLE public.agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id INTEGER REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  document_url TEXT,
  signed_document_url TEXT,
  signature_url TEXT,
  signature_type TEXT DEFAULT 'draw',
  approval_status TEXT NOT NULL DEFAULT 'Pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id INTEGER REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id INTEGER REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC NOT NULL,
  invoice_pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Properties: everyone can read
CREATE POLICY "Anyone can view properties" ON public.properties FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage properties" ON public.properties FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Agreements: users see own, admins see all
CREATE POLICY "Users can view own agreements" ON public.agreements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own agreements" ON public.agreements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own agreements" ON public.agreements FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all agreements" ON public.agreements FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage agreements" ON public.agreements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Payments: users see own, admins see all
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Invoices: users see own, admins see all
CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all invoices" ON public.invoices FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage invoices" ON public.invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.agreements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;

-- Trigger: Auto-create invoice when agreement is approved
CREATE OR REPLACE FUNCTION public.handle_agreement_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status = 'Approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'Approved') THEN
    INSERT INTO public.invoices (user_id, property_id, total_amount, amount_paid, balance)
    SELECT NEW.user_id, NEW.property_id, p.price_value, 0, p.price_value
    FROM public.properties p WHERE p.id = NEW.property_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_agreement_approved
AFTER UPDATE ON public.agreements
FOR EACH ROW EXECUTE FUNCTION public.handle_agreement_approved();

-- Trigger: Update invoice when payment is confirmed
CREATE OR REPLACE FUNCTION public.handle_payment_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_paid NUMERIC;
  inv_total NUMERIC;
BEGIN
  IF NEW.status = 'Confirmed' AND (OLD.status IS NULL OR OLD.status != 'Confirmed') THEN
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.payments
    WHERE property_id = NEW.property_id AND user_id = NEW.user_id AND status = 'Confirmed';
    
    UPDATE public.invoices
    SET amount_paid = total_paid,
        balance = total_amount - total_paid,
        updated_at = now()
    WHERE property_id = NEW.property_id AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_payment_confirmed
AFTER UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.handle_payment_confirmed();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('agreements', 'agreements', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true);

-- Storage RLS policies
CREATE POLICY "Users can upload own agreements" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'agreements' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own agreements" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'agreements' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can view all agreements" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'agreements' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload own receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can view all receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload own signatures" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own signatures" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view invoices" ON storage.objects FOR SELECT USING (bucket_id = 'invoices');
CREATE POLICY "Admins can manage invoices" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'));

-- Seed properties from static data
INSERT INTO public.properties (id, title, location, area, price, price_value, beds, baths, sqft, type, featured, description, amenities, year_built, parking, status) VALUES
(1, 'Tropical Villa Retreat', 'East Legon, Accra', 'East Legon', '$850,000', 850000, 5, 4, '4,200', 'Villa', true, 'Experience luxury living in this magnificent tropical villa nestled in the heart of East Legon.', ARRAY['Swimming Pool', 'Garden', 'Smart Home', 'Security System', 'Generator', 'Staff Quarters'], 2022, 4, 'Available'),
(2, 'Modern City Apartment', 'Airport Residential, Accra', 'Airport Residential', '$320,000', 320000, 3, 2, '1,800', 'Apartment', false, 'Sleek contemporary apartment in the prestigious Airport Residential area.', ARRAY['Gym', 'Concierge', 'Rooftop Terrace', 'Underground Parking', '24/7 Security'], 2023, 2, 'Available'),
(3, 'Executive Townhouse', 'Cantonments, Accra', 'Cantonments', '$520,000', 520000, 4, 3, '2,600', 'Townhouse', true, 'Elegant townhouse in the diplomatic enclave of Cantonments.', ARRAY['Private Courtyard', 'Home Office', 'Backup Power', 'Fiber Internet', 'Air Conditioning'], 2021, 2, 'Available'),
(4, 'Beachfront Paradise', 'Cape Coast', 'Cape Coast', '$1,200,000', 1200000, 6, 5, '5,500', 'Villa', true, 'Wake up to breathtaking ocean views in this luxurious beachfront villa.', ARRAY['Beach Access', 'Infinity Pool', 'Outdoor Kitchen', 'Wine Cellar', 'Guest House', 'Boat Dock'], 2020, 6, 'Available'),
(5, 'Commercial Complex', 'Osu, Accra', 'Osu', '$2,500,000', 2500000, 0, 0, '12,000', 'Commercial', false, 'Prime commercial property in the bustling heart of Osu.', ARRAY['Elevator', 'Loading Dock', 'Central Air', 'CCTV', 'Backup Generator', 'Conference Rooms'], 2019, 20, 'Available'),
(6, 'Skyline Penthouse', 'Ridge, Accra', 'Ridge', '$780,000', 780000, 4, 3, '3,200', 'Penthouse', true, 'Exclusive penthouse offering 360-degree views of Accra skyline.', ARRAY['Private Elevator', 'Rooftop Terrace', 'Smart Home', 'Wine Room', 'Home Theater', 'Sauna'], 2024, 3, 'Available');

SELECT setval('properties_id_seq', 6);
