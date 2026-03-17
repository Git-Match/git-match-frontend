import { createContext } from 'react';

export interface AuthContextType {
  userProfile: UserProfile | null;
  userGithubProfile: UserGithubProfile | null;
  isGithubProfileVerified: boolean | null;
  token: string | null;
  firebaseToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isProfileComplete: boolean;
  signup: (data: SignupData) => Promise<AuthResponse>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  githubVerificationURL: (accessToken: string) => Promise<AuthResponse>;
  githubVerificationStatus: (accessToken: string | null) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  githubProfileUrl: string;
  role: string;
  geolocation: { city: string; country: string; lat: number; lng: number };
  aboutMe: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserGithubProfile {
  username: string | null;
  profileUrl: string | null;
  verifiedAt: Date | null;
}

export interface SignupData {
  fullName: string;
  email: string;
  githubProfileUrl: string;
  password?: string;
}

export interface ApiUserProfile {
  uid?: string;
  fullName?: string;
  email?: string;
  githubProfileUrl?: string;
  role?: string;
  location?: string;
  city?: string;
  country?: string;
  geolocation?: {
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  } | null;
  aboutMe?: string;
  createdAt?: string | number | Date | null;
  updatedAt?: string | number | Date | null;
}

export interface ApiGithubProfile {
  username?: string | null;
  profileUrl?: string | null;
  verifiedAt?: string | number | Date | null;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: ApiUserProfile;
  token?: string;
  firebaseToken?: string;
  authUrl?: string;
  isGithubVerified?: boolean;
  githubProfile?: ApiGithubProfile;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
