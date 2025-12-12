import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface SocialMediaHandles {
  twitter?: string;
  instagram?: string;
  facebook?: string;
  [key: string]: string | undefined;
}

export interface Event {
  id: string;
  title: string;
  date: string; // ISO date string
  time?: string;
  address?: string;
  cost?: string;
  websiteUrl?: string;
  socialMediaHandles?: SocialMediaHandles;
  description?: string;
  organizationName?: string;
  thumbnailImage: string; // URI or base64
  posterImage: string; // URI or base64
  createdAt: Date;
}

interface EventContextType {
  events: Event[];
  addEvent: (event: Omit<Event, 'id' | 'createdAt'>) => void;
  getEvents: () => Event[];
}

const EventContext = createContext<EventContextType | undefined>(undefined);

// Dummy events with placeholder images
const dummyEvents: Event[] = [
  {
    id: '1',
    title: 'Summer Music Festival',
    date: '2024-07-15',
    time: '2:00 PM - 10:00 PM',
    address: 'Central Park, New York, NY',
    cost: '$45',
    websiteUrl: 'https://example.com/summer-fest',
    socialMediaHandles: {
      twitter: '@summerfest',
      instagram: '@summerfest2024',
    },
    description: 'Join us for an amazing day of live music featuring top artists from around the world.',
    organizationName: 'City Events',
    thumbnailImage: 'https://picsum.photos/200/300?random=1',
    posterImage: 'https://picsum.photos/400/600?random=1',
    createdAt: new Date('2024-06-01'),
  },
  {
    id: '2',
    title: 'Tech Innovation Summit',
    date: '2024-08-20',
    time: '9:00 AM - 5:00 PM',
    address: 'Convention Center, San Francisco, CA',
    cost: '$150',
    websiteUrl: 'https://example.com/tech-summit',
    socialMediaHandles: {
      twitter: '@techsummit',
      linkedin: 'tech-innovation-summit',
    },
    description: 'Explore the latest in technology and innovation with industry leaders.',
    organizationName: 'Tech Innovators Inc.',
    thumbnailImage: 'https://picsum.photos/200/300?random=2',
    posterImage: 'https://picsum.photos/400/600?random=2',
    createdAt: new Date('2024-06-05'),
  },
  {
    id: '3',
    title: 'Art Gallery Opening',
    date: '2024-09-10',
    time: '6:00 PM - 9:00 PM',
    address: 'Modern Art Museum, Los Angeles, CA',
    cost: 'Free',
    websiteUrl: 'https://example.com/art-opening',
    socialMediaHandles: {
      instagram: '@modernartla',
    },
    description: 'Opening night featuring contemporary artists from around the globe.',
    organizationName: 'Modern Art Museum',
    thumbnailImage: 'https://picsum.photos/200/300?random=3',
    posterImage: 'https://picsum.photos/400/600?random=3',
    createdAt: new Date('2024-06-10'),
  },
  {
    id: '4',
    title: 'Food & Wine Festival',
    date: '2024-10-05',
    time: '12:00 PM - 8:00 PM',
    address: 'Waterfront Plaza, Seattle, WA',
    cost: '$75',
    websiteUrl: 'https://example.com/food-wine',
    socialMediaHandles: {
      twitter: '@foodwinefest',
      instagram: '@foodwine2024',
      facebook: 'foodwinefestival',
    },
    description: 'Taste the finest cuisine and wines from local and international vendors.',
    organizationName: 'Culinary Events Group',
    thumbnailImage: 'https://picsum.photos/200/300?random=4',
    posterImage: 'https://picsum.photos/400/600?random=4',
    createdAt: new Date('2024-06-15'),
  },
  {
    id: '5',
    title: 'Yoga & Wellness Retreat',
    date: '2024-11-12',
    time: '8:00 AM - 6:00 PM',
    address: 'Mountain Resort, Aspen, CO',
    cost: '$120',
    websiteUrl: 'https://example.com/yoga-retreat',
    socialMediaHandles: {
      instagram: '@wellnessretreat',
    },
    description: 'A day of relaxation, yoga, meditation, and wellness workshops.',
    organizationName: 'Wellness Collective',
    thumbnailImage: 'https://picsum.photos/200/300?random=5',
    posterImage: 'https://picsum.photos/400/600?random=5',
    createdAt: new Date('2024-06-20'),
  },
];

export function EventProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>(dummyEvents);

  const addEvent = (eventData: Omit<Event, 'id' | 'createdAt'>) => {
    const newEvent: Event = {
      ...eventData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setEvents(prev => [newEvent, ...prev]);
  };

  const getEvents = () => {
    return events;
  };

  return (
    <EventContext.Provider value={{ events, addEvent, getEvents }}>
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
