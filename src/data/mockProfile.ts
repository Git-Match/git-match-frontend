import type { Profile } from '../types/profile';

// --- Mock Data ---
export const MOCK_PROFILES: Profile[] = [
  {
    id: '1',
    name: 'Sarah',
    age: 24,
    location: 'Brooklyn, NY',
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&auto=format&fit=crop',
    interests: ['Coffee', 'React', 'Hiking'],
  },
  {
    id: '2',
    name: 'James',
    age: 27,
    location: 'Austin, TX',
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&auto=format&fit=crop',
    interests: ['Photography', 'Music', 'Travel'],
  },
  {
    id: '3',
    name: 'Elena',
    age: 25,
    location: 'London, UK',
    image:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop',
    interests: ['Art', 'Design', 'Yoga'],
  },
];
