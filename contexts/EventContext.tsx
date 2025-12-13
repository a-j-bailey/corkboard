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
    posterImage: 'https://picsum.photos/400/600?random=5',
    createdAt: new Date('2024-06-20'),
  },
  {
    id: '6',
    title: 'Jazz Night at the Blue Note',
    date: '2024-07-22',
    time: '8:00 PM - 11:00 PM',
    address: 'Blue Note Jazz Club, New York, NY',
    cost: '$35',
    websiteUrl: 'https://example.com/jazz-night',
    socialMediaHandles: {
      twitter: '@bluenotejazz',
      instagram: '@bluenotejazz',
    },
    description: 'An intimate evening of live jazz performances featuring renowned musicians.',
    organizationName: 'Blue Note Jazz Club',
    posterImage: 'https://picsum.photos/400/600?random=6',
    createdAt: new Date('2024-06-25'),
  },
  {
    id: '7',
    title: 'Marathon & 5K Run',
    date: '2024-09-28',
    time: '7:00 AM - 12:00 PM',
    address: 'Golden Gate Park, San Francisco, CA',
    cost: '$50',
    websiteUrl: 'https://example.com/marathon',
    socialMediaHandles: {
      twitter: '@sfmarathon',
      facebook: 'sfmarathon2024',
    },
    description: 'Join thousands of runners for the annual city marathon. All skill levels welcome!',
    organizationName: 'SF Running Club',
    posterImage: 'https://picsum.photos/400/600?random=7',
    createdAt: new Date('2024-07-01'),
  },
  {
    id: '8',
    title: 'Comedy Night Stand-Up',
    date: '2024-08-14',
    time: '7:30 PM - 10:00 PM',
    address: 'Laugh Factory, Los Angeles, CA',
    cost: '$25',
    websiteUrl: 'https://example.com/comedy-night',
    socialMediaHandles: {
      instagram: '@laughfactoryla',
      twitter: '@laughfactory',
    },
    description: 'An evening of laughter with top comedians from around the country.',
    organizationName: 'Laugh Factory',
    posterImage: 'https://picsum.photos/400/600?random=8',
    createdAt: new Date('2024-07-05'),
  },
  {
    id: '9',
    title: 'Farmers Market & Local Crafts',
    date: '2024-10-19',
    time: '9:00 AM - 2:00 PM',
    address: 'Downtown Square, Portland, OR',
    cost: 'Free',
    websiteUrl: 'https://example.com/farmers-market',
    socialMediaHandles: {
      instagram: '@portlandfarmers',
      facebook: 'portlandfarmersmarket',
    },
    description: 'Fresh produce, local crafts, live music, and food trucks. Support local vendors!',
    organizationName: 'Portland Farmers Market',
    posterImage: 'https://picsum.photos/400/600?random=9',
    createdAt: new Date('2024-07-10'),
  },
  {
    id: '10',
    title: 'Photography Workshop',
    date: '2024-11-05',
    time: '10:00 AM - 4:00 PM',
    address: 'Photography Studio, Chicago, IL',
    cost: '$95',
    websiteUrl: 'https://example.com/photo-workshop',
    socialMediaHandles: {
      instagram: '@photoworkshop',
      twitter: '@photoworkshop',
    },
    description: 'Learn professional photography techniques from award-winning photographers. Bring your camera!',
    organizationName: 'Chicago Photography School',
    posterImage: 'https://picsum.photos/400/600?random=10',
    createdAt: new Date('2024-07-15'),
  },
  {
    id: '11',
    title: 'Book Reading & Signing',
    date: '2024-08-03',
    time: '6:00 PM - 8:00 PM',
    address: 'Independent Bookstore, Boston, MA',
    cost: 'Free',
    websiteUrl: 'https://example.com/book-reading',
    socialMediaHandles: {
      twitter: '@bookstoreboston',
      instagram: '@bookstoreboston',
    },
    description: 'Meet the author and get your copy signed. Discussion and Q&A session included.',
    organizationName: 'Boston Books',
    posterImage: 'https://picsum.photos/400/600?random=11',
    createdAt: new Date('2024-07-20'),
  },
  {
    id: '12',
    title: 'Craft Beer Tasting',
    date: '2024-09-15',
    time: '4:00 PM - 8:00 PM',
    address: 'Brewery District, Denver, CO',
    cost: '$40',
    websiteUrl: 'https://example.com/beer-tasting',
    socialMediaHandles: {
      instagram: '@denverbreweries',
      facebook: 'denverbeertasting',
    },
    description: 'Sample craft beers from local breweries. Food trucks and live music included.',
    organizationName: 'Denver Brewers Guild',
    posterImage: 'https://picsum.photos/400/600?random=12',
    createdAt: new Date('2024-07-25'),
  },
  {
    id: '13',
    title: 'Dance Performance: Contemporary',
    date: '2024-10-12',
    time: '7:30 PM - 9:30 PM',
    address: 'Performing Arts Center, Miami, FL',
    cost: '$55',
    websiteUrl: 'https://example.com/dance-performance',
    socialMediaHandles: {
      instagram: '@miamidance',
      twitter: '@miamidance',
    },
    description: 'An evening of contemporary dance featuring world-renowned choreographers and dancers.',
    organizationName: 'Miami Dance Company',
    posterImage: 'https://picsum.photos/400/600?random=13',
    createdAt: new Date('2024-08-01'),
  },
  {
    id: '14',
    title: 'Science Fair & Expo',
    date: '2024-11-20',
    time: '10:00 AM - 5:00 PM',
    address: 'Science Museum, Austin, TX',
    cost: '$20',
    websiteUrl: 'https://example.com/science-fair',
    socialMediaHandles: {
      twitter: '@austinmuseum',
      facebook: 'austinsciencemuseum',
    },
    description: 'Interactive exhibits, hands-on experiments, and demonstrations for all ages.',
    organizationName: 'Austin Science Museum',
    posterImage: 'https://picsum.photos/400/600?random=14',
    createdAt: new Date('2024-08-05'),
  },
  {
    id: '15',
    title: 'Vintage Car Show',
    date: '2024-08-25',
    time: '9:00 AM - 4:00 PM',
    address: 'Fairgrounds, Detroit, MI',
    cost: '$15',
    websiteUrl: 'https://example.com/car-show',
    socialMediaHandles: {
      instagram: '@detroitcarshow',
      facebook: 'detroitvintagecars',
    },
    description: 'Classic and vintage automobiles on display. Food vendors and live entertainment.',
    organizationName: 'Detroit Auto Club',
    posterImage: 'https://picsum.photos/400/600?random=15',
    createdAt: new Date('2024-08-10'),
  },
  {
    id: '16',
    title: 'Cooking Class: Italian Cuisine',
    date: '2024-09-22',
    time: '6:00 PM - 9:00 PM',
    address: 'Culinary School, Philadelphia, PA',
    cost: '$85',
    websiteUrl: 'https://example.com/cooking-class',
    socialMediaHandles: {
      instagram: '@phillyculinary',
      twitter: '@phillyculinary',
    },
    description: 'Learn to make authentic Italian dishes from scratch. All ingredients and recipes included.',
    organizationName: 'Philadelphia Culinary Institute',
    posterImage: 'https://picsum.photos/400/600?random=16',
    createdAt: new Date('2024-08-15'),
  },
  {
    id: '17',
    title: 'Outdoor Movie Night',
    date: '2024-08-18',
    time: '8:00 PM - 11:00 PM',
    address: 'City Park, Nashville, TN',
    cost: 'Free',
    websiteUrl: 'https://example.com/movie-night',
    socialMediaHandles: {
      instagram: '@nashvilleparks',
      facebook: 'nashvilleoutdoormovies',
    },
    description: 'Bring a blanket and enjoy a classic film under the stars. Concessions available.',
    organizationName: 'Nashville Parks & Recreation',
    posterImage: 'https://picsum.photos/400/600?random=17',
    createdAt: new Date('2024-08-20'),
  },
  {
    id: '18',
    title: 'Rock Climbing Workshop',
    date: '2024-10-28',
    time: '9:00 AM - 3:00 PM',
    address: 'Climbing Gym, Boulder, CO',
    cost: '$65',
    websiteUrl: 'https://example.com/climbing-workshop',
    socialMediaHandles: {
      instagram: '@boulderclimbing',
      twitter: '@boulderclimbing',
    },
    description: 'Learn basic to advanced climbing techniques. All equipment provided. Beginners welcome!',
    organizationName: 'Boulder Climbing Academy',
    posterImage: 'https://picsum.photos/400/600?random=18',
    createdAt: new Date('2024-08-25'),
  },
  {
    id: '19',
    title: 'Poetry Slam & Open Mic',
    date: '2024-09-05',
    time: '7:00 PM - 10:00 PM',
    address: 'Coffee House, Portland, OR',
    cost: '$10',
    websiteUrl: 'https://example.com/poetry-slam',
    socialMediaHandles: {
      instagram: '@portlandpoetry',
      twitter: '@portlandpoetry',
    },
    description: 'Share your poetry or just listen. Cash prizes for winners. Sign-ups at the door.',
    organizationName: 'Portland Poetry Collective',
    posterImage: 'https://picsum.photos/400/600?random=19',
    createdAt: new Date('2024-08-30'),
  },
  {
    id: '20',
    title: 'Fashion Show: Spring Collection',
    date: '2024-11-18',
    time: '7:00 PM - 9:00 PM',
    address: 'Fashion District, Los Angeles, CA',
    cost: '$75',
    websiteUrl: 'https://example.com/fashion-show',
    socialMediaHandles: {
      instagram: '@lafashionshow',
      twitter: '@lafashionshow',
      facebook: 'lafashionshow2024',
    },
    description: 'Preview the latest spring collections from emerging designers. Cocktail reception included.',
    organizationName: 'LA Fashion Week',
    posterImage: 'https://picsum.photos/400/600?random=20',
    createdAt: new Date('2024-09-05'),
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
