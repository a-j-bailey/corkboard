/**
 * Detect Duplicate Events — Supabase Edge Function
 *
 * Finds events that represent the same real-world occurrence (matching date/time and
 * location), picks a canonical event per cluster, merges richer data into it, redirects
 * bookmarks and reports to the canonical event, and marks duplicates with
 * `duplicate_of_event_id`.
 *
 * @invocation
 *   POST with optional dry run:
 *   - Query: `?dry_run=true` or `?dry_run=1`
 *   - Body: `{ "dry_run": true }`
 *
 * @response
 *   JSON summary: events_fetched, clusters_found, clusters_processed,
 *   events_merged_into_canonical, bookmarks_redirected, reports_redirected, errors[].
 *
 * @schedule
 *   Intended to be run on a cron (e.g. daily). See project README and
 *   migrations/004_cron_invoke_detect_duplicates.sql.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Enable verbose console logging. Set env DETECT_DUPLICATES_DEBUG=1 or DEBUG=1 when serving/invoking. */
const DEBUG = Deno.env.get("DETECT_DUPLICATES_DEBUG") === "1" || Deno.env.get("DEBUG") === "1";

function log(...args: unknown[]) {
  if (DEBUG) console.log("[detect-duplicate-events]", ...args);
}

/** Max distance (miles) for two events to be considered same location when both have coordinates. */
const LOCATION_THRESHOLD_MILES = 0.1;
/** Earth radius in miles for Haversine distance. */
const EARTH_RADIUS_MILES = 3959;

type EventDate = { start: string; end?: string };

/** Event row as returned from the `events` table. */
interface DbEvent {
  id: string;
  user_id: string;
  title: string;
  dates: EventDate[] | string;
  price: number | null;
  location_name: string | null;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  social_media: Record<string, string> | null;
  description: string | null;
  organization_name: string | null;
  poster_image_url: string | null;
  created_at: string;
  updated_at: string;
  duplicate_of_event_id: string | null;
}

/**
 * Normalize `dates` from DB (JSONB can be string or array) into an array of EventDate.
 */
function parseDates(dates: EventDate[] | string): EventDate[] {
  if (typeof dates === "string") {
    try {
      return JSON.parse(dates) as EventDate[];
    } catch {
      return [];
    }
  }
  return Array.isArray(dates) ? dates : [];
}

/** Return ISO date parts (YYYY-MM-DD) of each event start for comparison. */
function getStartDates(dates: EventDate[]): string[] {
  return dates
    .filter((d) => d && typeof d.start === "string" && d.start.length >= 10)
    .map((d) => d.start!.slice(0, 10));
}

/**
 * True if the two events share at least one calendar day (same start date).
 * Used to treat "same day" or overlapping multi-day events as the same occurrence.
 */
function datesOverlap(a: EventDate[], b: EventDate[]): boolean {
  const aStarts = getStartDates(a);
  const bStarts = getStartDates(b);
  return aStarts.some((d) => bStarts.includes(d));
}

/**
 * Great-circle distance between two points (Haversine formula), in miles.
 */
function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/**
 * True if both events are considered the same location:
 * - If both have lat/long: within LOCATION_THRESHOLD_MILES (Haversine).
 * - Otherwise: normalized location_name or location_address match (equals or substring).
 */
function locationMatch(a: DbEvent, b: DbEvent): boolean {
  const aLat = a.latitude;
  const aLon = a.longitude;
  const bLat = b.latitude;
  const bLon = b.longitude;
  if (aLat != null && aLon != null && bLat != null && bLon != null) {
    return haversineMiles(aLat, aLon, bLat, bLon) <= LOCATION_THRESHOLD_MILES;
  }
  const an = (a.location_name || a.location_address || "").trim().toLowerCase();
  const bn = (b.location_name || b.location_address || "").trim().toLowerCase();
  if (!an || !bn) return false;
  return an === bn || an.includes(bn) || bn.includes(an);
}

/**
 * Higher = "better" event for use as canonical. Weights: title, description, poster (2 each);
 * website, org, address, social_media, having dates (1 each). Tie-break is done by created_at elsewhere.
 */
function scoreEvent(e: DbEvent): number {
  let s = 0;
  if (e.title?.trim()) s += 2;
  if (e.description?.trim()) s += 2;
  if (e.poster_image_url?.trim()) s += 2;
  if (e.website_url?.trim()) s += 1;
  if (e.organization_name?.trim()) s += 1;
  if (e.location_address?.trim()) s += 1;
  if (e.social_media && Object.keys(e.social_media).length) s += 1;
  const dates = parseDates(e.dates);
  if (dates.length) s += 1;
  return s;
}

/**
 * Build a single event payload by merging canonical with duplicates: for each field,
 * keep canonical's value if non-empty, otherwise take the first non-empty from any
 * duplicate. Dates are combined (unique start times across canonical + duplicates).
 */
