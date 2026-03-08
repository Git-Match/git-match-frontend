import { Router } from 'express';
import admin from '../firebase/admin.js';
import axios from 'axios';
import { SignupRequest, LoginRequest, AuthResponse, UserProfile } from '../types/user.js';

const router = Router();

// Signup endpoint - Only basic fields
router.post('/signup', async (req, res) => {
  try {
    console.log('Signup request body:', req.body); // Debug log

    const { fullName, email, githubProfileUrl, password }: SignupRequest = req.body;

    // Validate only basic required fields
    if (!fullName || !email || !githubProfileUrl || !password) {
      const response: AuthResponse = {
        success: false,
        message: 'All basic fields are required: fullName, email, githubProfileUrl, password',
      };
      return res.status(400).json(response);
    }

    console.log('Creating user in Firebase Auth...'); // Debug log

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
    });

    console.log('Firebase user created:', userRecord.uid); // Debug log

    // Create minimal user profile
    const userProfile: UserProfile = {
      uid: userRecord.uid,
      fullName,
      email,
      githubProfileUrl,
      role: 'Software Developer', // Default
      // New optional fields (can be null)
      city: null,
      country: null,
      location: null,
      gender: null,
      interest: null,
      goal: null,
      aboutMe: 'Passionate developer looking to connect with like-minded tech enthusiasts!', // Default
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('Storing profile in Firestore...'); // Debug log

    // Store in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set(userProfile);

    // Generate Custom Token for Frontend SDK direct access
    const firebaseToken = await admin.auth().createCustomToken(userRecord.uid);

    console.log('Creating custom token...'); // Debug log

    // Create custom token for client-side authentication
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    // Try to exchange the custom token for an ID token (convenience for clients/tests)
    let idToken: string | undefined = undefined;
    let refreshToken: string | undefined = undefined;
    let expiresIn: string | undefined = undefined;
    const apiKey = process.env.FIREBASE_API_KEY;
    console.log('API Key available:', !!apiKey);
    if (apiKey) {
      try {
        const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`;
        const resp = await axios.post(url, {
          token: customToken,
          returnSecureToken: true,
        });
        idToken = resp.data.idToken;
        refreshToken = resp.data.refreshToken;
        expiresIn = resp.data.expiresIn; // seconds as string
        console.log('Successfully exchanged custom token for ID token');
      } catch (exchangeErr: any) {
        console.error('Failed to exchange custom token for ID token:', {
          status: exchangeErr?.response?.status,
          data: exchangeErr?.response?.data,
          message: exchangeErr?.message,
        });
      }
    } else {
      console.warn('FIREBASE_API_KEY is not set');
    }

    const response: AuthResponse = {
      success: true,
      message: 'User created successfully',
      user: userProfile,
      // prefer returning an ID token (ready-to-use) if available, otherwise return the custom token
      token: idToken || customToken,
      firebaseToken: firebaseToken,
    };
    // include additional token info when available
    if (idToken) {
      response.refreshToken = refreshToken;
      response.expiresIn = expiresIn;
    }

    console.log('Signup successful!'); // Debug log
    res.status(201).json(response);
  } catch (error: any) {
    console.error('Signup error details:', error); // Detailed error log

    let message = 'Failed to create user';
    if (error.code === 'auth/email-already-exists') {
      message = 'Email already exists';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email address';
    } else if (error.code === 'auth/weak-password') {
      message = 'Password should be at least 6 characters';
    } else {
      message = error.code ? `Firebase Error: ${error.code}` : message;
    }

    const response: AuthResponse = {
      success: false,
      message,
    };
    res.status(400).json(response);
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      const response: AuthResponse = {
        success: false,
        message: 'Email and password are required',
      };
      return res.status(400).json(response);
    }

    // Use Firebase REST API to verify password and get ID token
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      const response: AuthResponse = {
        success: false,
        message: 'Server configuration error: FIREBASE_API_KEY not set',
      };
      return res.status(500).json(response);
    }

    try {
      // Sign in with email and password using Firebase REST API
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
      const resp = await axios.post(url, {
        email,
        password,
        returnSecureToken: true,
      });

      const idToken = resp.data.idToken;
      const userId = resp.data.localId;

      console.log('Successfully authenticated user:', userId);

      // Get user profile from Firestore
      const userDoc = await admin.firestore().collection('users').doc(userId).get();

      if (!userDoc.exists) {
        const response: AuthResponse = {
          success: false,
          message: 'User profile not found',
        };
        return res.status(404).json(response);
      }

      const userProfile = userDoc.data() as UserProfile;

      const firebaseToken = await admin.auth().createCustomToken(userId);

      const response: AuthResponse = {
        success: true,
        message: 'Login successful',
        user: userProfile,
        token: idToken,
        firebaseToken: firebaseToken,
      };
      if (resp.data.refreshToken) {
        response.refreshToken = resp.data.refreshToken;
        response.expiresIn = resp.data.expiresIn;
      }

      res.json(response);
    } catch (error: any) {
      console.error('Firebase authentication error:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });

      let message = 'Login failed';
      if (error?.response?.data?.error?.message === 'INVALID_PASSWORD') {
        message = 'Invalid email or password';
      } else if (error?.response?.data?.error?.message === 'EMAIL_NOT_FOUND') {
        message = 'User not found';
      }

      const response: AuthResponse = {
        success: false,
        message,
      };
      res.status(401).json(response);
    }
  } catch (error: any) {
    console.error('Login error:', error);

    const response: AuthResponse = {
      success: false,
      message: 'Login failed',
    };
    res.status(401).json(response);
  }
});

export default router;

// Debug route: decode JWT payload (no verification) to inspect token fields
// Useful to distinguish custom tokens vs ID tokens when testing.
router.post('/token-info', (req, res) => {
  try {
    const authHeader = (req.headers.authorization || req.body.token || '') as string;
    let token = authHeader;
    if (authHeader.startsWith('Bearer ')) token = authHeader.split('Bearer ')[1];
    if (!token) return res.status(400).json({ success: false, message: 'No token provided' });

    const parts = token.split('.');
    if (parts.length < 2)
      return res.status(400).json({ success: false, message: 'Invalid JWT format' });

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return res.json({ success: true, payload });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to decode token',
      error: String(err),
    });
  }
});
