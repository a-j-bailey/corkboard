import { Event } from '../contexts/EventContext';
import { supabase } from '../lib/supabase';
import { dbEventToEvent } from './eventService';

/**
 * Database representation of a bookmark
 */
interface DatabaseBookmark {
  id: string;
  user_id: string;
  event_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Creates a bookmark for a user and event
 */
export async function createBookmark(userId: string, eventId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: userId,
        event_id: eventId,
      });

    if (error) {
      // If it's a unique constraint violation, bookmark already exists
      if (error.code === '23505') {
        return; // Silently ignore duplicate bookmarks
      }
      throw error;
    }
  } catch (error) {
    console.error('[BookmarkService] Error creating bookmark:', error);
    throw error;
  }
}

/**
 * Deletes a bookmark for a user and event
 */
export async function deleteBookmark(userId: string, eventId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('[BookmarkService] Error deleting bookmark:', error);
    throw error;
  }
}

/**
 * Checks if an event is bookmarked by a user
 */
export async function isEventBookmarked(userId: string, eventId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - not bookmarked
        return false;
      }
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('[BookmarkService] Error checking bookmark status:', error);
    throw error;
  }
}

/**
 * Gets all bookmarked event IDs for a user (for efficient batch checking)
 */
export async function getBookmarkedEventIds(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('event_id')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return new Set((data || []).map((bookmark) => bookmark.event_id));
  } catch (error) {
    console.error('[BookmarkService] Error fetching bookmarked event IDs:', error);
    throw error;
  }
}

/**
 * Gets all bookmarks for a user with full event data
 */
export async function getUserBookmarks(userId: string): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        event_id,
        created_at,
        events (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Extract events from the joined data
    const events = data
      .map((bookmark: any) => {
        if (bookmark.events) {
          return dbEventToEvent(bookmark.events);
        }
        return null;
      })
      .filter((event: Event | null): event is Event => event !== null);

    return events;
  } catch (error) {
    console.error('[BookmarkService] Error fetching user bookmarks:', error);
    throw error;
  }
}
