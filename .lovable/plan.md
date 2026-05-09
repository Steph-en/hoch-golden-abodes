## Overview

Extend HOCH from a sales-only platform into a unified sales + rentals/hospitality system. The existing sales workflow (Explore, PropertyDetail, enquiry → agreement → invoice → payment) stays untouched. We add a parallel rentals module: listing categories, hotels/apartment complexes with rooms, room detail pages, and a short-stay booking workflow.

## Scope

### 1. Database (new tables, no changes to existing ones)

- `listing_kind` enum: `sale | rental_property | hotel | commercial_rental`
- Add `listing_kind` column to `properties` (default `sale`) — only additive, sales code keeps working.
- New table `rooms` (rental units inside a hotel/complex):
  - `property_id` (FK to properties), `name`, `description`, `room_type`, `capacity`, `bed_config`, `amenities[]`, `images[]`, `nightly_price`, `currency`, `status` (active/inactive), `booking_rules` (jsonb), timestamps.
- New table `room_availability` (date-range blocks):
  - `room_id`, `start_date`, `end_date`, `status` (`available|blocked|booked`), optional `booking_id`.
- New table `bookings`:
  - `room_id`, `property_id`, `user_id` (nullable for guest), `guest_name`, `guest_email`, `guest_phone`, `check_in`, `check_out`, `nights`, `guests`, `nightly_price`, `total_amount`, `status` (`pending|confirmed|cancelled|completed`), `payment_status`, timestamps.
- RLS:
  - `rooms` — public SELECT, admin manage.
  - `room_availability` — public SELECT, admin manage; trigger writes booked ranges from confirmed bookings.
  - `bookings` — user can SELECT/INSERT own; admin full access. Anonymous insert allowed with guest contact.
- Helper RPC `check_room_availability(room_id, check_in, check_out)` returning boolean + conflict reason.
- Helper RPC `create_booking(...)` that validates availability atomically.

### 2. Routing (additive)

```text
/explore                        → category-aware Explore (default = Sales, tabs for each kind)
/property/:id                   → existing sales detail (unchanged)
/stays                          → rentals/hotels landing (filterable)
/stays/:propertyId              → hotel/apartment-complex detail with rooms list
/stays/:propertyId/rooms/:roomId → room detail + booking
/dashboard                      → add "My Bookings" tab (non-breaking)
/admin                          → add Rooms + Bookings management tabs
```

Sales URLs and components remain identical.

### 3. Explore Page segmentation

Add a Tabs control at the top of `/explore`: **For Sale · Apartments for Rent · Hotels & Short Stay · Commercial Rentals**. Filter source list by `listing_kind`. Sales tab uses the existing grid/filters as-is. Rental tabs render a rental-oriented card (nightly price, "View rooms" CTA → `/stays/:id`).

### 4. Stays / Hotel detail

New `Stays.tsx` (list) and `StayDetail.tsx`:
- Hero, description, amenities, location map (reuse `PropertyMap`).
- "Available rooms" section: grid of rooms with thumbnail, type, capacity, from-price, "View room" → room detail.
- Optional date pre-filter that propagates to the room detail.

### 5. Room detail + booking

New `RoomDetail.tsx`:
- Image carousel (reuse existing carousel component).
- Title, type, capacity, amenities, description, booking rules.
- Booking widget (sticky on desktop):
  - Check-in / check-out (shadcn date picker, range mode, `pointer-events-auto`).
  - Guests selector.
  - Live nights × nightly price calc + total.
  - Availability check via RPC; disable Book if conflict.
  - "Reserve" button → create booking (status `pending`) → confirmation screen with booking reference.
- Auth: if signed in, attach `user_id`; else collect name/email/phone (guest booking).
- Payment: leave a clearly-marked "Pay later / Payment integration coming soon" CTA on the confirmation step. (No payment provider enabled in this pass — booking is created with `payment_status = unpaid`.)

### 6. Dashboard + Admin

- `Dashboard`: new "My Bookings" section listing user's bookings with status + cancel (if pending/future).
- `Admin`: new Rooms manager (CRUD per property when `listing_kind != sale`) and Bookings manager (list, filter by status, confirm/cancel, mark paid).

### 7. Reuse + non-breaking guarantees

- Existing `useProperties` hook and Explore filters keep working — they just receive a `listing_kind` filter.
- `PropertyDetail.tsx` untouched; routed only for `sale` listings.
- Header gets a single new nav link "Stays". Sales nav and CTAs unchanged.
- All SEO additions follow the existing `<SEO />` component pattern; new JSON-LD: `Hotel` / `LodgingBusiness` / `HotelRoom` / `Offer` on the new pages.
- Sitemap edge function extended to also emit `/stays/:id` and `/stays/:id/rooms/:roomId`.

### 8. Out of scope (explicit)

- Real payment processing (just booking + status; can wire Paddle/Stripe later).
- Channel manager / iCal sync.
- Multi-currency conversion (single currency per room).
- Reviews, loyalty, messaging.

## Technical notes

- Booking conflict logic: a room is available for `[check_in, check_out)` if no `bookings` row with overlapping range and status in (`pending`,`confirmed`) exists, AND no `room_availability` row with `status='blocked'` overlaps. Enforced in `create_booking` RPC inside a transaction with `SELECT … FOR UPDATE` on the room row.
- Pricing: `nights = check_out - check_in` (date diff, exclusive); `total = nights * nightly_price`. Future: seasonal rates table — schema leaves room (`booking_rules.jsonb` can hold weekend uplift today).
- Types: regenerate `src/integrations/supabase/types.ts` automatically post-migration; new code uses generated types where available, `as any` casts only where required.
- Animations + tokens follow existing gold/white luxury design system; no new colors.

## Delivery order

1. Migration: enum, `properties.listing_kind`, `rooms`, `room_availability`, `bookings`, RLS, RPCs.
2. Backend RPCs + edge function update for sitemap.
3. Explore tabs + rental card variant.
4. `Stays`, `StayDetail`, `RoomDetail` pages + routes.
5. Dashboard "My Bookings" + Admin Rooms/Bookings tabs.
6. SEO + sitemap entries.
7. Smoke test: sales path still works end-to-end; rental booking happy path works.
