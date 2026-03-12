import React, { createContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { auth } from '../config/firebase';
import { signInWithCustomToken } from 'firebase/auth';

// Define the shape of the context data
interface AuthContextType {
  userProfile: UserProfile | null;
  userGithubProfile: UserGithubProfile | null;
  isGithubProfileVerified: boolean | null;
  token: string | null;
  firebaseToken: string | null;
  isLoading: boolean;
  error: string | null;
  isProfileComplete: boolean;
  signup: (data: SignupData) => Promise<AuthResponse>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  githubVerificationURL: (accessToken: string) => Promise<AuthResponse>;
  githubVerificationStatus: (accessToken: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  githubProfileUrl: string;
  role: string;
  location: string;
  aboutMe: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserGithubProfile {
  username: string | null;
  profileUrl: string | null;
  verifiedAt: Date | null;
}

interface SignupData {
  fullName: string;
  email: string;
  githubProfileUrl: string;
  password?: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  user?: UserProfile;
  token?: string;
  firebaseToken?: string;
  authUrl?: string;
  isGithubVerified?: boolean;
  githubProfile?: UserGithubProfile;
}

// Create the context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(false);

  const navigate = useNavigate();

  const handleCheckProfileCompletion = async (accessToken?: string) => {
    // console.log("Checking profile completion..."); //debug
    // console.log("Using param token:", accessToken); //debug -> returns correct token
    // console.log("Using state token:", token); //debug -> returns undefined

    if (!accessToken) {
      // console.error("No token provided to handleCheckProfileCompletion");
      return false;
    }

    try {
      const response = await fetch('http://localhost:3000/api/profile/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // console.log("Profile fetch response status:", response.status); //debug

      if (!response.ok) {
        console.error('Profile fetch failed:', response.statusText);
        return false;
      }

      const result: any = await response.json();
      // console.log("Profile response:", result); //debug

      if (!result.success) return false;

      const profileData = result.profile || result.user;
      if (!profileData) return false;

      const requiredFields = ['fullName', 'githubProfileUrl', 'role', 'location', 'aboutMe'];
      const isComplete = requiredFields.every((field) => {
        const value = (profileData as any)[field];
        return typeof value === 'string' && value.trim() !== '';
      });
      setIsProfileComplete(isComplete);
      return isComplete;
    } catch (e: any) {
      console.error('Error checking profile completion:', e);
      return false;
    }
  };

  // Basic login implementation: set the user data
  const login = async (email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result: AuthResponse = await response.json();

      if (!result.success || !result.token) {
        setError(result.message);
        setIsLoading(false);
        return result;
      }

      if (result.success && result.token && result.firebaseToken) {
        setUserProfile(result.user || null);
        setFirebaseToken(result.firebaseToken);
        await signInWithCustomToken(auth, result.firebaseToken);
      }

      console.log('Login successful', result); //debug

      setToken(result.token);
      const isComplete = await handleCheckProfileCompletion(result.token);

      // console.log("Is profile complete:", isComplete); //debug

      if (isComplete) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }

      // Fetch the user profile data here after sign-in
      setIsLoading(false);
      return { success: true, message: 'Login successful!' };
    } catch (e: any) {
      const msg = e.message || 'Login failed.';
      setError(msg);
      setIsLoading(false);
      return { success: false, message: msg };
    }
  };

  // Basic signup implementation: you might call an API then set the user
  const signup = async (data: SignupData): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      // Call Express Backend Signup Endpoint
      const response = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result: AuthResponse = await response.json();

      if (!result.success || !result.token) {
        setError(result.message);
        setIsLoading(true);
        return result;
      }

      if (result.success && result.token && result.firebaseToken) {
        await signInWithCustomToken(auth, result.firebaseToken);

        // console.log(result); //debug

        // console.log("Signup successful, token received:", result.token); //debug
        setToken(result.token);
        setFirebaseToken(result.firebaseToken);
        setUserProfile(result.user || null); // Use the profile data returned by the backend
        setIsLoading(false);

        const githubVerificationResult = await githubVerificationURL(result.token);
        // console.log(githubVerificationResult);
        if (githubVerificationResult.success && githubVerificationResult.authUrl) {
          window.open(githubVerificationResult.authUrl, '_blank');
          // console.log("Verification URL response: ");
          return { success: true, message: 'Signup successful!' };
        }
      }
      return { success: false, message: 'Github verification failed.' };
    } catch (e: any) {
      // console.error("Signup failed:", e);
      const msg = e.message || 'Signup failed.';
      setError(msg);
      setIsLoading(false);
      return { success: false, message: msg };
    }
  };

  const githubVerificationURL = async (accessToken: string): Promise<AuthResponse> => {
    try {
      const response = await fetch('http://localhost:3000/api/github-verify/auth-url', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const result = await response.json();

      // console.log("Github verification URL started"); //debug
      // console.log("Using state token:", accessToken); //debug
      // console.log(
      // 	"Github verification URL response status:",
      // 	response.status
      // ); //debug

      // console.log("Github verification URL response:", result); //debug

      // const status = await githubVerificationStatus(accessToken);
      // console.log("Github Verification Status:", status);

      if (result.success) {
        setIsGithubProfileVerified(true);
        return {
          success: result.success,
          authUrl: result.authUrl,
          message: 'Github profile verified.',
        };
      }
      return { success: result.success, message: result.message };
    } catch (e: any) {
      // console.log("Github verification failed:", e);
      setError(e?.message || 'Github verification failed.');
      return { success: false, message: e?.message };
    }
  };

  const githubVerificationStatus = async (accessToken: string | null): Promise<AuthResponse> => {
    try {
      const response = await fetch('http://localhost:3000/api/github-verify/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const result = await response.json();

      // console.log("Github verification status started"); //debug
      // console.log("Using state token:", accessToken); //debug
      // console.log(
      // 	"Github verification status response status:",
      // 	response.status
      // ); //debug

      console.log('Github verification status response:', result); //debug

      if (result.success && result.isGithubVerified) {
        setIsGithubProfileVerified(true);
        setUserGithubProfile({
          username: result.githubProfile.username,
          profileUrl: result.githubProfile.profileUrl,
          verifiedAt: new Date(result.githubProfile.verifiedAt),
        });

        return {
          success: true,
          message: 'Github profile is verified.',
        };
      }
      return result;
    } catch (e: any) {
      setIsGithubProfileVerified(false);
      console.log('Github verification status check failed:', e);
      return { success: false, message: e?.message };
    }
  };

  // Logout implementation: clear the user
  const logout = async () => {
    setIsLoading(true);
    setUserProfile(null);
    setIsLoading(false);
  };

  const value: AuthContextType = {
    userProfile,
    userGithubProfile,
    isGithubProfileVerified,
    token,
    firebaseToken,
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
