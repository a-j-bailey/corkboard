# Supabase Setup Instructions

## Database Setup

### 1. Create the Events Table

Run the migration file `migrations/001_create_events_table.sql` in your Supabase SQL editor, or execute the following SQL:

```sql
-- See migrations/001_create_events_table.sql for the full schema
```

### 2. Create Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `posters`
3. Set it to **Public** (so images can be accessed without authentication)
4. Configure the following policies:

**Storage Policies for `posters` bucket:**

Run these SQL commands in your Supabase SQL editor:

```sql
-- Allow public read access (anyone can view images)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'posters');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'posters' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'posters' 
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'posters' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'posters' 
  AND auth.uid() IS NOT NULL
);
```

**Important Notes:**
- Make sure the bucket is set to **Public** in the Supabase dashboard (Settings > Storage > posters > Public bucket)
- The policies above allow any authenticated user to upload/update/delete. If you want to restrict to only the file owner, you'll need to store the user_id in the file path or metadata.

## Environment Variables

Make sure your `app.json` includes Supabase configuration:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "YOUR_SUPABASE_URL",
      "supabaseAnonKey": "YOUR_SUPABASE_ANON_KEY"
    }
  }
}
```

Or set environment variables:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Duplicate event detection (cron)

The Edge Function `detect-duplicate-events` finds events that match on date/time and location, picks a canonical event per cluster, merges data into it, redirects bookmarks and reports to the canonical event, and marks duplicates with `duplicate_of_event_id`.

**Deploy the function:**
```bash
supabase functions deploy detect-duplicate-events
```

**Run manually (dry run):**
```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/detect-duplicate-events?dry_run=true" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Run locally (debug 500s):** From the project root, set env and serve the function so you see the real error and stack trace in the terminal:
```bash
cd supabase
export SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
export DETECT_DUPLICATES_DEBUG=1   # optional: verbose console logs
npx supabase functions serve detect-duplicate-events
```
Then in another terminal: `curl -X POST "http://127.0.0.1:54321/functions/v1/detect-duplicate-events" -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"`. Any uncaught error will print in the serve terminal.

**Debug logging:** Set `DETECT_DUPLICATES_DEBUG=1` or `DEBUG=1` in the function’s environment (Dashboard → Edge Functions → detect-duplicate-events → Settings, or when serving locally) to enable `[detect-duplicate-events]` console logs: request, dry_run, events_fetched, clusters_found, per-cluster canonical/duplicate ids, and summary. Logs appear in the Supabase Dashboard → Edge Functions → Logs, or in the terminal when running locally.

**Schedule with cron:** Use the Supabase Dashboard → **Integrations → Cron** (or **Database → Extensions** to enable `pg_cron` and `pg_net`). Create a job that runs daily (e.g. `0 3 * * *` at 3:00 UTC) and invokes:
- URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/detect-duplicate-events`
- Method: POST
- Header: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`

See `migrations/004_cron_invoke_detect_duplicates.sql` for an example pg_cron SQL snippet.

## Testing

After setup, test the integration by:
1. Creating an event through the app
2. Verifying it appears in the `events` table
3. Checking that the poster image is uploaded to the `posters` bucket
4. Verifying RLS policies work correctly (users can only edit their own events)

