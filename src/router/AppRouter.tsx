import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Import page components
import LandingPage from '../pages/Landing';
import Login from '../pages/Login';
import Onboarding from '../pages/Onboarding';
import Dashboard from '../pages/Dashboard';
import Profile from '../pages/Profile';
import Gallery from '../pages/Gallery';
import Settings from '../pages/Settings';
import { AppRouteFallback, ProtectedRoute, PublicOnlyRoute } from './RouteGuards';
// import Features from '../pages/Features';
// import About from '../pages/About';
// import Contact from '../pages/Contact';
// import Matches from '../pages/Matches';
// import Chat from '../pages/Chat';
// import AuthCallback from '../pages/AuthCallback';

const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        {/* Landing page is the default route */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute requireIncompleteProfile />}>
        <Route path="/onboarding" element={<Onboarding />} />
      </Route>

      <Route element={<ProtectedRoute requireCompleteProfile />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Homepage navbar elements */}
      {/* <Route path="/features" element={<Features />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} /> */}

      {/* Other routes from your structure */}
      {/* <Route path="/auth/callback" element={<AuthCallback />} /> */}
      {/* <Route path="/matches" element={<Matches />} /> */}
      {/* <Route path="/chat" element={<Chat />} /> */}

      {/* Add a fallback/404 route */}
      <Route path="*" element={<AppRouteFallback />} />
    </Routes>
  );
};

export default AppRouter;
