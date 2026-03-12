import { useState, type FC, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import BgGradient from '../components/ui/BgGradient';
import { InputField } from '../components/ui/InputField';
import { useAuth } from '../hooks/useAuth';

// --- Static Data ---
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

const Onboarding: FC = () => {
  const { userProfile, isLoading: authLoading, token } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    dob: new Date(2024, 11, 25, 10, 30, 0, 0),
    geolocation: {
      city: '',
      country: '',
      lat: undefined as number | undefined,
      lng: undefined as number | undefined,
    },
    genderPreference: '',
    interests: [] as string[],
    otherInterest: '',
    relationshipGoals: '',
  });
  const [status, setStatus] = useState({
    message: '',
    error: false,
    loading: false,
  });

  // Calculate age from dateOfBirth if provided and age not explicitly set
  let age = undefined;
  if (formData.dob && (age === undefined || age === null)) {
    const dob = new Date(formData.dob);
    const today = new Date();
    let calcAge = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      calcAge--;
    }
    age = calcAge;
  }
  const [useGeo, setUseGeo] = useState(false);

  const totalSteps = 3;

  // --- Handlers ---
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGeoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      geolocation: {
        ...prev.geolocation,
        [name]: value,
      },
    }));
  };

  const handleInterestChange = (interest: string) => {
    setFormData((prev) => {
      const isSelected = prev.interests.includes(interest);
      if (isSelected) {
        return {
          ...prev,
          interests: prev.interests.filter((i) => i !== interest),
        };
      } else {
        return {
          ...prev,
          interests: [...prev.interests, interest],
        };
      }
    });
  };

  const handleLocationServices = () => {
    setStatus({ ...status, loading: true });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            geolocation: {
              city: 'Current Location',
              country: 'Loading...', // City/Country lookup would require a geo-encoding API call here
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
          }));

          // Use promise-based handling for async reverse geocoding to avoid 'await' inside a non-async callback
          getCityCountryFromCoords(position.coords.latitude, position.coords.longitude)
            .then((coords) => {
              console.log(coords.city, coords.country);
              // update formData with resolved city/country if available
              setFormData((prev) => ({
                ...prev,
                geolocation: {
                  ...prev.geolocation,
                  city: coords.city ?? prev.geolocation.city,
                  country: coords.country ?? prev.geolocation.country,
                },
              }));

              setUseGeo(true);
              setStatus({
                ...status,
                loading: false,
                message: 'Location captured (Requires lookup for City/Country).',
              });
            })
            .catch((err) => {
              console.error('Reverse geocoding failed:', err);
              console.log(position);
              // Still mark location as captured but indicate reverse geocoding failure
              setUseGeo(true);
              setStatus({
                ...status,
                loading: false,
                message: 'Location captured but reverse geocoding failed.',
              });
            });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setUseGeo(false);
          setStatus({
            ...status,
            loading: false,
            error: true,
            message: 'Geolocation denied or unavailable. Please enter manually.',
          });
        }
      );
    } else {
      setUseGeo(false);
      setStatus({
        ...status,
        loading: false,
        error: true,
        message: 'Geolocation is not supported by this browser.',
      });
    }
  };

  // Reverse geocoding function to get city and country from coordinates
  const getCityCountryFromCoords = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            'User-Agent': 'YourAppName/1.0', // required by Nominatim
          },
        }
      );

      const data = await res.json();

      const city =
        data.address.county ||
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.suburb ||
        data.address.state_district ||
        data.address.road;

      const country = data.address.country;

      console.log('Reverse geocoding result:', data);

      return { city, country };
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
      return { city: null, country: null };
    }
  };

  const handleNext = () => {
    // Basic validation before moving to the next step
    if (currentStep === 1) {
      if (
        age === undefined ||
        age < 18 ||
        (!useGeo && (!formData.geolocation.city || !formData.geolocation.country))
      ) {
        setStatus({
          error: true,
          message: 'Please enter a valid dob (18+) and location.',
          loading: false,
        });
        return;
      }
    }
    if (currentStep === 2) {
      if (
        !formData.genderPreference ||
        (formData.interests.length === 0 && !formData.otherInterest)
      ) {
        setStatus({
          error: true,
          message: 'Please select a gender preference and at least one interest.',
          loading: false,
        });
        return;
      }
    }

    setStatus({ error: false, message: '', loading: false });
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handleSubmit = async () => {
    if (!userProfile) {
      setStatus({
        error: true,
        message: 'User not authenticated. Please log in.',
        loading: false,
      });
      return;
    }

    if (!formData.relationshipGoals) {
      setStatus({
        error: true,
        message: 'Please select your relationship goals.',
        loading: false,
      });
      return;
    }

    setStatus({
      message: 'Submitting profile...',
      loading: true,
      error: false,
    });

    const finalData = {
      uid: userProfile.uid, // Get UID from authenticated Firebase user
      dob: formData.dob,
      geolocation: formData.geolocation,
      genderPreference: formData.genderPreference,
      // Combine array interests and free text
      interests: [
        ...formData.interests,
        ...(formData.otherInterest ? [formData.otherInterest] : []),
      ],
      relationshipGoals: formData.relationshipGoals,
    };

    // Call Backend API to save data to Firestore
    try {
      const response = await fetch('http://localhost:3000/api/profile/me', {
        // not the real endpoint
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          // 'dob' -> 'dateOfBirth' to match backend's variable name
          dateOfBirth: finalData.dob,
          geolocation: finalData.geolocation,
          genderPreference: finalData.genderPreference,
          interests: finalData.interests,
          relationshipGoals: finalData.relationshipGoals,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus({
          message: 'Profile setup complete! Redirecting...',
          loading: false,
          error: false,
        });
        // Redirect to the main app dashboard
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        setStatus({
          message: result.message || 'Submission failed.',
          loading: false,
          error: true,
        });
      }
    } catch (error) {
      setStatus({
        message: 'Network error. Could not connect to server.',
        loading: false,
        error: true,
      });
      console.error('Submission failed:', error);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          // Step 1: Personal Information
          <div className="space-y-8">
            <h3 className="mb-6 text-xl font-semibold text-purple-300">1. Personal Information</h3>

            <InputField
              label="Date Of Birth (Must be 18+)"
              name="dob"
              type="date"
              value={String(formData.dob)}
              onChange={handleInputChange}
              min={18}
              max={100}
            />

            <h4 className="border-t border-white/10 pt-4 text-lg font-medium text-white">
              Geolocation
            </h4>

            <div className="flex flex-col gap-4 md:flex-row">
              <button
                type="button"
                onClick={handleLocationServices}
                disabled={status.loading || useGeo}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  useGeo
                    ? 'bg-green-600/50 text-white'
                    : 'bg-purple-600/80 text-white hover:bg-purple-700/80'
                } ${status.loading && 'cursor-wait'} `}
              >
                {status.loading
                  ? 'Fetching...'
                  : useGeo
                    ? 'Location Captured'
                    : 'Use Current Location'}
              </button>
              <button
                type="button"
                onClick={() => setUseGeo(false)}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  !useGeo
                    ? 'bg-gray-600/50 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                } `}
              >
                Enter Manually
              </button>
            </div>

            <InputField
              label="City / Region"
              name="city"
              value={formData.geolocation.city}
              onChange={handleGeoChange}
              disabled={useGeo}
            />
            <InputField
              label="Country"
              name="country"
              value={formData.geolocation.country}
              onChange={handleGeoChange}
              disabled={useGeo}
            />
          </div>
        );
      case 2:
        return (
          // Step 2: Preferences
          <div className="space-y-8">
            <h3 className="mb-6 text-xl font-semibold text-purple-300">
              2. Preferences & Interests
            </h3>

            <div className="rounded-lg border border-white/10 p-4">
              <label className="mb-3 block text-sm text-gray-300">Gender Preference</label>
              {['Male', 'Female', 'Other', 'Prefer not to say'].map((pref) => (
                <div key={pref} className="mb-2 flex items-center">
                  <input
                    type="radio"
                    id={pref}
                    name="genderPreference"
                    value={pref}
                    checked={formData.genderPreference === pref}
                    onChange={handleInputChange}
                    className="form-radio h-4 w-4 border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor={pref} className="ml-3 text-sm text-white">
                    {pref}
                  </label>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-white/10 p-4">
              <label className="mb-3 block text-sm text-gray-300">
                Interests (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-3">
                {INTERESTS_OPTIONS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => handleInterestChange(interest)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      formData.interests.includes(interest)
                        ? 'bg-pink-600 text-white shadow-md'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
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
                  value={formData.otherInterest}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          // Step 3: Relationship Goals
          <div className="space-y-8">
            <h3 className="mb-6 text-xl font-semibold text-purple-300">3. Relationship Goals</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {RELATIONSHIP_GOALS.map((goal) => (
                <div key={goal} className="relative">
                  <input
                    type="radio"
                    id={goal}
                    name="relationshipGoals"
                    value={goal}
                    checked={formData.relationshipGoals === goal}
                    onChange={handleInputChange}
                    className="hidden"
                  />
                  <label
                    htmlFor={goal}
                    className={`block cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${
                      formData.relationshipGoals === goal
                        ? 'border-purple-500 bg-purple-600 text-white shadow-xl shadow-purple-900/50'
                        : 'border-gray-700 bg-white/5 text-gray-300 hover:border-purple-500/50'
                    } `}
                  >
                    <span className="text-lg font-semibold">{goal}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // // Prevent rendering if auth status is loading
  // if (authLoading) {
  //   return (
  //       <div className="min-h-screen flex justify-center items-center bg-black text-white">
  //           <p>Loading user session...</p>
  //       </div>
  //   );
  // }

  return (
    <div className="relative min-h-screen w-full">
      <BgGradient />

      <main className="relative z-10 flex items-center justify-center p-4 py-6">
        <div className="w-full max-w-xl rounded-[2.5rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md md:p-10">
          <h1 className="mb-4 text-center text-3xl font-bold text-white">Profile Setup</h1>
          <p className="mb-8 text-center text-gray-400">
            Step {currentStep} of {totalSteps}
          </p>

          {/* Status Message */}
          {status.message && (
            <div
              className={`mb-6 rounded-lg p-3 text-center text-sm ${
                status.error ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'
              }`}
            >
              {status.message}
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-10 h-2 w-full rounded-full bg-gray-700">
            <div
              className="h-2 rounded-full bg-purple-500 transition-all duration-500"
              style={{
                width: `${(currentStep / totalSteps) * 100}%`,
              }}
            ></div>
          </div>

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="mt-12 flex justify-between border-t border-white/10 pt-6">
            {currentStep > 1 ? (
              <button
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="rounded-full bg-white/10 px-6 py-2 font-medium text-white transition-colors hover:bg-white/20"
                disabled={status.loading}
              >
                Back
              </button>
            ) : (
              // Placeholder to keep buttons aligned
              <div className="w-20"></div>
            )}

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="rounded-full bg-linear-to-r from-purple-600 to-pink-600 px-8 py-3 font-bold text-white shadow-lg shadow-purple-900/50 transition-all hover:scale-[1.03]"
                disabled={status.loading}
              >
                Save and Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="rounded-full bg-linear-to-r from-green-600 to-teal-500 px-8 py-3 font-bold text-white shadow-lg shadow-green-900/50 transition-all hover:scale-[1.03]"
                disabled={status.loading}
              >
                {status.loading ? 'Submitting...' : 'Submit Profile'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
