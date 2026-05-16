# TODO - HOCH Agreements History Management

## 1) Gather & confirm current agreement schema
- [x] Scan repo for agreements/signatures usage
- [x] Inspect existing agreement UI in `src/pages/Dashboard.tsx`
- [x] Inspect existing Supabase migration creating `public.agreements` and storage buckets/policies

## 2) Database enhancements (Supabase)
- [ ] Add/extend `public.agreements` fields for status lifecycle, timestamps, archival
- [x] Create `agreement_versions`, `agreement_signatures`, `agreement_audit_logs` tables + basic RLS
- [x] Add agreement versioning + status sync triggers
- [x] Add delete protection trigger

- [ ] Create `public.agreement_versions`
- [ ] Create `public.agreement_signatures`
- [ ] Create `public.agreement_audit_logs`
- [ ] Add triggers/functions for versioning after signed edit
- [ ] Add constraints to prevent deleting signed artifacts (soft-delete / RLS restrictions)


## 3) Signed document storage (Supabase Storage)
- [ ] Ensure signed PDFs stored in a private bucket
- [ ] Add storage object RLS policies (user own access; admin all)
- [ ] Implement consistent storage path scheme including agreement/version identifiers

## 4) RLS policies
- [ ] Add RLS policies for selecting/insert/update/delete on new tables
- [ ] Ensure users can only access their agreements + signed docs + history
- [ ] Ensure admins can access all

## 5) Backend support helpers (optional)
- [ ] Add helper function/edge function to generate signed URLs for PDFs (if needed)

## 6) Frontend: User dashboard agreements page
- [ ] Replace agreements card list with searchable/filterable list
- [ ] Implement status badges + full timestamp display
- [ ] Add PDF preview/download modal using secure signed URLs
- [ ] Add agreement history timeline/version viewer
- [ ] Add filters: signed / pending / expired / archived

## 7) Frontend: Admin dashboard agreements
- [ ] Enhance agreements section in `src/pages/Admin.tsx`
- [ ] Add search: user name/email/property/agreement id
- [ ] Add filters: status + date range + property + user
- [ ] Add actions: view signed, view history, archive, restore
- [ ] Ensure secure access to PDFs

## 8) Types + UI components
- [ ] Update `src/integrations/supabase/types.ts`
- [ ] Add reusable UI components (status badge, pdf modal, timeline, empty/loading states)

## 9) Testing/verification
- [ ] Run migrations
- [ ] Smoke-test user vs admin access control
- [ ] Validate signed agreement persistence and historical records after edits

