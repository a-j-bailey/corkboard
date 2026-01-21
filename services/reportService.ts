import { supabase } from '../lib/supabase';

/**
 * Database representation of a report
 */
interface DatabaseReport {
  id: string;
  reporting_user_id: string | null;
  reported_event_id: string;
  event_creator_id: string;
  category: string;
  description: string;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
  updated_at: string;
}

/**
 * Creates a new report
 * @param reportingUserId The ID of the user reporting (null for anonymous)
 * @param eventId The ID of the event being reported
 * @param category The report category
 * @param description The report description
 */
export async function createReport(
  reportingUserId: string | null,
  eventId: string,
  category: string,
  description: string
): Promise<void> {
  try {
    // First, fetch the event to get the creator ID
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('user_id')
      .eq('id', eventId)
      .single();

    if (eventError) {
      throw new Error('Event not found');
    }

    if (!eventData) {
      throw new Error('Event not found');
    }

    const eventCreatorId = eventData.user_id;

    // Create the report
    const { error } = await supabase
      .from('reports')
      .insert({
        reporting_user_id: reportingUserId,
        reported_event_id: eventId,
        event_creator_id: eventCreatorId,
        category,
        description,
        status: 'pending',
      });

    if (error) {
      // If it's a unique constraint violation, report already exists from this user
      if (error.code === '23505') {
        throw new Error('You have already reported this event');
      }
      throw error;
    }
  } catch (error) {
    console.error('[ReportService] Error creating report:', error);
    throw error;
  }
}

/**
 * Gets all reports for a specific event (for admin use)
 */
export async function getReportsByEventId(eventId: string): Promise<DatabaseReport[]> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('reported_event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as DatabaseReport[];
  } catch (error) {
    console.error('[ReportService] Error fetching reports:', error);
    throw error;
  }
}

/**
 * Checks if an event has pending or confirmed reports
 */
export async function hasActiveReports(eventId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('id')
      .eq('reported_event_id', eventId)
      .in('status', ['pending', 'confirmed'])
      .limit(1);

    if (error) {
      throw error;
    }

    return (data || []).length > 0;
  } catch (error) {
    console.error('[ReportService] Error checking active reports:', error);
    throw error;
  }
}

/**
 * Gets all event IDs that have pending or confirmed reports
 * Used for efficient filtering of events
 */
export async function getEventIdsWithActiveReports(): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('reported_event_id')
      .in('status', ['pending', 'confirmed']);

    if (error) {
      throw error;
    }

    return new Set((data || []).map((report) => report.reported_event_id));
  } catch (error) {
    console.error('[ReportService] Error fetching event IDs with active reports:', error);
    throw error;
  }
}
