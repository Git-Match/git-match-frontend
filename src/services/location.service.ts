import { db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export interface UserGeolocation {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

const normalizeUserLocation = (geolocation: any): UserGeolocation | null => {
  if (!geolocation) {
    return null;
  }

  return {
    city: geolocation.city ?? '',
    country: geolocation.country ?? '',
    lat: typeof geolocation.lat === 'number' ? geolocation.lat : 0,
    lng: typeof geolocation.lng === 'number' ? geolocation.lng : 0,
  };
};

export const getUserLocation = async (userId: string): Promise<UserGeolocation | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return null;
    }

    return normalizeUserLocation(snapshot.data().geolocation);
  } catch (e) {
    console.error('Error fetching location:', e);
    throw e;
  }
};

export const saveUserLocation = async (userId: string, location: UserGeolocation) => {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      geolocation: location,
    });
  } catch (error) {
    console.error('Error saving location:', error);
    throw error;
  }
};
