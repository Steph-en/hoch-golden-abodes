-- Backfill enquiry_messages from existing enquiries + enquiry_responses

-- This migration:
-- 1) Creates an initial message per inquiry (the original enquiry.message) as sender_role='user'
-- 2) Migrates existing enquiry_responses into enquiry_messages as sender_role='admin'
-- 3) Creates initial receipts for the message sender (marks them as read)

-- IMPORTANT: This assumes the original schema:
-- - public.inquiries has: id, user_id, name, email, phone, message, status, created_at
-- - public.enquiry_responses has: id, inquiry_id, responder_id, message, created_at

-- 1) Create user-side initial messages (one per inquiry)
INSERT INTO public.enquiry_messages (
  id,
  enquiry_id,
  sender_id,
  sender_role,
  message,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() AS id,
  i.id AS enquiry_id,
  i.user_id AS sender_id,
  'user'::text AS sender_role,
  COALESCE(i.message, '') AS message,
  COALESCE(i.created_at, now()) AS created_at,
  COALESCE(i.created_at, now()) AS updated_at
FROM public.inquiries i
WHERE i.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.enquiry_messages m
    WHERE m.enquiry_id = i.id AND m.sender_role = 'user'
  );

-- 2) Migrate admin responses into enquiry_messages
INSERT INTO public.enquiry_messages (
  enquiry_id,
  sender_id,
  sender_role,
  message,
  created_at,
  updated_at
)
SELECT
  r.inquiry_id AS enquiry_id,
  r.responder_id AS sender_id,
  'admin'::text AS sender_role,
  r.message AS message,
  COALESCE(r.created_at, now()) AS created_at,
  COALESCE(r.created_at, now()) AS updated_at
FROM public.enquiry_responses r
WHERE NOT EXISTS (
  SELECT 1
  FROM public.enquiry_messages m
  WHERE m.enquiry_id = r.inquiry_id
    AND m.sender_role = 'admin'
    AND m.message = r.message
    AND m.created_at = r.created_at
);

-- 3) Mark receipts for senders (user messages: user owner; admin messages: sender admin)
-- Receipts are per recipient user_id.

-- 3a) receipts for user initial messages
INSERT INTO public.enquiry_message_receipts (message_id, user_id, read_at, created_at, updated_at)
SELECT
  m.id AS message_id,
  i.user_id AS user_id,
  now() AS read_at,
  now() AS created_at,
  now() AS updated_at
FROM public.enquiry_messages m
JOIN public.inquiries i ON i.id = m.enquiry_id
WHERE m.sender_role = 'user'
  AND i.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.enquiry_message_receipts rr
    WHERE rr.message_id = m.id AND rr.user_id = i.user_id
  );

-- 3b) receipts for admin messages: the admin sender marks their own messages as read
INSERT INTO public.enquiry_message_receipts (message_id, user_id, read_at, created_at, updated_at)
SELECT
  m.id AS message_id,
  m.sender_id AS user_id,
  now() AS read_at,
  now() AS created_at,
  now() AS updated_at
FROM public.enquiry_messages m
WHERE m.sender_role IN ('admin','super_admin')
  AND m.sender_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.enquiry_message_receipts rr
    WHERE rr.message_id = m.id AND rr.user_id = m.sender_id
  );
