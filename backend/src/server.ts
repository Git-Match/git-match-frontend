import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import leftSwipeRoutes from './routes/leftswipe.js';
import recommendationsRoutes from './routes/recommendations.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Increase limit for base64 images

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/leftswipe', leftSwipeRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'GitMatch Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(` Signup: POST http://localhost:${PORT}/api/auth/signup`);
  console.log(` Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(` Get Profile: GET http://localhost:${PORT}/api/profile/me`);
  console.log(` Update Profile: PUT http://localhost:${PORT}/api/profile/me`);
  console.log(` Left Swipe: POST http://localhost:${PORT}/api/leftswipe`);
  console.log(` Recommendations: GET http://localhost:${PORT}/api/recommendations`);
  console.log(` Get Settings: GET http://localhost:${PORT}/api/settings/me`);
  console.log(` Update Settings: PUT http://localhost:${PORT}/api/settings/me`);
});