function mergeIntoCanonical(canonical: DbEvent, duplicates: DbEvent[]): Partial<DbEvent> {
  const merged: Partial<DbEvent> = { ...canonical };
  const all = [canonical, ...duplicates];
  for (const e of all) {
    if (e.title?.trim() && !merged.title?.trim()) merged.title = e.title;
    if (e.description?.trim() && !merged.description?.trim()) merged.description = e.description;
    if (e.poster_image_url?.trim() && !merged.poster_image_url?.trim()) merged.poster_image_url = e.poster_image_url;
    if (e.website_url?.trim() && !merged.website_url?.trim()) merged.website_url = e.website_url;
    if (e.organization_name?.trim() && !merged.organization_name?.trim()) merged.organization_name = e.organization_name;
    if (e.location_address?.trim() && !merged.location_address?.trim()) merged.location_address = e.location_address;
    if (e.location_name?.trim() && !merged.location_name?.trim()) merged.location_name = e.location_name;
    if (e.latitude != null && merged.latitude == null) merged.latitude = e.latitude;
    if (e.longitude != null && merged.longitude == null) merged.longitude = e.longitude;
    if (e.price != null && merged.price == null) merged.price = e.price;
    if (e.social_media && Object.keys(e.social_media).length && (!merged.social_media || !Object.keys(merged.social_media).length)) merged.social_media = e.social_media;
  }
  const dates = parseDates(canonical.dates).filter((d) => d && typeof d?.start === "string");
  const seen = new Set(dates.map((d) => d.start));
  for (const e of duplicates) {
    for (const d of parseDates(e.dates)) {
      if (d && typeof d.start === "string" && !seen.has(d.start)) {
        dates.push(d);
        seen.add(d.start);
      }
    }
  }
  merged.dates = dates;
  return merged;
}

/**
 * Group events into clusters of potential duplicates. Two events are in the same cluster
 * if they have overlapping dates and matching location. Uses union-find; returns only
 * clusters with more than one event.
 */
function findClusters(events: DbEvent[]): DbEvent[][] {
  const n = events.length;
  const parent: number[] = events.map((_, i) => i);
  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }
  function union(i: number, j: number) {
    parent[find(i)] = find(j);
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = events[i];
      const b = events[j];
      const aDates = parseDates(a.dates);
      const bDates = parseDates(b.dates);
      if (datesOverlap(aDates, bDates) && locationMatch(a, b)) {
        union(i, j);
      }
    }
  }
  const byRoot = new Map<number, DbEvent[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r)!.push(events[i]);
  }
  return [...byRoot.values()].filter((c) => c.length > 1);
}

