import { db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export const getUserLocation = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      return snapshot.data().location || [];
    }
    return [];
  } catch (e) {
    console.error('Error fetching location:', e);
    throw e;
  }
};

export const saveUserLocation = async (
  userId: string,
  location: string,
) => {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      location: location,
    });
  } catch (error) {
    console.error('Error saving location:', error);
    throw error;
  }
};
