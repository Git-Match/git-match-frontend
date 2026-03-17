import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, easeInOut } from 'framer-motion';
import { getDominantColors } from '../components/utils/colorUtils';
import type { Profile } from '../types/profile';
import SwipeCard from '../components/match/SwipeCard';
import { CustomButton } from '../components/ui/CustomButton';
import { ArrowLeft, LoaderCircle, MapPin, Settings, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LocationUpdateModal } from '../components/ui/LocationUpdateModal';
import {
  getUserLocation,
  saveUserLocation,
  type UserGeolocation,
} from '../services/location.service';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../config/firebase';

const BACKEND_BASE_URL = import.meta.env.VITE_API_BACKEND_BASE_URL;
const RECOMMENDATIONS_LIMIT = 20;
const DEFAULT_GRADIENT = 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)';

interface RecommendationUser {
  uid: string;
  fullName?: string;
  age?: number;
  role?: string;
  location?: string;
  city?: string;
  country?: string;
  aboutMe?: string;
  profileImage?: string;
  githubProfileUrl?: string;
  interests?: string[];
  goal?: string;
}

interface RecommendationsResponse {
  success: boolean;
  message: string;
  count: number;
  users?: RecommendationUser[];
}

interface ApiResponse {
  success: boolean;
  message: string;
}

const formatLocationLabel = (location: UserGeolocation | null) =>
  [location?.city, location?.country].filter(Boolean).join(', ');

const formatRecommendationLocation = (user: RecommendationUser) =>
  user.location?.trim() ||
  [user.city, user.country]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(', ') ||
  'Location unavailable';

