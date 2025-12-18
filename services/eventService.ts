import { File } from 'expo-file-system';
import { Event, EventDate } from '../contexts/EventContext';
import { supabase } from '../lib/supabase';

/**
 * Database representation of an event
 */
interface DatabaseEvent {
  id: string;
  user_id: string;
  title: string;
  dates: EventDate[] | string; // JSONB can be returned as string or array
  price: number | null;
  location_name: string | null;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  social_media: {
    x?: string;
    instagram?: string;
    facebook?: string;
  } | null;
  description: string | null;
  organization_name: string | null;
  poster_image_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Converts a database event to the Event interface
 */
function dbEventToEvent(dbEvent: DatabaseEvent): Event {
  // Parse dates if it's a string (JSONB can be returned as string)
  let dates: EventDate[] = [];
  if (typeof dbEvent.dates === 'string') {
    try {
      dates = JSON.parse(dbEvent.dates);
    } catch (error) {
      console.error('[EventService] Error parsing dates from database:', error);
      dates = [];
    }
  } else if (Array.isArray(dbEvent.dates)) {
    dates = dbEvent.dates;
  }

  return {
    id: dbEvent.id,
    userId: dbEvent.user_id,
    title: dbEvent.title,
    dates: dates,
    price: dbEvent.price,
    locationName: dbEvent.location_name || undefined,
    address: dbEvent.location_address || undefined,
    latitude: dbEvent.latitude || undefined,
    longitude: dbEvent.longitude || undefined,
    websiteUrl: dbEvent.website_url || undefined,
    socialMediaHandles: dbEvent.social_media || undefined,
    description: dbEvent.description || undefined,
    organizationName: dbEvent.organization_name || undefined,
    posterImage: dbEvent.poster_image_url || '',
    createdAt: new Date(dbEvent.created_at),
    updatedAt: dbEvent.updated_at ? new Date(dbEvent.updated_at) : undefined,
  };
}

/**
 * Converts an Event to database format
 */
function eventToDbEvent(event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Omit<DatabaseEvent, 'id' | 'created_at' | 'updated_at'> {
  // Ensure dates is an array
  const datesArray = Array.isArray(event.dates) ? event.dates : [];
  
  console.log('[EventService] Converting event to DB format');
  console.log('[EventService] Dates array length:', datesArray.length);
  console.log('[EventService] Dates array:', JSON.stringify(datesArray, null, 2));
  
  return {
    user_id: event.userId,
    title: event.title,
    dates: datesArray,
    price: event.price ?? null,
    location_name: event.locationName || null,
    location_address: event.address || null,
    latitude: event.latitude ?? null,
    longitude: event.longitude ?? null,
    website_url: event.websiteUrl || null,
    social_media: event.socialMediaHandles || null,
    description: event.description || null,
    organization_name: event.organizationName || null,
    poster_image_url: event.posterImage || null,
  };
}

/**
 * Uploads a poster image to Supabase Storage
 */
export async function uploadPosterImage(
  imageUri: string,
  eventId: string
): Promise<string> {
  try {
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('User must be authenticated to upload images');
    }

    console.log('[EventService] Uploading image for event:', eventId);
    console.log('[EventService] Image URI:', imageUri);
    console.log('[EventService] User authenticated:', session.user.id);

    // Get file extension
    const extension = imageUri.split('.').pop() || 'jpg';
    const fileName = `${eventId}.${extension}`;
    const filePath = `posters/${fileName}`;

    console.log('[EventService] File path:', filePath);

    // Use the new File API from expo-file-system
    const file = new File(imageUri);
    
    // Read the file as base64 using the new API
    console.log('[EventService] Reading file as base64...');
    const base64 = await file.base64();
    console.log('[EventService] File read, base64 length:', base64.length);

    // Convert base64 to ArrayBuffer for React Native
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    console.log('[EventService] Uploading to Supabase Storage...');
    // Upload to Supabase Storage using ArrayBuffer
    // Supabase Storage accepts ArrayBuffer, Uint8Array, or File objects
    const { data, error } = await supabase.storage
      .from('posters')
      .upload(filePath, byteArray, {
        contentType: `image/${extension === 'png' ? 'png' : 'jpeg'}`,
        upsert: true,
      });

    if (error) {
      console.error('[EventService] Storage upload error:', error);
      console.error('[EventService] Error message:', error.message);
      console.error('[EventService] Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('[EventService] Upload successful, getting public URL...');
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('posters')
      .getPublicUrl(filePath);

    console.log('[EventService] Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('[EventService] Error uploading poster image:', error);
    if (error instanceof Error) {
      console.error('[EventService] Error message:', error.message);
    }
    throw error;
  }
}

/**
 * Creates a new event in the database
 */
export async function createEvent(
  event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>,
  imageUri?: string
): Promise<Event> {
  try {
    // First, insert the event to get an ID
    const dbEvent = eventToDbEvent(event);
    
    console.log('[EventService] Creating event with dates:', JSON.stringify(dbEvent.dates, null, 2));
    console.log('[EventService] Number of dates:', Array.isArray(dbEvent.dates) ? dbEvent.dates.length : 'not an array');
    
    const { data, error } = await supabase
      .from('events')
      .insert(dbEvent)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const newEvent = dbEventToEvent(data as DatabaseEvent);

    // Upload image if provided
    if (imageUri && imageUri.trim().length > 0) {
      try {
        const imageUrl = await uploadPosterImage(imageUri, newEvent.id);
        
        // Update event with image URL
        const { data: updateData, error: updateError } = await supabase
          .from('events')
          .update({ poster_image_url: imageUrl })
          .eq('id', newEvent.id)
          .select()
          .single();

        if (updateError) {
          console.error('[EventService] Error updating event with image URL:', updateError);
        } else if (updateData) {
          return dbEventToEvent(updateData as DatabaseEvent);
        }
      } catch (imageError) {
        console.error('[EventService] Error uploading image, but event was created:', imageError);
        // Event is still created, just without image
      }
    }

    return newEvent;
  } catch (error) {
    console.error('[EventService] Error creating event:', error);
    throw error;
  }
}

/**
 * Gets all events from the database
 */
export async function getEvents(): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data as DatabaseEvent[]).map(dbEventToEvent);
  } catch (error) {
    console.error('[EventService] Error fetching events:', error);
    throw error;
  }
}

/**
 * Gets a single event by ID
 */
export async function getEventById(id: string): Promise<Event | null> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }

    return dbEventToEvent(data as DatabaseEvent);
  } catch (error) {
    console.error('[EventService] Error fetching event:', error);
    throw error;
  }
}

