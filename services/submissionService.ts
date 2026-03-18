import { Event } from '../contexts/EventContext';
import { supabase } from '../lib/supabase';
import { dbEventToEvent } from './eventService';
import { getEventIdsWithActiveReports } from './reportService';

/**
 * Gets all events created by the user (excluding merged duplicates),
 * filtered to remove events with active reports.
 */
export async function getUserSubmissions(userId: string): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .is('duplicate_of_event_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const events = (data || []).map((dbEvent: any) => dbEventToEvent(dbEvent));

    // Keep consistent with bookmarks: hide events that have pending/confirmed reports.
    const reportedEventIds = await getEventIdsWithActiveReports();
    return events.filter((event) => !reportedEventIds.has(event.id));
  } catch (error) {
    console.error('[SubmissionService] Error fetching user submissions:', error);
    throw error;
  }
}