const buildFallbackProfileImage = (name: string) => {
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((value) => value.charAt(0).toUpperCase())
      .join('') || 'GM';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#17324d" />
          <stop offset="100%" stop-color="#081018" />
        </linearGradient>
      </defs>
      <rect width="800" height="1000" fill="url(#bg)" />
      <circle cx="400" cy="340" r="150" fill="rgba(255,255,255,0.18)" />
      <path d="M200 860c26-154 147-240 300-240s274 86 300 240" fill="rgba(255,255,255,0.12)" />
      <text
        x="50%"
        y="55%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="128"
        font-weight="700"
        fill="#ffffff"
      >
        ${initials}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const mapRecommendationToProfile = (user: RecommendationUser): Profile => {
  const name = user.fullName?.trim() || user.role?.trim() || 'GitMatch User';
  const fallbackInterests = [user.role, user.goal]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  const interests =
    user.interests
      ?.map((interest) => interest.trim())
      .filter((value): value is string => Boolean(value)) || fallbackInterests;

  return {
    id: user.uid,
    name,
    age: typeof user.age === 'number' ? user.age : undefined,
    location: formatRecommendationLocation(user),
    image: user.profileImage?.trim() || buildFallbackProfileImage(name),
    interests,
    role: user.role?.trim() || undefined,
    aboutMe: user.aboutMe?.trim() || undefined,
    githubProfileUrl: user.githubProfileUrl?.trim() || undefined,
    goal: user.goal?.trim() || undefined,
  };
};

const Dashboard: React.FC = () => {
  const { userProfile, token, firebaseToken, isLoading: authLoading } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [gradient, setGradient] = useState<string>(DEFAULT_GRADIENT);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<UserGeolocation | null>(null);
  const [isLocationLoaded, setIsLocationLoaded] = useState(false);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(true);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [swipeError, setSwipeError] = useState<string | null>(null);
  const [isSwipePending, setIsSwipePending] = useState(false);

  const navigate = useNavigate();

  const getAuthToken = useCallback(async () => {
    if (auth.currentUser) {
      try {
        return await auth.currentUser.getIdToken();
      } catch (error) {
        console.warn('Failed to read Firebase ID token, falling back to stored auth token.', error);
      }
    }

    return (
      token ||
      firebaseToken ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('firebaseToken')
    );
  }, [token, firebaseToken]);

  const loadRecommendations = useCallback(async () => {
    setIsRecommendationsLoading(true);
    setRecommendationError(null);

    try {
      const authToken = await getAuthToken();

      if (!authToken) {
        throw new Error('Please log in again to load recommendations.');
      }

      const response = await fetch(
        `${BACKEND_BASE_URL}/api/recommendations?limit=${RECOMMENDATIONS_LIMIT}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const result = ((await response.json().catch(() => null)) ?? {}) as RecommendationsResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to retrieve recommendations');
      }

      setProfiles((result.users ?? []).map(mapRecommendationToProfile));
    } catch (error) {
      setProfiles([]);
      setRecommendationError(
        error instanceof Error ? error.message : 'Failed to retrieve recommendations'
      );
    } finally {
      setIsRecommendationsLoading(false);
    }
  }, [getAuthToken]);

  const recordLeftSwipe = useCallback(
    async (targetUserId: string) => {
      const authToken = await getAuthToken();

      if (!authToken) {
        throw new Error('Please log in again to continue swiping.');
      }

      const response = await fetch(`${BACKEND_BASE_URL}/api/leftswipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ targetUserId }),
      });

      const result = ((await response.json().catch(() => null)) ?? {}) as ApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to record left swipe');
      }
    },
    [getAuthToken]
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void loadRecommendations();
  }, [authLoading, loadRecommendations]);

  useEffect(() => {
    if (!profiles.length) return;

    let cancelled = false;

    getDominantColors(profiles[0].image)
      .then(([shadow, mid, highlight]) => {
        if (cancelled) return;

        setGradient(`
        radial-gradient(
          circle at top left,
          ${highlight},
          transparent 90%
        ),
        radial-gradient(
          circle at bottom right,
          ${mid},
          transparent 55%
        ),
        linear-gradient(
          135deg,
          ${shadow},
          ${mid}
        )
      `);
      })
      .catch(() => {
        if (!cancelled) {
          setGradient('linear-gradient(135deg, #1b1e31, #0d0a1e)');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profiles]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userProfile?.uid) {
      setIsLocationLoaded(true);
      return;
    }

    const loadLocation = async () => {
      try {
        const userLocation = await getUserLocation(userProfile.uid);
        setCurrentLocation(userLocation);
      } catch (e) {
        console.error('Failed to load location:', e);
      } finally {
        setIsLocationLoaded(true);
      }
    };

    void loadLocation();
  }, [authLoading, userProfile]);

  useEffect(() => {
    if (!swipeError) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSwipeError(null);
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [swipeError]);

  const handleOpenLocationUpdateModal = () => {
    setIsLocationModalOpen(true);
  };

  const handleCloseLocationModal = () => {
    setIsLocationModalOpen(false);
  };

  const handleSaveLocation = async (newLocation: UserGeolocation) => {
    setCurrentLocation(newLocation);
    setIsLocationLoaded(true);
    try {
      if (!userProfile) throw new Error('User not authenticated.');
      await saveUserLocation(userProfile.uid, newLocation);
    } catch (e) {
      console.error('Failed to save location:', e);
    }
    setIsLocationModalOpen(false);
  };

  const removeTopProfile = (direction: 'left' | 'right') =>
    new Promise<void>((resolve) => {
      setExitDirection(direction);

      window.setTimeout(() => {
        setProfiles((prev) => prev.slice(1));

        window.setTimeout(() => {
          setExitDirection(null);
          resolve();
        }, 300);
      }, 100);
    });

  const handleSwipe = (direction: 'left' | 'right') => {
    const activeProfile = profiles[0];

    if (!activeProfile || isSwipePending) {
      return;
    }

    setIsSwipePending(true);
    setSwipeError(null);

    const removeProfilePromise = removeTopProfile(direction).finally(() => {
      setIsSwipePending(false);
    });

    if (direction === 'left') {
      void recordLeftSwipe(activeProfile.id).catch((error) => {
        setSwipeError(error instanceof Error ? error.message : 'Failed to record left swipe');
      });
    }

    void removeProfilePromise;
  };

  // Variants define how the card enters and leaves
  const cardVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { duration: 0.3 } },
    exit: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? -1000 : 1000,
      rotate: direction === 'left' ? -20 : 20,
      opacity: 0,
      transition: { duration: 0.4, ease: easeInOut },
    }),
  };

  if (authLoading || isRecommendationsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <div className="flex items-center gap-3 text-lg">
          <LoaderCircle className="animate-spin" />
          Loading recommendations...
        </div>
      </div>
    );
  }

  if (recommendationError && profiles.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black px-6 text-white">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-md">
          <h2 className="mb-3 text-2xl font-bold">Unable to load profiles</h2>
          <p className="mb-6 text-sm text-gray-300">{recommendationError}</p>
          <div className="flex justify-center gap-4">
            <CustomButton
              onClick={() => {
                navigate('/');
              }}
              className="cursor-pointer bg-white/10 text-white"
            >
              <ArrowLeft />
            </CustomButton>
            <button
              onClick={() => {
                void loadRecommendations();
              }}
              className="cursor-pointer rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-md">
          <h2 className="mb-2 text-2xl font-bold">No more profiles</h2>
          <p className="mb-6 text-gray-400">Check back later for more matches!</p>
          <button
            onClick={() => {
              void loadRecommendations();
            }}
            className="cursor-pointer rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Refresh recommendations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden transition-colors duration-700 ease-in-out"
      style={{ background: gradient }}
    >
      {/* Background Overlay for better text contrast */}
      <div className="absolute inset-0 z-0 bg-black/20 backdrop-blur-[60px]"></div>
      {swipeError && (
        <div className="absolute top-28 z-20 rounded-full border border-red-400/30 bg-red-950/70 px-4 py-2 text-sm text-red-200 backdrop-blur-md">
          {swipeError}
        </div>
      )}

      <div className="absolute top-10 z-10 flex w-full items-center justify-between px-12">
        <div>
          <CustomButton
            onClick={() => {
              navigate('/');
            }}
            className="cursor-pointer bg-white/10 text-white"
          >
            <ArrowLeft />
          </CustomButton>
        </div>
        <div className="w-fit">
          <CustomButton
            onClick={handleOpenLocationUpdateModal}
            className="flex w-full cursor-pointer items-center justify-center gap-2 bg-white/10 px-4 text-white hover:border-green-500/50 hover:bg-green-500/20 hover:text-green-400"
          >
            <AnimatePresence mode="wait" initial={false}>
              {!isLocationLoaded ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <LoaderCircle className="animate-spin" />
                </motion.div>
              ) : (
                <div className="flex gap-2">
                  <motion.div
                    key="location"
                    className="flex gap-2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <MapPin />{' '}
                    {currentLocation ? formatLocationLabel(currentLocation) : 'Set location'}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </CustomButton>
        </div>
        <div className="flex gap-4">
          <CustomButton
            onClick={() => {
              navigate('/settings');
            }}
            className="cursor-pointer bg-white/10 text-white hover:border-red-500/50 hover:bg-red-500/20 hover:text-red-400"
          >
            <Settings />
          </CustomButton>
          <CustomButton
            onClick={() => {
              navigate('/profile');
            }}
            className="cursor-pointer bg-white/10 text-white hover:border-blue-500/50 hover:bg-blue-500/20 hover:text-blue-400"
          >
            <UserRound />
          </CustomButton>
        </div>
      </div>
      <div className="relative z-10 flex h-[70vh] w-full max-w-sm items-center justify-center md:max-w-md">
        <AnimatePresence custom={exitDirection}>
          {profiles.length > 0 ? (
            <motion.div
              key={profiles[0].id}
              custom={exitDirection}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute inset-0 h-full w-full"
            >
              <SwipeCard profile={profiles[0]} onSwipe={handleSwipe} disabled={isSwipePending} />
            </motion.div>
          ) : (
            <div className="z-20 text-center text-white">
              {/* Empty state content */}
              <h2>No more profiles</h2>
            </div>
          )}
        </AnimatePresence>
      </div>
      {isLocationModalOpen && (
        <LocationUpdateModal
          onClose={handleCloseLocationModal}
          onSave={handleSaveLocation}
          currentLocation={currentLocation}
        />
      )}
    </div>
  );
};

export default Dashboard;
