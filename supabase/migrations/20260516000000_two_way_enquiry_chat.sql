-- Two-way enquiry chat: enquiry_messages + per-recipient receipts

-- Note: we keep existing tables (inquiries, enquiry_responses) for historical compatibility.

-- 1) App role helper (if not already present in earlier migrations)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

-- 2) Main chat table
CREATE TABLE IF NOT EXISTS public.enquiry_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('user','admin','super_admin')),
  message text NOT NULL,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enquiry_messages ENABLE ROW LEVEL SECURITY;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_enquiry_messages_enquiry_id_created_at
  ON public.enquiry_messages(enquiry_id, created_at);

-- 3) Read receipts (per-recipient)
CREATE TABLE IF NOT EXISTS public.enquiry_message_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.enquiry_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.enquiry_message_receipts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_enquiry_message_receipts_user_id
  ON public.enquiry_message_receipts(user_id);

-- 4) RLS policies for enquiry_messages

-- Select:
-- - Users can view messages for enquiries they own
-- - Admins can view all
CREATE POLICY "Users can view messages in their enquiries" ON public.enquiry_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inquiries i
      WHERE i.id = enquiry_id
        AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all enquiry messages" ON public.enquiry_messages
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Insert:
-- - Only authenticated users
-- - User sender must be the enquiry owner
-- - Admin sender can insert (admin-only). super_admin is also admin role in this system.
CREATE POLICY "Users can insert messages to their enquiries" ON public.enquiry_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      sender_role = 'user'
      AND sender_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.inquiries i
        WHERE i.id = enquiry_id AND i.user_id = auth.uid()
      )
    )
    OR
    (
      sender_role IN ('admin','super_admin')
      AND public.has_role(auth.uid(), 'admin')
    )
  );

-- Update: restrict (messages should be append-only)
CREATE POLICY "Only admins can update enquiry messages" ON public.enquiry_messages
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) RLS policies for receipts

-- Select receipts only for the same user/admin who owns the receipt row.
-- Users can see their own receipts; admins can see all receipts.
CREATE POLICY "Users can view their receipts" ON public.enquiry_message_receipts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all receipts" ON public.enquiry_message_receipts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert receipts only for the user themselves.
CREATE POLICY "Users can mark messages as read" ON public.enquiry_message_receipts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update receipts only for the user themself.
CREATE POLICY "Users can update their receipts" ON public.enquiry_message_receipts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6) Realtime for enquiry_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.enquiry_messages;