/** CORS headers for browser/cron invocation. */
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  log("request", req.method, req.url);

  // Parse dry_run from query string or JSON body (no DB writes when true).
  let dryRun = false;
  try {
    const url = new URL(req.url);
    dryRun = url.searchParams.get("dry_run") === "true" || url.searchParams.get("dry_run") === "1";
    if (!dryRun && req.method === "POST" && req.headers.get("content-type")?.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      dryRun = body.dry_run === true;
    }
  } catch (e) {
    log("parse dry_run failed", e);
  }
  log("dry_run", dryRun);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    const msg = `Missing env: SUPABASE_URL=${!!supabaseUrl}, SUPABASE_SERVICE_ROLE_KEY=${!!serviceRoleKey}`;
    log("env check failed", msg);
    return new Response(
      JSON.stringify({ error: msg, errors: [msg] }),
      { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  log("supabase client created");

  const summary: {
    dry_run: boolean;
    events_fetched: number;
    clusters_found: number;
    clusters_processed: number;
    events_merged_into_canonical: number;
    bookmarks_redirected: number;
    reports_redirected: number;
    errors: string[];
  } = {
    dry_run: dryRun,
    events_fetched: 0,
    clusters_found: 0,
    clusters_processed: 0,
    events_merged_into_canonical: 0,
    bookmarks_redirected: 0,
    reports_redirected: 0,
    errors: [] as string[],
  };

  try {
    // Only consider events that are not already marked as duplicates.
    const { data: events, error: fetchError } = await supabase
      .from("events")
      .select("*")
      .is("duplicate_of_event_id", null);

    if (fetchError) {
      summary.errors.push(`fetch events: ${fetchError.message}`);
      log("fetch error", fetchError.code, fetchError.message, fetchError.details);
      return new Response(
        JSON.stringify({ ...summary, debug: { code: fetchError.code, details: fetchError.details } }),
        { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }

    const list = (events ?? []) as DbEvent[];
    summary.events_fetched = list.length;
    log("events_fetched", list.length);

    const clusters = findClusters(list);
    summary.clusters_found = clusters.length;
    log("clusters_found", clusters.length, clusters.map((c) => c.length));

    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      // Pick canonical: highest score, then oldest created_at.
      const scored = cluster.map((e) => ({ e, score: scoreEvent(e) }));
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.e.created_at).getTime() - new Date(b.e.created_at).getTime();
      });
      const canonical = scored[0].e;
      const duplicates = scored.slice(1).map((x) => x.e);
      const duplicateIds = duplicates.map((e) => e.id);
      log(`cluster ${i + 1}/${clusters.length} canonical=${canonical.id} duplicates=${duplicateIds.length} ids=[${canonical.id},${duplicateIds.join(",")}]`);

      if (dryRun) {
        summary.clusters_processed += 1;
        summary.events_merged_into_canonical += duplicates.length;
        continue;
      }

      const merged = mergeIntoCanonical(canonical, duplicates);
      log(`cluster ${i + 1} merge done, updating canonical ${canonical.id}`);
      // Update canonical event with merged fields (fill gaps from duplicates).
      const updatePayload: Record<string, unknown> = {
        title: merged.title ?? canonical.title,
        dates: merged.dates ?? canonical.dates,
        description: merged.description ?? canonical.description,
        poster_image_url: merged.poster_image_url ?? canonical.poster_image_url,
        website_url: merged.website_url ?? canonical.website_url,
        organization_name: merged.organization_name ?? canonical.organization_name,
        location_address: merged.location_address ?? canonical.location_address,
        location_name: merged.location_name ?? canonical.location_name,
        latitude: merged.latitude ?? canonical.latitude,
        longitude: merged.longitude ?? canonical.longitude,
        price: merged.price ?? canonical.price,
        social_media: merged.social_media ?? canonical.social_media,
      };

      const { error: updateCanonicalError } = await supabase
        .from("events")
        .update(updatePayload)
        .eq("id", canonical.id);
      if (updateCanonicalError) {
        summary.errors.push(`update canonical ${canonical.id}: ${updateCanonicalError.message}`);
        log("update canonical error", canonical.id, updateCanonicalError.message);
        continue;
      }

      // Redirect bookmarks from duplicate events to the canonical event.
      const { data: bookmarksUpdated } = await supabase
        .from("bookmarks")
        .update({ event_id: canonical.id })
        .in("event_id", duplicateIds)
        .select("id");
      summary.bookmarks_redirected += bookmarksUpdated?.length ?? 0;
      log(`cluster ${i + 1} bookmarks_redirected`, bookmarksUpdated?.length ?? 0);

      // Dedupe: keep one bookmark per (user_id, event_id), oldest by created_at.
      const { data: bookmarksForCanonical } = await supabase
        .from("bookmarks")
        .select("id, user_id, created_at")
        .eq("event_id", canonical.id)
        .order("created_at", { ascending: true });
      const keepIds = new Set<string>();
      const byUser = new Map<string, { id: string; created_at: string }>();
      for (const b of bookmarksForCanonical ?? []) {
        const cur = byUser.get(b.user_id);
        if (!cur || b.created_at < cur.created_at) {
          byUser.set(b.user_id, { id: b.id, created_at: b.created_at });
        }
      }
      byUser.forEach((v) => keepIds.add(v.id));
      const toRemove = (bookmarksForCanonical ?? []).filter((b) => !keepIds.has(b.id)).map((b) => b.id);
      if (toRemove.length) {
        await supabase.from("bookmarks").delete().in("id", toRemove);
      }

      // Redirect reports from duplicate events to the canonical event.
      const { data: reportsUpdated } = await supabase
        .from("reports")
        .update({ reported_event_id: canonical.id })
        .in("reported_event_id", duplicateIds)
        .select("id");
      summary.reports_redirected += reportsUpdated?.length ?? 0;
      log(`cluster ${i + 1} reports_redirected`, reportsUpdated?.length ?? 0);

      // Dedupe: keep one report per reporting user (or per anon id), oldest by created_at.
      const { data: reportsForCanonical } = await supabase
        .from("reports")
        .select("id, reporting_user_id, created_at")
        .eq("reported_event_id", canonical.id)
        .order("created_at", { ascending: true });
      const reportKeepIds = new Set<string>();
      const reportsByUser = new Map<string | null, { id: string; created_at: string }>();
      for (const r of reportsForCanonical ?? []) {
        const key = r.reporting_user_id ?? `anon-${r.id}`;
        const cur = reportsByUser.get(key);
        if (!cur || r.created_at < cur.created_at) {
          reportsByUser.set(key, { id: r.id, created_at: r.created_at });
        }
      }
      reportsByUser.forEach((v) => reportKeepIds.add(v.id));
      const reportsToRemove = (reportsForCanonical ?? []).filter((r) => !reportKeepIds.has(r.id)).map((r) => r.id);
      if (reportsToRemove.length) {
        await supabase.from("reports").delete().in("id", reportsToRemove);
      }

      // Mark duplicate rows so they are excluded from listings and redirect in the app.
      const { error: markError } = await supabase
        .from("events")
        .update({ duplicate_of_event_id: canonical.id })
        .in("id", duplicateIds);
      if (markError) {
        summary.errors.push(`mark duplicates: ${markError.message}`);
        log("mark duplicates error", markError.message);
        continue;
      }

      summary.clusters_processed += 1;
      summary.events_merged_into_canonical += duplicates.length;
      log(`cluster ${i + 1} done`);
    }

    log("summary", summary);
    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    summary.errors.push(message);
    console.error("[detect-duplicate-events] caught", message, stack);
    // Include debug info in response for 500s
    const body = { ...summary, debug: { message, stack: stack ?? null } };
    return new Response(JSON.stringify(body), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
