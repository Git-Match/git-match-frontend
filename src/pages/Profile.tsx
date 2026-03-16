import { useEffect, useState, type ChangeEvent, type FC } from 'react';

import BgGradient from '../components/ui/BgGradient';
import { InputField } from '../components/ui/InputField';
import { auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';

const PROFILE_API_URL = `${import.meta.env.VITE_API_BASE_URL ?? 'https://git-match-backend.onrender.com'}/api/profile/me`;
const DEFAULT_PROFILE_PICTURE =
  'https://images.unsplash.com/photo-1554083021-dd6b85a6d423?q=80&w=150&h=150&fit=crop';
const GENDER_PREFERENCES = ['Male', 'Female', 'Other', 'Prefer not to say'];
const INTERESTS_OPTIONS = [
  'Open Source',
  'Machine Learning',
  'Data Science',
  'Web Development',
  'Gaming',
  'Arts & Culture',
  'Travel',
  'Fitness',
  'Music',
  'Reading',
  'Cooking',
];
const RELATIONSHIP_GOALS = ['Casual', 'Dating', 'Long-term relationship', 'Friendship'];

interface UserProfile {
  fullName: string;
  role: string;
  githubURL: string;
  location: string;
  about: string;
  dob: string;
  genderPreference: string;
  interests: string[];
  otherInterest: string;
  relationshipGoals: string;
}

type RawProfile = {
  fullName?: string;
  role?: string;
  githubProfileUrl?: string;
  aboutMe?: string;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  gender?: string | null;
  goal?: string | null;
  interest?: string | null;
  profileImage?: string;
  age?: number | null;
  dob?: unknown;
  dateOfBirth?: unknown;
  geolocation?: {
    city?: string | null;
    country?: string | null;
  };
};

type ProfileResponse = {
  success?: boolean;
  message?: string;
  profile?: RawProfile;
};

type FirestoreTimestampLike = {
  seconds?: number;
  _seconds?: number;
  toDate?: () => Date;
};

type SaveStatus = {
  message: string;
  error: boolean;
};

const emptyProfileData: UserProfile = {
  fullName: '',
  role: '',
  githubURL: '',
  location: '',
  about: '',
  dob: '',
  genderPreference: '',
  interests: [],
  otherInterest: '',
  relationshipGoals: '',
};

const calculateAge = (dobString: string): number | null => {
  if (!dobString) {
    return null;
  }

  const dob = new Date(dobString);

  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age;
};

const normalizeDateValue = (value: unknown): string => {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  if (typeof value === 'object') {
    const timestamp = value as FirestoreTimestampLike;

    if (typeof timestamp.toDate === 'function') {
      return normalizeDateValue(timestamp.toDate());
    }

    const seconds =
      typeof timestamp.seconds === 'number'
        ? timestamp.seconds
        : typeof timestamp._seconds === 'number'
          ? timestamp._seconds
          : null;

    if (seconds !== null) {
      return normalizeDateValue(new Date(seconds * 1000));
    }
  }

  return '';
};

const formatLocation = (profile?: RawProfile | null) =>
  profile?.location?.trim() ||
  [profile?.geolocation?.city ?? profile?.city, profile?.geolocation?.country ?? profile?.country]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(', ');

const splitCommaSeparatedValues = (value?: string | null) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is string => Boolean(item));

const normalizeInterests = (interests?: string[]) =>
  Array.from(
    new Set(
      (interests ?? [])
        .map((interest) => interest.trim())
        .filter((interest): interest is string => Boolean(interest))
    )
  );

const splitInterestSelections = (interests?: string[]) => {
  const normalizedInterests = normalizeInterests(interests);
  const predefinedInterests = normalizedInterests.filter((interest) =>
    INTERESTS_OPTIONS.includes(interest)
  );
  const customInterests = normalizedInterests.filter(
    (interest) => !INTERESTS_OPTIONS.includes(interest)
  );

  return {
    predefinedInterests,
    otherInterest: customInterests.join(', '),
  };
};