/**
 * Updates an event
 */
export async function updateEvent(
  id: string,
  event: Partial<Omit<Event, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
  userId: string
): Promise<Event> {
  try {
    // Build update object
    const updateData: Partial<DatabaseEvent> = {};
    
    if (event.title !== undefined) updateData.title = event.title;
    if (event.dates !== undefined) updateData.dates = event.dates;
    if (event.price !== undefined) updateData.price = event.price ?? null;
    if (event.locationName !== undefined) updateData.location_name = event.locationName || null;
    if (event.address !== undefined) updateData.location_address = event.address || null;
    if (event.latitude !== undefined) updateData.latitude = event.latitude ?? null;
    if (event.longitude !== undefined) updateData.longitude = event.longitude ?? null;
    if (event.websiteUrl !== undefined) updateData.website_url = event.websiteUrl || null;
    if (event.socialMediaHandles !== undefined) updateData.social_media = event.socialMediaHandles || null;
    if (event.description !== undefined) updateData.description = event.description || null;
    if (event.organizationName !== undefined) updateData.organization_name = event.organizationName || null;
    if (event.posterImage !== undefined) updateData.poster_image_url = event.posterImage || null;

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId) // Ensure user can only update their own events
      .select()
      .single();

    if (error) {
      throw error;
    }

    return dbEventToEvent(data as DatabaseEvent);
  } catch (error) {
    console.error('[EventService] Error updating event:', error);
    throw error;
  }
}

/**
 * Deletes an event
 */
export async function deleteEvent(id: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // Ensure user can only delete their own events

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('[EventService] Error deleting event:', error);
    throw error;
  }
}

