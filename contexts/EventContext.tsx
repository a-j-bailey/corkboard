import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import * as bookmarkService from '../services/bookmarkService';
import * as eventService from '../services/eventService';
import { useUser } from './UserContext';

export interface SocialMediaHandles {
  x?: string;
  instagram?: string;
  facebook?: string;
  [key: string]: string | undefined;
}

export interface EventDate {
  start: string; // ISO 8601 datetime string
  end?: string; // ISO 8601 datetime string (optional)
}

export interface Event {
  id: string;
  userId: string;
  title: string;
  dates: EventDate[]; // Array of date instances
  price?: number | null; // NULL for unknown, 0 for free, positive for price
  locationName?: string;
  address?: string; // Keep for backward compatibility and display
  latitude?: number;
  longitude?: number;
  websiteUrl?: string;
  socialMediaHandles?: SocialMediaHandles;
  description?: string;
  organizationName?: string;
  posterImage: string; // Supabase Storage URL
  createdAt: Date;
  updatedAt?: Date;
  isBookmarked?: boolean; // Whether the current user has bookmarked this event
}

interface EventContextType {
  events: Event[];
  loading: boolean;
  error: string | null;
  bookmarkedEventIds: Set<string>;
  addEvent: (event: Omit<Event, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, imageUri?: string) => Promise<Event>;
  getEvents: () => Event[];
  refreshEvents: () => Promise<void>;
  toggleBookmark: (eventId: string) => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedEventIds, setBookmarkedEventIds] = useState<Set<string>>(new Set());
  const { user } = useUser();

  // Load events on mount and when user changes
  useEffect(() => {
    refreshEvents();
  }, [user]);

  const refreshEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedEvents = await eventService.getEvents(user?.id);
      setEvents(fetchedEvents);
      
      // Update bookmarked IDs set
      if (user) {
        const bookmarkedIds = await bookmarkService.getBookmarkedEventIds(user.id);
        setBookmarkedEventIds(bookmarkedIds);
      } else {
        setBookmarkedEventIds(new Set());
      }
    } catch (err) {
      console.error('[EventContext] Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async (eventId: string) => {
    if (!user) {
      throw new Error('User must be logged in to bookmark events');
    }

    try {
      const isBookmarked = bookmarkedEventIds.has(eventId);
      
      if (isBookmarked) {
        await bookmarkService.deleteBookmark(user.id, eventId);
        setBookmarkedEventIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
      } else {
        await bookmarkService.createBookmark(user.id, eventId);
        setBookmarkedEventIds(prev => new Set(prev).add(eventId));
      }

      // Update the event's isBookmarked status in the events array
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, isBookmarked: !isBookmarked }
          : event
      ));
    } catch (err) {
      console.error('[EventContext] Error toggling bookmark:', err);
      throw err;
    }
  };

  const addEvent = async (
    eventData: Omit<Event, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    imageUri?: string
  ): Promise<Event> => {
    if (!user) {
      throw new Error('User must be logged in to create events');
    }

    try {
      setError(null);
      const newEvent = await eventService.createEvent(
        {
          ...eventData,
          userId: user.id,
        },
        imageUri
      );
      setEvents(prev => [newEvent, ...prev]);
      return newEvent;
    } catch (err) {
      console.error('[EventContext] Error creating event:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
      setError(errorMessage);
      throw err;
    }
  };

  const getEvents = () => {
    return events;
  };

  return (
    <EventContext.Provider value={{ events, loading, error, bookmarkedEventIds, addEvent, getEvents, refreshEvents, toggleBookmark }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
}