const resolveProfileInterests = (profile?: RawProfile | null) =>
  normalizeInterests(splitCommaSeparatedValues(profile?.interest));

const extractProfileAge = (profile?: RawProfile | null) =>
  typeof profile?.age === 'number' && Number.isFinite(profile.age) ? profile.age : null;

const mapProfileToUserProfile = (profile?: RawProfile | null): UserProfile => {
  const { predefinedInterests, otherInterest } = splitInterestSelections(
    resolveProfileInterests(profile)
  );

  return {
    fullName: profile?.fullName?.trim() ?? '',
    role: profile?.role?.trim() ?? '',
    githubURL: profile?.githubProfileUrl?.trim() ?? '',
    location: formatLocation(profile),
    about: profile?.aboutMe?.trim() ?? '',
    dob: normalizeDateValue(profile?.dateOfBirth ?? profile?.dob),
    genderPreference: profile?.gender?.trim() ?? '',
    interests: predefinedInterests,
    otherInterest,
    relationshipGoals: profile?.goal?.trim() ?? '',
  };
};

const resolveProfileAuthToken = async (fallbackToken: string | null) => {
  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch (error) {
      console.warn('Failed to refresh Firebase ID token, falling back to stored token.', error);
    }
  }

  return fallbackToken || localStorage.getItem('firebaseToken');
};

