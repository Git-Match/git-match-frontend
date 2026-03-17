import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { auth } from '../config/firebase';
import { onIdTokenChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import {
  AuthContext,
  type ApiGithubProfile,
  type ApiUserProfile,
  type AuthContextType,
  type AuthResponse,
  type SignupData,
  type UserGithubProfile,
  type UserProfile,
} from './auth-context';

const BACKEND_BASE_URL = import.meta.env.VITE_API_BACKEND_BASE_URL;
const ACCESS_TOKEN_STORAGE_KEY = 'accessToken';
const FIREBASE_TOKEN_STORAGE_KEY = 'firebaseToken';

interface ProfileLookupResponse {
  success: boolean;
  message?: string;
  profile?: ApiUserProfile | null;
}

const REQUIRED_PROFILE_FIELDS: Array<
  keyof Pick<ApiUserProfile, 'fullName' | 'githubProfileUrl' | 'role' | 'aboutMe'>
> = ['fullName', 'githubProfileUrl', 'role', 'aboutMe'];

const toDate = (value?: string | number | Date | null): Date =>
  value ? new Date(value) : new Date();

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const normalizeUserProfile = (profile?: ApiUserProfile | null): UserProfile => ({
  uid: profile?.uid ?? '',
  fullName: profile?.fullName ?? '',
  email: profile?.email ?? '',
  githubProfileUrl: profile?.githubProfileUrl ?? '',
  role: profile?.role ?? '',
  geolocation: {
    city: profile?.geolocation?.city ?? profile?.city ?? '',
    country: profile?.geolocation?.country ?? profile?.country ?? '',
    lat: profile?.geolocation?.lat ?? 0,
    lng: profile?.geolocation?.lng ?? 0,
  },
  aboutMe: profile?.aboutMe ?? '',
  createdAt: toDate(profile?.createdAt),
  updatedAt: toDate(profile?.updatedAt),
});

const normalizeGithubProfile = (profile?: ApiGithubProfile | null): UserGithubProfile => ({
  username: profile?.username ?? null,
  profileUrl: profile?.profileUrl ?? null,
  verifiedAt: profile?.verifiedAt ? new Date(profile.verifiedAt) : null,
});

// Create the provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGithubProfileVerified, setIsGithubProfileVerified] = useState(false);
  const [userGithubProfile, setUserGithubProfile] = useState<UserGithubProfile>({
    username: null,
    profileUrl: null,
    verifiedAt: null,
  });
  const [token, setToken] = useState<string | null>(null);
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(false);

  const navigate = useNavigate();

  const persistFirebaseToken = useCallback((nextToken: string | null) => {
    setFirebaseToken(nextToken);

    if (nextToken) {
      localStorage.setItem(FIREBASE_TOKEN_STORAGE_KEY, nextToken);
      return;
    }

    localStorage.removeItem(FIREBASE_TOKEN_STORAGE_KEY);
  }, []);

  const persistAccessToken = useCallback((nextToken: string | null) => {
    setToken(nextToken);

    if (nextToken) {
      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, nextToken);
      return;
    }

    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }, []);

  const resetAuthState = useCallback(() => {
    persistAccessToken(null);
    persistFirebaseToken(null);
    setUserProfile(null);
    setIsProfileComplete(false);
    setIsAuthenticated(false);
    setIsGithubProfileVerified(false);
    setUserGithubProfile(normalizeGithubProfile());
  }, [persistAccessToken, persistFirebaseToken]);

  const signInToFirebase = async (customToken?: string | null) => {
    if (!customToken) {
      persistFirebaseToken(null);
      return null;
    }

    try {
      const credential = await signInWithCustomToken(auth, customToken);
      const nextFirebaseIdToken = await credential.user.getIdToken();
      persistFirebaseToken(nextFirebaseIdToken);
      return nextFirebaseIdToken;
    } catch (error: unknown) {
      console.warn('Firebase custom-token sign-in failed:', error);
      persistFirebaseToken(null);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        persistFirebaseToken(null);
        return;
      }

      try {
        const nextFirebaseIdToken = await user.getIdToken();
        persistFirebaseToken(nextFirebaseIdToken);
      } catch (error: unknown) {
        console.warn('Failed to refresh Firebase ID token:', error);
      }
    });

    return unsubscribe;
  }, [persistFirebaseToken]);

  // Restore the auth session and profile when the app starts.
  const handleCheckProfileCompletion = useCallback(
    async (idToken?: string): Promise<boolean | null> => {
      if (!idToken) {
        resetAuthState();
        return null;
      }

      const response = await fetch(BACKEND_BASE_URL + '/api/profile/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${idToken}` }, // no Content-Type needed for GET
      });

      if (!response.ok) {
        console.error('Profile fetch failed:', response.status, await response.text());
        resetAuthState();
        return null;
      }

      const result = (await response.json()) as ProfileLookupResponse;
      if (!result.success || !result.profile) {
        resetAuthState();
        return null;
      }

      const p = result.profile;
      setIsAuthenticated(true);
      setUserProfile(normalizeUserProfile(p));

      const locationOk = [
        p.location,
        p.city,
        p.country,
        p?.geolocation?.city,
        p?.geolocation?.country,
      ].some((v) => typeof v === 'string' && v.trim() !== '');

      const isComplete =
        REQUIRED_PROFILE_FIELDS.every(
          (field) => typeof p[field] === 'string' && p[field].trim() !== ''
        ) && locationOk;

      setIsProfileComplete(isComplete);
      return isComplete;
    },
    [resetAuthState]
  );

  useEffect(() => {
    const bootstrapAuth = async () => {
      const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
      const storedFirebaseToken = localStorage.getItem(FIREBASE_TOKEN_STORAGE_KEY);

      if (storedAccessToken) {
        persistAccessToken(storedAccessToken);
      }

      if (storedFirebaseToken) {
        setFirebaseToken(storedFirebaseToken);
      }

      if (!storedAccessToken) {
        resetAuthState();
        setIsLoading(false);
        return;
      }

      try {
        await handleCheckProfileCompletion(storedAccessToken);
      } catch (error: unknown) {
        console.error('Failed to restore auth session:', error);
        resetAuthState();
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAuth();
  }, [handleCheckProfileCompletion, persistAccessToken, resetAuthState]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(BACKEND_BASE_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json()) as AuthResponse;
      if (!result.success || !result.token) {
        setError(result.message);
        return result;
      }

      const accessToken = result.token;
      persistAccessToken(accessToken);
      setIsAuthenticated(true);

      if (result.firebaseToken) {
        await signInToFirebase(result.firebaseToken);
      } else {
        persistFirebaseToken(null);
      }

      if (result.user) {
        setUserProfile(normalizeUserProfile(result.user));
      }

      const isComplete = await handleCheckProfileCompletion(accessToken);
      if (isComplete === null) {
        return {
          success: false,
          message: 'Login succeeded, but your profile could not be loaded. Please try again.',
        };
      }

      navigate(isComplete ? '/dashboard' : '/onboarding');
      return { success: true, message: 'Login successful!' };
    } catch (error: unknown) {
      const msg = getErrorMessage(error, 'Login failed.');
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  };

  // Basic signup implementation: you might call an API then set the user
  const signup = async (data: SignupData): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      // Call Express Backend Signup Endpoint
      const response = await fetch(BACKEND_BASE_URL + '/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = (await response.json()) as AuthResponse;

      if (!result.success || !result.token) {
        setError(result.message);
        setIsLoading(false);
        return result;
      }

      if (result.success && result.token && result.firebaseToken) {
        await signInToFirebase(result.firebaseToken);

        persistAccessToken(result.token);
        setIsAuthenticated(true);
        setIsProfileComplete(false);

        setUserProfile(result.user ? normalizeUserProfile(result.user) : null);
        setIsLoading(false);

        const githubVerificationResult = await githubVerificationURL(result.token);
        if (githubVerificationResult.success && githubVerificationResult.authUrl) {
          window.open(githubVerificationResult.authUrl, '_blank');
          return { success: true, message: 'Signup successful!' };
        }
      }
      setIsLoading(false);
      return { success: false, message: 'Github verification failed.' };
    } catch (error: unknown) {
      const msg = getErrorMessage(error, 'Signup failed.');
      setError(msg);
      setIsLoading(false);
      return { success: false, message: msg };
    }
  };

  const githubVerificationURL = async (accessToken: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(BACKEND_BASE_URL + '/api/github-verify/auth-url', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const result = (await response.json()) as AuthResponse;

      if (result.success) {
        setIsGithubProfileVerified(true);
        return {
          success: result.success,
          authUrl: result.authUrl,
          message: 'Github profile verified.',
        };
      }
      return { success: result.success, message: result.message };
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Github verification failed.');
      setError(message);
      return { success: false, message };
    }
  };

  const githubVerificationStatus = async (accessToken: string | null): Promise<AuthResponse> => {
    try {
      const response = await fetch(BACKEND_BASE_URL + '/api/github-verify/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const result = (await response.json()) as AuthResponse;

      if (result.success && result.isGithubVerified) {
        setIsGithubProfileVerified(true);
        setUserGithubProfile(normalizeGithubProfile(result.githubProfile));

        return {
          success: true,
          message: 'Github profile is verified.',
        };
      }
      return result;
    } catch (error: unknown) {
      setIsGithubProfileVerified(false);
      const message = getErrorMessage(error, 'Github verification status check failed.');
      console.log('Github verification status check failed:', error);
      return { success: false, message };
    }
  };

  // Logout implementation: clear the user
  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
    } catch (error: unknown) {
      console.warn('Firebase sign-out failed:', error);
    } finally {
      resetAuthState();
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    userProfile,
    userGithubProfile,
    isGithubProfileVerified,
    token,
    firebaseToken,
    isAuthenticated,
    isLoading,
    error,
    isProfileComplete,
    signup,
    login,
    githubVerificationURL,
    githubVerificationStatus,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
