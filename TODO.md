# TODO — Two-way HOCH enquiry chat

## Phase 1: Schema + realtime
- [x] Create migration: `public.enquiry_messages` (full chat thread)
- [x] Create migration: `public.enquiry_message_receipts` (per-recipient read receipts)
- [x] Add RLS policies for select/insert/update on both tables
- [x] Enable Supabase realtime publication for `enquiry_messages`

## Phase 2: Data migration/backfill
- [ ] Backfill: convert existing `inquiries` + `enquiry_responses` into `enquiry_messages`
- [ ] Backfill: populate receipts for initial messages (mark sender as read)

## Phase 3: Frontend chat UI
- [ ] Rewrite `src/components/EnquiryDetailModal.tsx` to use `enquiry_messages`
- [ ] Add Supabase realtime subscription (filter by selected `enquiry_id`)
- [ ] Implement composer for both user + admin
- [ ] Auto-scroll + empty/loading states

## Phase 4: Notifications
- [ ] Add DB trigger/function to create `notifications` on new chat messages
- [ ] Ensure notifications realtime updates work for badges/unread counts

## Phase 5: Admin list UX (incremental)
- [ ] Add admin filters: unread/active/resolved based on messages + receipts
- [ ] Add search by user name/email/property
- [ ] Resolve/close conversation updates

