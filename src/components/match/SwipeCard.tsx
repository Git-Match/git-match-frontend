import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Heart, MapPin, MessageCircle, X } from 'lucide-react';
import type { Profile } from '../../types/profile';
import { CustomButton } from '../ui/CustomButton';

const SwipeCard = ({
  profile,
  onSwipe,
}: {
  profile: Profile;
  onSwipe: (dir: 'left' | 'right') => void;
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | DragEvent, info: PanInfo) => {
    if (info.offset.x > 120) onSwipe('right');
    else if (info.offset.x < -120) onSwipe('left');
    else x.set(0);
  };

  const currentProfile = profile; // For clarity in JSX

  return (
    <motion.div
      drag="x"
      style={{ x, rotate }}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab overflow-hidden rounded-3xl border-2 border-zinc-50/20 shadow-xl drop-shadow-xl backdrop-blur-md"
    >
      <img
        src={profile.image}
        alt={profile.name}
        className="pointer-events-none h-full w-full object-cover select-none"
        draggable="false"
      />
      {/* Gradient Overlay for Text Visibility */}
      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent"></div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-row items-end justify-between p-6">
        {/* Left Side: Profile Info */}
        <div className="mb-4 flex-1 pr-4 select-none">
          {/* Location Tag */}
          <div className="mb-3 flex w-fit items-center gap-1 rounded-full bg-white/20 px-2 py-1 backdrop-blur-md">
            <MapPin size={12} className="text-white" />
            <span className="text-[10px] font-medium tracking-wide text-white uppercase">
              {currentProfile.location}
            </span>
          </div>
          {/* Name & Age */}
          <h2 className="text-4xl leading-tight font-semibold text-white">
            {currentProfile.name},{' '}
            <span className="font-semibold text-white">{currentProfile.age}</span>
          </h2>
          {/* Interests */}
          <div className="mt-3 flex flex-wrap gap-2">
            {currentProfile.interests.slice(0, 3).map((interest) => (
              <span
                key={interest}
                className="rounded-full border border-white/30 bg-black/20 px-3 py-1 text-xs text-white/90"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
        {/* Right Side: Action Buttons (Floating) */}
        <div className="mb-2 flex flex-col gap-4">
          {/* Comment Button */}
          <CustomButton className="bg-white/10 text-white hover:bg-blue-600/70">
            <MessageCircle size={22} />
          </CustomButton>
          {/* Like Button */}
          <CustomButton
            onClick={() => {
              onSwipe('right');
            }}
            className="bg-linear-to-tr from-pink-500 to-purple-600 text-white shadow-lg shadow-purple-500/40"
          >
            <Heart size={22} fill="white" />
          </CustomButton>
          {/* Dismiss Button */}
          <CustomButton
            onClick={() => {
              onSwipe('left');
            }}
            className="bg-black/40 text-white shadow-lg hover:border-red-500/50 hover:bg-red-500/20 hover:text-red-400"
          >
            <X size={24} />
          </CustomButton>
        </div>
      </div>
    </motion.div>
  );
};

export default SwipeCard;
