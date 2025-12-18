import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useUser } from './UserContext';
import * as eventService from '../services/eventService';

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
}

interface EventContextType {
  events: Event[];
  loading: boolean;
  error: string | null;
  addEvent: (event: Omit<Event, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, imageUri?: string) => Promise<void>;
  getEvents: () => Event[];
  refreshEvents: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  // Load events on mount and when user changes
  useEffect(() => {
    refreshEvents();
  }, [user]);

  const refreshEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedEvents = await eventService.getEvents();
      setEvents(fetchedEvents);
    } catch (err) {
      console.error('[EventContext] Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const addEvent = async (
    eventData: Omit<Event, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    imageUri?: string
  ) => {
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
    <EventContext.Provider value={{ events, loading, error, addEvent, getEvents, refreshEvents }}>
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
