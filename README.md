# Hoch Online (Vite + React + Supabase)

Hoch Online is a luxury real-estate web app (Vite/React) with Supabase-backed data and Supabase Edge Functions (Deno) for server-side tasks like invoice HTML generation and transactional emails.

## Tech stack
- **Frontend:** React + TypeScript + Vite
- **Routing:** `react-router-dom`
- **Styling/UI:** Tailwind + shadcn/ui components
- **Data/auth:** Supabase (client-side)
- **Server-side:** Supabase Edge Functions (Deno) under `supabase/functions/`

## Requirements
- Node.js (for the Vite app)
- Deno (for running/testing edge functions locally)

## Local development
1. Clone the repository
   ```bash
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```
2. Install dependencies
   ```bash
   npm i
   ```
3. Start the dev server
   ```bash
   npm run dev
   ```
   - The Vite dev server runs on **port 8080** (see `vite.config.ts`).

## Build & lint
- Build
  ```bash
  npm run build
  ```
- Lint
  ```bash
  npm run lint
  ```
- Preview production build
  ```bash
  npm run preview
  ```

## Supabase configuration (Edge Functions)
Edge Functions read the following environment variables via `Deno.env.get(...)`:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Email-related functions additionally require:
- `LOVABLE_API_KEY`
- `RESEND_API_KEY`

### Functions included
- `supabase/functions/generate-invoice-pdf/`
  - Expects JSON body: `{ "invoice_id": "<uuid>" }`
  - Returns JSON with an `html` string plus invoice/property data.
- `supabase/functions/send-booking-email/`
- `supabase/functions/send-notification-email/`
- `supabase/functions/send-role-change-email/`
- `supabase/functions/sitemap-properties/`
- `supabase/functions/rls-check/`

## App routes
Main routes defined in `src/App.tsx`:
- `/` (Index)
- `/about`
- `/explore`
- `/services`
- `/contact`
- `/property/:id`

Stays/booking flows:
- `/stays`
- `/stays/:propertyId/rooms/:roomId`
- `/stays/:propertyId` -> `StayDetail`

Auth/admin:
- `/auth`
- `/dashboard`
- `/admin` and admin sub-pages:
  - `/admin/diagnostics`
  - `/admin/roles`
  - `/admin/admins`
  - `/admin/stays`

## Notes
- Supabase Edge Functions are located under `supabase/functions/` (Deno-based).
- `generate-invoice-pdf` uses Supabase service role credentials server-side to fetch invoice, property, and profile data.

