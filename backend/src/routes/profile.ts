import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import admin from '../firebase/admin.js';
import { StorageService } from '../utils/storage.js';
import { UpdateProfileRequest, ProfileResponse, UserProfile } from '../types/user.js';

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    [key: string]: any;
  };
}

const router = Router();

// Rate limiter: e.g., max 100 requests per 15 minutes per IP
const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
// Middleware to verify Firebase ID token
// Middleware to verify Firebase ID token or Custom token
const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = (req.headers.authorization || '') as string;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    (req as AuthenticatedRequest).user = decodedToken as any;
    return next();
  } catch (error: any) {
    console.error('ID token verification failed:', error.message);

    // If ID token verification fails, try custom token
    try {
      const decodedToken = await admin
        .auth()
        .verifySessionCookie(token, true)
        .catch(() => {
          throw new Error('Not a session cookie');
        });
      (req as AuthenticatedRequest).user = decodedToken as any;
      return next();
    } catch (customError: any) {
      console.error('Custom token verification also failed:', customError.message);
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  }
};

// Get current user's profile (authenticated)
router.get('/me', profileLimiter, verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.uid;

    const userDoc = await admin.firestore().collection('users').doc(userId).get();

    if (!userDoc.exists) {
      const response: ProfileResponse = { success: false, message: 'Profile not found' };
      return res.status(404).json(response);
    }

    const profile = userDoc.data() as UserProfile;

    const response: ProfileResponse = {
      success: true,
      message: 'Profile retrieved successfully',
      profile,
    };

    return res.json(response);
  } catch (error) {
    console.error('Get profile error:', error);
    const response: ProfileResponse = { success: false, message: 'Failed to retrieve profile' };
    return res.status(500).json(response);
  }
});

// Update current user's profile (authenticated)
router.put('/me', profileLimiter, verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.uid;
    const updateData = req.body as UpdateProfileRequest;

    // Get current profile
    const userDocRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      const response: ProfileResponse = { success: false, message: 'Profile not found' };
      return res.status(404).json(response);
    }

    const currentProfile = userDoc.data() as UserProfile;
    let profileImageUrl = currentProfile.profileImage;

    // Handle profile image upload if provided (assume base64)
    if (updateData.profileImage) {
      try {
        if (currentProfile.profileImage) {
          await StorageService.deleteProfileImage(userId);
        }
        profileImageUrl = await StorageService.uploadBase64Image(
          updateData.profileImage,
          userId,
          'profile.jpg'
        );
      } catch (imageError) {
        console.error('Image upload error:', imageError);
        const response: ProfileResponse = {
          success: false,
          message: 'Failed to upload profile image',
        };
        return res.status(400).json(response);
      }
    }

    // Calculate age from dateOfBirth if provided and age not explicitly set
    let age = (updateData as any).age as number | undefined;
    if (updateData.dateOfBirth && (age === undefined || age === null)) {
      const dob = new Date(updateData.dateOfBirth);
      const today = new Date();
      let calcAge = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        calcAge--;
      }
      age = calcAge;
    }

    // Prepare update object
    const updatedProfile: Partial<UserProfile> = {
      ...updateData,
      profileImage: profileImageUrl,
      age: age,
      updatedAt: new Date().toISOString(),
    };

    // Remove undefined fields
    Object.keys(updatedProfile).forEach((key) => {
      if ((updatedProfile as any)[key] === undefined) {
        delete (updatedProfile as any)[key];
      }
    });

    // Update in Firestore
    await userDocRef.update(updatedProfile);

    // Return updated profile
    const updatedDoc = await userDocRef.get();
    const profile = updatedDoc.data() as UserProfile;

    const response: ProfileResponse = {
      success: true,
      message: 'Profile updated successfully',
      profile,
    };
    return res.json(response);
  } catch (error) {
    console.error('Update profile error:', error);
    const response: ProfileResponse = { success: false, message: 'Failed to update profile' };
    return res.status(500).json(response);
  }
});

// Get user profile by ID (public endpoint)
router.get("/:userId", async (req: Request, res: Response) => {
	try {
		const rawUserId = (req.params as any).userId as string | string[];
		const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
		if (!userId) {
			const response: ProfileResponse = {
				success: false,
				message: "userId is required",
			};
			return res.status(400).json(response);
		}

    const userDoc = await admin.firestore().collection('users').doc(userId).get();

    if (!userDoc.exists) {
      const response: ProfileResponse = {
        success: false,
        message: 'Profile not found',
      };
      return res.status(404).json(response);
    }

    const profile = userDoc.data() as UserProfile;

    // Remove sensitive information for public endpoint
    const publicProfile = { ...(profile as any) };
    if ((publicProfile as any).email) delete (publicProfile as any).email;

    const response: ProfileResponse = {
      success: true,
      message: 'Profile retrieved successfully',
      profile: publicProfile as UserProfile,
    };

    return res.json(response);
  } catch (error) {
    console.error('Get public profile error:', error);
    const response: ProfileResponse = {
      success: false,
      message: 'Failed to retrieve profile',
    };
    return res.status(500).json(response);
  }
});

export default router;
