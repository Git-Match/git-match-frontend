import React, { useState, useEffect } from 'react';
import {
  Heart,
  Clock,
  Bell,
  Compass,
  Shield,
  UserCog,
  AlertTriangle,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// --- Types ---
interface UserSettings {
  connection: { type: string; showOnProfile: boolean };
  snooze: { enabled: boolean; duration: string; allowExisting: boolean; hideDiscovery: boolean };
  notifications: {
    messages: boolean;
    matches: boolean;
    likes: boolean;
    suggestions: boolean;
    announcements: boolean;
    globalMute: boolean;
    quietHours: boolean;
  };
  discovery: {
    ageMin: number;
    ageMax: number;
    distance: number;
    verifiedOnly: boolean;
    recentlyActive: boolean;
  };
  privacy: { showOnline: boolean; showLastActive: boolean; visibility: string };
  safety: { screenshotProtection: boolean };
  preferences: { language: string; theme: string };
}

const defaultSettings: UserSettings = {
  connection: { type: 'open', showOnProfile: true },
  snooze: { enabled: false, duration: '24h', allowExisting: true, hideDiscovery: true },
  notifications: {
    messages: true,
    matches: true,
    likes: true,
    suggestions: true,
    announcements: false,
    globalMute: false,
    quietHours: false,
  },
  discovery: { ageMin: 18, ageMax: 35, distance: 15, verifiedOnly: false, recentlyActive: true },
  privacy: { showOnline: true, showLastActive: false, visibility: 'everyone' },
  safety: { screenshotProtection: true },
  preferences: { language: 'en', theme: 'dark' },
};

// --- Reusable UI Components ---
const Toggle = ({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  label: string;
  description?: string;
}) => (
  <div className="flex items-center justify-between py-3">
    <div className="pr-4">
      <p className="text-sm font-medium text-white">{label}</p>
      {description && <p className="mt-0.5 text-xs text-gray-400">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-purple-600' : 'bg-gray-700'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  </div>
);

const Section = ({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) => (
  <section
    id={id}
    className="mb-8 scroll-mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
  >
    <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
      <div className="rounded-xl bg-purple-500/20 p-2">
        <Icon size={20} className="text-purple-400" />
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
    </div>
    <div className="flex flex-col gap-4">{children}</div>
  </section>
);

// --- Main Page ---
const Settings: React.FC = () => {
  const { firebaseToken, isLoading } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const sidebarLinks = [
    { id: 'connection', label: 'Connection', icon: Heart },
    { id: 'snooze', label: 'Snooze Mode', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'discovery', label: 'Discovery', icon: Compass },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'account', label: 'Account', icon: UserCog },
    { id: 'safety', label: 'Safety', icon: AlertTriangle },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
  ];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // fetch user settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = firebaseToken; // Firebase token from AuthContext
        const response = await fetch('/api/settings/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        console.log(data);

        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };

    fetchSettings();
  }, []);

  const updateSetting = async <C extends keyof UserSettings, K extends keyof UserSettings[C]>(
    category: C,
    key: K,
    value: UserSettings[C][K]
  ) => {
    const previousSettings = { ...settings };

    setSettings((prev: UserSettings) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      } as UserSettings[C],
    }));

    setSaveStatus('Saving...');

    try {
      const token = firebaseToken;

      // API call
      const response = await fetch('/api/settings/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          [category]: { [key]: value }, // Only send the changed key/value
        }),
      });

      const data = await response.json();

      console.log(data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to update');
      }

      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('Failed to update setting', error);
      setSettings(previousSettings);
      setSaveStatus('Failed to save');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // if (isLoading) return <div>Loading...</div>;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0f] font-['Inter',sans-serif] text-gray-200">
      {/* Toast Notification */}
      {saveStatus && (
        <div className="fixed top-4 right-4 z-50 animate-pulse rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-md transition-all">
          {saveStatus}
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="hidden w-64 flex-col border-r border-white/10 bg-black/50 p-6 md:flex">
        <h1 className="mb-8 text-2xl font-bold tracking-wide text-white">Settings</h1>
        <nav className="custom-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto pr-2">
          {sidebarLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollToSection(link.id)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <link.icon size={18} />
              {link.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Scrollable Content */}
      <main className="custom-scrollbar flex-1 overflow-y-auto scroll-smooth p-4 md:p-8">
        <div className="mx-auto max-w-3xl pb-24">
          {/* 1. Connection Preferences */}
          <Section id="connection" title="Connection Preferences" icon={Heart}>
            <div className="mb-4 flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">Looking for</label>
              <select
                value={settings.connection.type}
                onChange={(e) => updateSetting('connection', 'type', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="serious">Serious relationship</option>
                <option value="casual">Casual dating</option>
                <option value="friendship">Friendship</option>
                <option value="open">Open to anything</option>
              </select>
            </div>
            <Toggle
              label="Show on profile"
              description="Let others know what you're looking for"
              checked={settings.connection.showOnProfile}
              onChange={(v) => updateSetting('connection', 'showOnProfile', v)}
            />
          </Section>

          {/* 2. Snooze Mode */}
          <Section id="snooze" title="Snooze Mode" icon={Clock}>
            <Toggle
              label="Enable Snooze Mode"
              description="Temporarily hide your profile from new people"
              checked={settings.snooze.enabled}
              onChange={(v) => updateSetting('snooze', 'enabled', v)}
            />
            {settings.snooze.enabled && (
              <div className="mt-4 flex flex-col gap-4 rounded-xl border border-white/5 bg-black/30 p-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Duration</label>
                  <select
                    value={settings.snooze.duration}
                    onChange={(e) => updateSetting('snooze', 'duration', e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="24h">24 hours</option>
                    <option value="72h">72 hours</option>
                    <option value="1w">1 week</option>
                    <option value="custom">Indefinitely</option>
                  </select>
                </div>
                <Toggle
                  label="Allow existing matches to message"
                  checked={settings.snooze.allowExisting}
                  onChange={(v) => updateSetting('snooze', 'allowExisting', v)}
                />
                <Toggle
                  label="Hide profile completely"
                  checked={settings.snooze.hideDiscovery}
                  onChange={(v) => updateSetting('snooze', 'hideDiscovery', v)}
                />
              </div>
            )}
          </Section>

          {/* 3. Notifications */}
          <Section id="notifications" title="Notifications" icon={Bell}>
            <Toggle
              label="Global Mute"
              description="Pause all push notifications"
              checked={settings.notifications.globalMute}
              onChange={(v) => updateSetting('notifications', 'globalMute', v)}
            />
            <div
              className={`transition-opacity ${settings.notifications.globalMute ? 'pointer-events-none opacity-50' : 'opacity-100'}`}
            >
              <Toggle
                label="New Messages"
                checked={settings.notifications.messages}
                onChange={(v) => updateSetting('notifications', 'messages', v)}
              />
              <Toggle
                label="New Matches"
                checked={settings.notifications.matches}
                onChange={(v) => updateSetting('notifications', 'matches', v)}
              />
              <Toggle
                label="Likes"
                checked={settings.notifications.likes}
                onChange={(v) => updateSetting('notifications', 'likes', v)}
              />
              <Toggle
                label="Quiet Hours (Do Not Disturb)"
                description="No notifications from 10 PM to 8 AM"
                checked={settings.notifications.quietHours}
                onChange={(v) => updateSetting('notifications', 'quietHours', v)}
              />
            </div>
          </Section>

          {/* 4. Discovery */}
          <Section id="discovery" title="Discovery Filters" icon={Compass}>
            <div className="mb-6">
              <div className="mb-2 flex justify-between">
                <label className="text-sm font-medium text-white">Maximum Distance</label>
                <span className="text-sm font-bold text-purple-400">
                  {settings.discovery.distance} km
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={settings.discovery.distance}
                onChange={(e) => updateSetting('discovery', 'distance', parseInt(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-purple-500"
              />
            </div>

            <div className="mb-6 flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-300">Min Age</label>
                <input
                  type="number"
                  min="18"
                  max={settings.discovery.ageMax}
                  value={settings.discovery.ageMin}
                  onChange={(e) => updateSetting('discovery', 'ageMin', parseInt(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-300">Max Age</label>
                <input
                  type="number"
                  min={settings.discovery.ageMin}
                  max="100"
                  value={settings.discovery.ageMax}
                  onChange={(e) => updateSetting('discovery', 'ageMax', parseInt(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white"
                />
              </div>
            </div>

            <Toggle
              label="Verified profiles only"
              checked={settings.discovery.verifiedOnly}
              onChange={(v) => updateSetting('discovery', 'verifiedOnly', v)}
            />
            <Toggle
              label="Recently active users"
              checked={settings.discovery.recentlyActive}
              onChange={(v) => updateSetting('discovery', 'recentlyActive', v)}
            />
          </Section>

          {/* 5. Privacy & Visibility */}
          <Section id="privacy" title="Privacy & Visibility" icon={Shield}>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-300">Profile Visibility</label>
              <select
                value={settings.privacy.visibility}
                onChange={(e) => updateSetting('privacy', 'visibility', e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white focus:border-purple-500"
              >
                <option value="everyone">Everyone</option>
                <option value="matches">Matches Only</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
            <Toggle
              label="Show Online Status"
              checked={settings.privacy.showOnline}
              onChange={(v) => updateSetting('privacy', 'showOnline', v)}
            />
            <Toggle
              label="Show Last Active"
              checked={settings.privacy.showLastActive}
              onChange={(v) => updateSetting('privacy', 'showLastActive', v)}
            />
          </Section>

          {/* 6. Account Controls */}
          <Section id="account" title="Account" icon={UserCog}>
            <div className="flex flex-col gap-3">
              <button className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 text-left transition-colors hover:bg-white/10">
                <span className="text-sm font-medium text-white">Change Password</span>
                <ChevronRight size={16} className="text-gray-400" />
              </button>
              <button className="flex w-full items-center justify-between rounded-xl border border-orange-500/20 bg-orange-500/10 p-4 text-left text-orange-400 transition-colors hover:bg-orange-500/20">
                <span className="text-sm font-medium">Deactivate Account (Temporary)</span>
              </button>
              <button className="flex w-full items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-left text-red-400 transition-colors hover:bg-red-500/20">
                <span className="text-sm font-medium">Delete Account (Permanent)</span>
              </button>
            </div>
          </Section>

          {/* 7. Safety */}
          <Section id="safety" title="Safety" icon={AlertTriangle}>
            <Toggle
              label="Screenshot Protection"
              description="Prevent users from screenshotting your photos (Android only)"
              checked={settings.safety.screenshotProtection}
              onChange={(v) => updateSetting('safety', 'screenshotProtection', v)}
            />
            <div className="mt-4 flex flex-col gap-3">
              <button className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 text-left transition-colors hover:bg-white/10">
                <span className="text-sm font-medium text-white">Manage Blocked Users</span>
                <ChevronRight size={16} className="text-gray-400" />
              </button>
            </div>
          </Section>

          {/* 8. App Preferences */}
          <Section id="preferences" title="App Preferences" icon={SettingsIcon}>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Language</label>
                <select
                  value={settings.preferences.language}
                  onChange={(e) => updateSetting('preferences', 'language', e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white focus:border-purple-500"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Theme</label>
                <div className="mt-2 flex gap-3">
                  {['light', 'dark', 'system'].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => updateSetting('preferences', 'theme', theme)}
                      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                        settings.preferences.theme === theme
                          ? 'border-purple-500 bg-purple-600/30 text-purple-200'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Log Out Button */}
          <div className="mt-12">
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-gray-300 transition-colors hover:bg-white/10 hover:text-white">
              <LogOut size={20} />
              <span className="font-bold">Log Out</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
