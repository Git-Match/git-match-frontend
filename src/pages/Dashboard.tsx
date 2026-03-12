import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, easeInOut } from 'framer-motion';
import { getDominantColors } from '../components/utils/colorUtils';
import type { Profile } from '../types/profile';
import SwipeCard from '../components/match/SwipeCard';
import { MOCK_PROFILES } from '../data/mockProfile';
import { CustomButton } from '../components/ui/CustomButton';
import { ArrowLeft, LoaderCircle, MapPin, Settings, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LocationUpdateModal } from '../components/ui/LocationUpdateModal';
import { getUserLocation, saveUserLocation } from '../services/location.service';
import { useAuth } from '../hooks/useAuth';

const Dashboard: React.FC = () => {
  const { firebaseToken, userProfile, isLoading: authLoading } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>(MOCK_PROFILES);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [gradient, setGradient] = useState<string>(
    'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)'
  );
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(''); // fetch from profile

  const navigate = useNavigate();

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
    const loadLocation = async () => {
      if (userProfile?.uid && firebaseToken) {
        try {
          // console.log('Loading location of user:', userProfile.uid);
          const userLocation = await getUserLocation(userProfile.uid);

          setCurrentLocation(userLocation);
          console.log('New Current Location:', userLocation);
        } catch (e) {
          console.error('Failed to load location:', e);
        }
      } else {
        console.log('Waiting for user profile and firebase token...');
      }
    };
    if (!authLoading && userProfile?.uid && firebaseToken) {
      loadLocation();
    }
  }, [firebaseToken, userProfile?.uid, authLoading]);

  const handleOpenLocationUpdateModal = () => {
    setIsLocationModalOpen(true);
  };

  const handleCloseLocationModal = () => {
    setIsLocationModalOpen(false);
  };

  const handleSaveLocation = (newLocation: string) => {
    setCurrentLocation(newLocation);
    try {
      if (!userProfile) throw new Error('User not authenticated.');
      saveUserLocation(userProfile.uid, newLocation);
    } catch (e) {
      console.error('Failed to save location:', e);
    }
    setIsLocationModalOpen(false);
  };

  // Swipe Handlers
  const handleSwipe = (direction: 'left' | 'right') => {
    setExitDirection(direction);

    setTimeout(() => {
      setProfiles((prev) => prev.slice(1));
      setExitDirection(direction);
    }, 100); // slight delay to allow exit animation to trigger
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

  if (profiles.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold">No more profiles</h2>
          <p className="text-gray-400">Check back later for more matches!</p>
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
              {!currentLocation ? (
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
                    <MapPin /> {currentLocation}
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
              <SwipeCard profile={profiles[0]} onSwipe={handleSwipe} />
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
