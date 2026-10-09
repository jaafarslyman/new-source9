# Supabase setup

FlowPoint uses Supabase directly from the browser for sign-in, application data, and realtime updates.

## Environment

Set these Replit environment variables before starting or publishing the app:

- `VITE_SUPABASE_URL` — the project URL from Supabase
- `VITE_SUPABASE_ANON_KEY` — the anon/publishable public key

Do not use or expose a Supabase service-role key. The browser app depends on Supabase Auth and row-level security (RLS) to restrict data access.

The app's login page supports signing in; it does not include account registration. Create the initial user in Supabase Auth.

## Database prerequisites and migrations

The SQL files in this repository are not a complete schema bootstrap for a new Supabase project. They add FlowPoint features to an existing database and assume some base tables already exist, including contacts, staff, inbox, chats, agent_chat, settings, categories, policies, and notifications. The requests/issues migration also extends an existing `requests` table. Confirm that the base schema and its RLS policies are in place before applying these files.

For the current property and residential-unit flow, use the rebuild script below instead of manually dropping `public.properties`. The script is the SQL to paste into Supabase SQL Editor; it recreates the current property columns and account-scoped RLS policies, and also rebuilds the dependent unit/contact-link schema the page uses.

Run `supabase/property-rebuild.sql` after confirming `public.contacts` exists with its `id`, `company_id`, `contact_type`, `name`, `email`, and `phone` fields. It supports a missing `public.properties` table, but avoid manually dropping the table first so the script can safely manage all dependent records and foreign keys.

**Data impact:** the rebuild clears properties, units, property/unit contact links, staff-property assignments, and service-to-property/unit assignments. It keeps contacts, service definitions, and requests, but clears property/unit links on requests. It can retain archived owner/renter relationship history if the history triggers are installed. Back up any records you need before running it.

The property RLS policies scope reads and writes to the signed-in Supabase user (`company_id = auth.uid()`). The rebuild script also permits `company` as a contact type for company owners. Other feature migrations are separate and are not run automatically by the app; review them against your current schema before applying.

## Optional automation webhooks

These are only needed for their corresponding automation features:

- `VITE_WEBHOOK_SEND_EMAIL`
- `VITE_WEBHOOK_AGENT`
- `VITE_WEBHOOK_POLICIES_CHAT`

Because they are `VITE_*` variables, their values are exposed in the client bundle. Use only endpoints that are safe for direct browser access; do not put private service credentials in these values.
