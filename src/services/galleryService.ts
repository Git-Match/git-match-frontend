import { db } from '../config/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

// Fetch the existing gallery from the user's document
export const getUserGallery = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      return snapshot.data().gallery || [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching gallery:', error);
    throw error;
  }
};

// Save the entire gallery array (Base64 strings) to Firestore
export const saveUserGallery = async (userId: string, galleryImages: any[]) => {
  try {
    const userRef = doc(db, 'users', userId);

    // This overwrites the 'gallery' field with the new array of Base64 images
    await updateDoc(userRef, {
      gallery: galleryImages,
    });
  } catch (error) {
    console.error('Error saving gallery:', error);
    throw error;
  }
};
