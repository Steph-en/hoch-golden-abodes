
-- 1. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  link text,
  read boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all notifications" ON public.notifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts via definer" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 2. Booking notification trigger
CREATE OR REPLACE FUNCTION public.notify_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _title text;
  _body text;
  _type text := 'booking';
  _link text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  _link := '/dashboard';

  IF TG_OP = 'INSERT' THEN
    _title := 'Booking received';
    _body := 'Your booking for ' || NEW.check_in || ' → ' || NEW.check_out || ' has been received and is pending confirmation.';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'confirmed' THEN
        _title := 'Booking confirmed';
        _body := 'Your stay from ' || NEW.check_in || ' to ' || NEW.check_out || ' is confirmed.';
      ELSIF NEW.status = 'cancelled' THEN
        _title := 'Booking cancelled';
        _body := 'Your booking from ' || NEW.check_in || ' to ' || NEW.check_out || ' has been cancelled.';
      ELSIF NEW.status = 'completed' THEN
        _title := 'Stay completed';
        _body := 'Thank you for staying with us!';
      ELSE
        _title := 'Booking updated';
        _body := 'Your booking status changed to ' || NEW.status || '.';
      END IF;
    ELSIF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      _title := 'Payment status updated';
      _body := 'Payment for your booking is now: ' || NEW.payment_status || '.';
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, type, link, metadata)
  VALUES (NEW.user_id, _title, _body, _type, _link,
    jsonb_build_object('booking_id', NEW.id, 'room_id', NEW.room_id, 'property_id', NEW.property_id,
                       'status', NEW.status, 'payment_status', NEW.payment_status));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_notify ON public.bookings;
CREATE TRIGGER trg_booking_notify
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_change();

-- 3. Overlap prevention for availability blocks
CREATE OR REPLACE FUNCTION public.prevent_overlap_blocks()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;

  -- Conflict with another block on the same room
  IF EXISTS (
    SELECT 1 FROM public.room_availability
    WHERE room_id = NEW.room_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status = 'blocked'
      AND NOT (end_date <= NEW.start_date OR start_date >= NEW.end_date)
  ) THEN
    RAISE EXCEPTION 'Overlaps an existing availability block for this room';
  END IF;

  -- Conflict with active booking
  IF NEW.status = 'blocked' AND EXISTS (
    SELECT 1 FROM public.bookings
    WHERE room_id = NEW.room_id
      AND status IN ('pending','confirmed')
      AND NOT (check_out <= NEW.start_date OR check_in >= NEW.end_date)
  ) THEN
    RAISE EXCEPTION 'Overlaps an active booking for this room';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_room_availability_no_overlap ON public.room_availability;
CREATE TRIGGER trg_room_availability_no_overlap
BEFORE INSERT OR UPDATE ON public.room_availability
FOR EACH ROW EXECUTE FUNCTION public.prevent_overlap_blocks();

-- 4. Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications';
  IF NOT FOUND THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications'; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='bookings';
  IF NOT FOUND THEN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings'; END IF;
END $$;
