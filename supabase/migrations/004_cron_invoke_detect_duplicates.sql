-- Optional: schedule the detect-duplicate-events Edge Function via pg_cron.
-- Requires pg_cron and pg_net extensions. On hosted Supabase, use Dashboard > Integrations > Cron instead.

-- 1. Enable extensions (if not already):
--    CREATE EXTENSION IF NOT EXISTS pg_cron;
--    CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Store secrets in Vault (Dashboard > Project Settings > Vault), then reference by name in the job.
--    Or use the Supabase Dashboard "Cron" UI to create the job and set the URL + Authorization header.

-- 3. Example: run daily at 3:00 UTC (adjust schedule as needed).
--    Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY or use Vault.

-- select cron.schedule(
--   'invoke-detect-duplicate-events',
--   '0 3 * * *',
--   $$ select net.http_post(
--        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/detect-duplicate-events',
--        headers := jsonb_build_object(
--          'Content-Type', 'application/json',
--          'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--        ),
--        body := '{}'
--      ) as request_id $$
-- );
