This folder contains SQL migrations and helpers for provisioning Supabase/Postgres tables used by the app.

Applying the migration (supabase CLI):

1. Install supabase CLI: https://supabase.com/docs/guides/cli
2. Authenticate and link to your project.
3. From repository root run:

   supabase db remote set <YOUR_DB_URL>
   psql <YOUR_DB_URL> -f supabase/migrations/0001_create_context_snapshots_table.sql

Or using psql directly (example):

PGPASSWORD=<your_password> psql "postgresql://<user>:<password>@<host>:5432/<db>" -f supabase/migrations/0001_create_context_snapshots_table.sql

Notes:

- The migration creates `context_snapshots` with a unique `context_hash` index which is used by the app when upserting snapshots.
- Review and adapt data types if your app requires additional columns.
