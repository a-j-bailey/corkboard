import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import * as bookmarkService from '../services/bookmarkService';
import * as eventService from '../services/eventService';
import { getCurrentLocation, UserLocation } from '../services/locationService';
import { getSaveErrorMessage } from '../utils/formatSaveError';
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
  duplicateOfEventId?: string; // If set, this event was merged into the canonical event with this id
}

export type DistanceFilter = 1 | 2 | 5 | 10 | 25 | null; // Distance in miles, null means no filter

interface EventContextType {
  events: Event[];
  loading: boolean;
  error: string | null;
  bookmarkedEventIds: Set<string>;
  userLocation: UserLocation | null;
  distanceFilter: DistanceFilter;
  locationAvailable: boolean;
  addEvent: (event: Omit<Event, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, imageUri?: string) => Promise<Event>;
  getEvents: () => Event[];
  refreshEvents: () => Promise<void>;
  toggleBookmark: (eventId: string) => Promise<void>;
  setDistanceFilter: (distance: DistanceFilter) => void;
  refreshLocation: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedEventIds, setBookmarkedEventIds] = useState<Set<string>>(new Set());
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  // In production, default to filtering by distance (25 mi); "All" only in __DEV__ when user selects it
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>(
    __DEV__ ? null : 25
  );
  const [locationAvailable, setLocationAvailable] = useState(false);
  const { user } = useUser();

  const refreshLocation = useCallback(async () => {
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      setLocationAvailable(location !== null);
    } catch (err) {
      console.error('[EventContext] Error getting location:', err);
      setUserLocation(null);
      setLocationAvailable(false);
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // In production: require location; do not show events until location is granted.
      if (!__DEV__ && !userLocation) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // Apply distance filter when location is available and a filter is set (or in prod we always have a default).
      const maxDistance =
        userLocation && distanceFilter !== null ? distanceFilter : null;

      const fetchedEvents = await eventService.getEvents(
        user?.id,
        userLocation,
        maxDistance
      );
      setEvents(fetchedEvents);

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
  }, [user?.id, userLocation, distanceFilter, user]);

  // Load location on mount and when user changes
  useEffect(() => {
    refreshLocation();
  }, [user, refreshLocation]);

  // Load events - triggered by user, distanceFilter, or userLocation changes
  useEffect(() => {
    refreshEvents();
  }, [user?.id, distanceFilter, userLocation, refreshEvents]);

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
      const errorMessage = getSaveErrorMessage(err);
      setError(errorMessage);
      throw err;
    }
  };

  const getEvents = () => {
    return events;
  };

  return (
    <EventContext.Provider value={{ 
      events, 
      loading, 
      error, 
      bookmarkedEventIds, 
      userLocation,
      distanceFilter,
      locationAvailable,
      addEvent, 
      getEvents, 
      refreshEvents, 
      toggleBookmark,
      setDistanceFilter,
      refreshLocation,
    }}>
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
