
-- Shared timestamp trigger fn (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TYPE public.listing_kind AS ENUM ('sale', 'rental_property', 'hotel', 'commercial_rental');

ALTER TABLE public.properties
  ADD COLUMN listing_kind public.listing_kind NOT NULL DEFAULT 'sale';

CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id INTEGER NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  room_type TEXT,
  capacity INTEGER NOT NULL DEFAULT 2,
  bed_config TEXT,
  amenities TEXT[] NOT NULL DEFAULT '{}',
  images TEXT[] NOT NULL DEFAULT '{}',
  nightly_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active',
  booking_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rooms_property ON public.rooms(property_id);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Admins can manage rooms" ON public.rooms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.room_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'blocked',
  booking_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);
CREATE INDEX idx_room_avail_room_dates ON public.room_availability(room_id, start_date, end_date);
ALTER TABLE public.room_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view availability" ON public.room_availability FOR SELECT USING (true);
CREATE POLICY "Admins manage availability" ON public.room_availability FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  property_id INTEGER NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  user_id UUID,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  nightly_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (check_out > check_in),
  CHECK (nights > 0)
);
CREATE INDEX idx_bookings_room_dates ON public.bookings(room_id, check_in, check_out);
CREATE INDEX idx_bookings_user ON public.bookings(user_id);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bookings" ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins view all bookings" ON public.bookings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own bookings" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Guests can create bookings" ON public.bookings FOR INSERT TO anon
  WITH CHECK (user_id IS NULL AND guest_email IS NOT NULL AND length(guest_email) > 3 AND guest_name IS NOT NULL);
CREATE POLICY "Admins manage bookings" ON public.bookings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users cancel own bookings" ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_rooms_updated BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.check_room_availability(
  _room_id UUID, _check_in DATE, _check_out DATE
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _check_out <= _check_in THEN RETURN false; END IF;
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE room_id = _room_id AND status IN ('pending','confirmed')
      AND NOT (check_out <= _check_in OR check_in >= _check_out)
  ) THEN RETURN false; END IF;
  IF EXISTS (
    SELECT 1 FROM public.room_availability
    WHERE room_id = _room_id AND status = 'blocked'
      AND NOT (end_date <= _check_in OR start_date >= _check_out)
  ) THEN RETURN false; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking(
  _room_id UUID,
  _check_in DATE,
  _check_out DATE,
  _guests INTEGER,
  _guest_name TEXT,
  _guest_email TEXT,
  _guest_phone TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _room public.rooms%ROWTYPE;
  _nights INTEGER;
  _total NUMERIC;
  _booking_id UUID;
  _uid UUID := auth.uid();
BEGIN
  IF _check_out <= _check_in THEN RAISE EXCEPTION 'Check-out must be after check-in'; END IF;
  IF _guests < 1 THEN RAISE EXCEPTION 'Guest count must be at least 1'; END IF;
  IF _guest_name IS NULL OR length(trim(_guest_name)) = 0 THEN RAISE EXCEPTION 'Guest name required'; END IF;
  IF _guest_email IS NULL OR length(_guest_email) < 3 THEN RAISE EXCEPTION 'Guest email required'; END IF;

  SELECT * INTO _room FROM public.rooms WHERE id = _room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF _room.status <> 'active' THEN RAISE EXCEPTION 'Room not bookable'; END IF;
  IF _guests > _room.capacity THEN RAISE EXCEPTION 'Exceeds room capacity (%)', _room.capacity; END IF;
  IF NOT public.check_room_availability(_room_id, _check_in, _check_out) THEN
    RAISE EXCEPTION 'Room is not available for selected dates';
  END IF;

  _nights := (_check_out - _check_in);
  _total := _nights * _room.nightly_price;

  INSERT INTO public.bookings (
    room_id, property_id, user_id, guest_name, guest_email, guest_phone,
    check_in, check_out, nights, guests, nightly_price, total_amount, currency, notes
  ) VALUES (
    _room_id, _room.property_id, _uid, _guest_name, _guest_email, _guest_phone,
    _check_in, _check_out, _nights, _guests, _room.nightly_price, _total, _room.currency, _notes
  ) RETURNING id INTO _booking_id;

  RETURN _booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_room_availability(UUID, DATE, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking(UUID, DATE, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