const Profile: FC = () => {
  const { firebaseToken, isLoading: authLoading } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile>(emptyProfileData);
  const [profilePicture, setProfilePicture] = useState(DEFAULT_PROFILE_PICTURE);
  const [profileAge, setProfileAge] = useState<number | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);

  const age = calculateAge(profileData.dob) ?? profileAge;

  useEffect(() => {
    const controller = new AbortController();

    const fetchProfile = async () => {
      if (authLoading) {
        return;
      }

      setIsProfileLoading(true);
      setLoadError(null);

      try {
        const token = await resolveProfileAuthToken(firebaseToken);

        if (!token) {
          throw new Error('No token provided');
        }

        const response = await fetch(PROFILE_API_URL, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const data = ((await response.json().catch(() => null)) ?? null) as ProfileResponse | null;

        if (!response.ok || !data?.success || !data.profile) {
          throw new Error(data?.message || 'Failed to retrieve profile');
        }

        if (controller.signal.aborted) {
          return;
        }

        setProfileData(mapProfileToUserProfile(data.profile));
        setProfilePicture(data.profile.profileImage?.trim() || DEFAULT_PROFILE_PICTURE);
        setProfileAge(extractProfileAge(data.profile));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : 'Failed to retrieve profile');
        setProfileData(emptyProfileData);
        setProfilePicture(DEFAULT_PROFILE_PICTURE);
        setProfileAge(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsProfileLoading(false);
        }
      }
    };

    void fetchProfile();

    return () => controller.abort();
  }, [authLoading, firebaseToken]);

  const updateProfileField = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    setSaveStatus(null);
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    updateProfileField(name as keyof UserProfile, value as UserProfile[keyof UserProfile]);
  };

  const handleInterestChange = (interest: string) => {
    setSaveStatus(null);
    setProfileData((prev) => {
      const isSelected = prev.interests.includes(interest);

      return {
        ...prev,
        interests: isSelected
          ? prev.interests.filter((item) => item !== interest)
          : [...prev.interests, interest],
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus({
      message: 'Saving profile...',
      error: false,
    });

    try {
      const token = await resolveProfileAuthToken(firebaseToken);

      if (!token) {
        throw new Error('No token provided');
      }

      const allInterests = normalizeInterests([
        ...profileData.interests,
        ...splitCommaSeparatedValues(profileData.otherInterest),
      ]);
      const trimmedLocation = profileData.location.trim();
      const trimmedDob = profileData.dob.trim();
      const trimmedGender = profileData.genderPreference.trim();
      const trimmedGoal = profileData.relationshipGoals.trim();

      const payload: Record<string, unknown> = {
        fullName: profileData.fullName.trim(),
        role: profileData.role.trim(),
        aboutMe: profileData.about.trim(),
        githubProfileUrl: profileData.githubURL.trim(),
        location: trimmedLocation || null,
        gender: trimmedGender || null,
        interest: allInterests.length > 0 ? allInterests.join(', ') : null,
        goal: trimmedGoal || null,
      };

      if (trimmedDob) {
        payload.dateOfBirth = trimmedDob;
      }

      if (!trimmedLocation) {
        payload.city = null;
        payload.country = null;
      }

      const response = await fetch(PROFILE_API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = ((await response.json().catch(() => null)) ?? null) as ProfileResponse | null;

      if (!response.ok || !data?.success || !data.profile) {
        throw new Error(data?.message || 'Failed to update profile');
      }

      setProfileData(mapProfileToUserProfile(data.profile));
      setProfilePicture(data.profile.profileImage?.trim() || DEFAULT_PROFILE_PICTURE);
      setProfileAge(extractProfileAge(data.profile));
      setLoadError(null);
      setSaveStatus({
        message: data.message || 'Profile updated successfully.',
        error: false,
      });
    } catch (error) {
      setSaveStatus({
        message: error instanceof Error ? error.message : 'Failed to update profile',
        error: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const profileSummary =
    [profileData.role, profileData.location].filter(Boolean).join(', ') ||
    'Profile details unavailable';

  const selectedInterestCount =
    profileData.interests.length +
    profileData.otherInterest
      .split(',')
      .map((interest) => interest.trim())
      .filter(Boolean).length;

  return (
    <div className="relative isolate min-h-dvh w-full overflow-x-clip bg-[#05010b] text-white">
      <BgGradient />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {/* NEW LAYOUT: 12-column grid. 
        Left side (Image) gets 5 columns. 
        Right side (Details) gets 7 columns. 
      */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
          {/* LEFT COLUMN: MASSIVE PROFILE PHOTO & UPLOAD */}
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 shadow-[0_30px_120px_rgba(192,38,211,0.15)] lg:sticky lg:top-10 lg:col-span-5 lg:h-[calc(100vh-5rem)]">
            <img
              src={
                profilePicture ||
                'https://images.unsplash.com/photo-1605776332618-6f0b905be303?q=80&w=1500&auto=format&fit=crop'
              }
              alt="Main Profile"
              className="absolute inset-0 h-full w-full object-cover"
            />

            {/* Subtle gradient so text overlays on the image are readable */}
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/20" />

            {/* Hover Overlay for Uploading */}
            <div className="group absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 hover:opacity-100">
              <div className="mb-3 rounded-full bg-fuchsia-500/20 p-4 text-fuchsia-300 backdrop-blur-md">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <span className="font-semibold tracking-wide">Update Photo</span>
            </div>

            {/* Quick Preview Info fixed to the bottom of the photo */}
            <div className="pointer-events-none absolute right-0 bottom-0 left-0 p-8">
              <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
                {profileData.fullName || 'GitMatch User'}
                {age !== null && <span className="font-light"> {age}</span>}
              </h1>
              <p className="mt-2 text-lg font-medium text-gray-200 drop-shadow-sm">
                {profileData.role || 'Ready to pair program'}
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: PROFILE DETAILS & SETTINGS */}
          <div className="rounded-4xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl lg:col-span-7 lg:p-10">
            <div className="mb-8 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-3xl font-bold text-white">Profile Details</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Configure how you appear to other developers.
                </p>
              </div>
              {isProfileLoading && (
                <p className="animate-pulse text-sm font-medium text-fuchsia-400">Loading...</p>
              )}
            </div>

            {loadError && (
              <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {loadError}
              </div>
            )}

            {saveStatus && (
              <div
                className={`mb-6 rounded-2xl px-4 py-3 text-sm ${
                  saveStatus.error
                    ? 'border border-red-500/20 bg-red-500/10 text-red-200'
                    : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                }`}
              >
                {saveStatus.message}
              </div>
            )}

            <div
              className={`space-y-6 transition-opacity ${
                isProfileLoading || isSaving ? 'pointer-events-none opacity-60' : 'opacity-100'
              }`}
            >
              {/* Grid for standard text inputs */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <InputField
                  onChange={handleChange}
                  name="fullName"
                  label="Full Name"
                  value={profileData.fullName}
                />
                <InputField
                  onChange={handleChange}
                  name="age"
                  label="Age"
                  value={age === null ? '' : String(age)}
                  disabled
                  readOnly
                  type="number"
                />
                <div className="md:col-span-2">
                  <InputField
                    onChange={handleChange}
                    name="role"
                    label="Role / Area of Interest"
                    value={profileData.role}
                  />
                </div>
                <div className="md:col-span-2">
                  <InputField
                    onChange={handleChange}
                    name="githubURL"
                    label="Github Profile Link"
                    value={profileData.githubURL}
                  />
                </div>
                <InputField
                  onChange={handleChange}
                  name="location"
                  label="Location"
                  value={profileData.location}
                />
                <InputField
                  onChange={handleChange}
                  name="dob"
                  label="Date of Birth"
                  value={profileData.dob}
                  type="date"
                />
                <div className="md:col-span-2">
                  <InputField
                    onChange={handleChange}
                    name="about"
                    label="About me"
                    value={profileData.about}
                  />
                </div>
              </div>

              <hr className="my-6 border-white/10" />

              {/* Gender Preferences */}
              <div>
                <label className="mb-3 block text-sm font-medium text-gray-300">
                  I am looking for
                </label>
                <div className="flex flex-wrap gap-3">
                  {GENDER_PREFERENCES.map((preference) => {
                    const isSelected = profileData.genderPreference === preference;
                    return (
                      <button
                        key={preference}
                        type="button"
                        onClick={() => updateProfileField('genderPreference', preference)}
                        className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-colors ${
                          isSelected
                            ? 'border-fuchsia-500 bg-fuchsia-600 text-white shadow-md'
                            : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/15'
                        }`}
                      >
                        {preference}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interests */}
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-gray-300">Tech & Hobbies</label>
                  <span className="text-xs font-medium text-purple-300">
                    {selectedInterestCount} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {INTERESTS_OPTIONS.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => handleInterestChange(interest)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        profileData.interests.includes(interest)
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-white/5 text-gray-300 hover:bg-white/15'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <InputField
                    label="Other Interest (Free text)"
                    name="otherInterest"
                    value={profileData.otherInterest}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Relationship Goals */}
              <div>
                <label className="mb-3 block text-sm font-medium text-gray-300">
                  Relationship Goals
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {RELATIONSHIP_GOALS.map((goal) => {
                    const isSelected = profileData.relationshipGoals === goal;
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => updateProfileField('relationshipGoals', goal)}
                        className={`rounded-2xl border-2 p-5 text-left transition-all ${
                          isSelected
                            ? 'border-fuchsia-500 bg-fuchsia-500/10 text-white shadow-[0_0_20px_rgba(217,70,239,0.15)]'
                            : 'border-white/5 bg-white/5 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <span
                          className={`block text-base font-semibold ${isSelected ? 'text-fuchsia-300' : 'text-white'}`}
                        >
                          {goal}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save Button */}
              <div className="mt-10 flex justify-end pt-6">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isProfileLoading || isSaving}
                  className={`w-full rounded-full bg-linear-to-r from-purple-600 to-fuchsia-500 px-10 py-4 font-bold tracking-wider text-white shadow-lg shadow-purple-500/30 transition-all sm:w-auto ${
                    isProfileLoading || isSaving
                      ? 'cursor-not-allowed opacity-70'
                      : 'cursor-pointer hover:scale-[1.02] hover:shadow-fuchsia-500/40'
                  }`}
                >
                  {isSaving ? 'SAVING PROFILE...' : 'SAVE CHANGES'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
