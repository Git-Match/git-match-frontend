import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  ChevronRight,
  Clock,
  Compass,
  Heart,
  LogOut,
  Settings as SettingsIcon,
  Shield,
  UserCog,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';

type ConnectionType =
  | 'serious_relationship'
  | 'casual_dating'
  | 'friendship'
  | 'open_to_anything'
  | null;
type SnoozeDuration = '24h' | '72h' | '1w' | 'custom';
type ProfileVisibility = 'everyone' | 'matches_only';
type ThemePreference = 'light' | 'dark' | 'system';

interface UserSettings {
  connectionPreferences: {
    connectionType: ConnectionType;
    showOnProfile: boolean;
  };
  snoozeMode: {
    enabled: boolean;
    duration: SnoozeDuration;
    customEndDate: string | null;
    allowExistingMatchesToMessage: boolean;
    hideFromDiscovery: boolean;
  };
  notifications: {
    newMessages: boolean;
    newMatches: boolean;
    likes: boolean;
    matchSuggestions: boolean;
    appAnnouncements: boolean;
    globalMute: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  discoveryFilters: {
    ageMin: number | null;
    ageMax: number | null;
    distanceKm: number | null;
    verifiedOnly: boolean;
    recentlyActiveOnly: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    showLastActive: boolean;
    profileVisibility: ProfileVisibility;
  };
  accountControls: {
    deactivateAccount: boolean;
    deleteAccountRequested: boolean;
  };
  safety: {
    blockedUserIds: string[];
    screenshotProtection: boolean;
  };
  preferences: {
    language: string;
    theme: ThemePreference;
  };
  createdAt: string;
  updatedAt: string;
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

const SETTINGS_API_URL = `${import.meta.env.VITE_API_BASE_URL ?? 'https://git-match-backend.onrender.com'}/api/settings/me`;

const defaultSettings: UserSettings = {
  connectionPreferences: {
    connectionType: 'open_to_anything',
    showOnProfile: true,
  },
  snoozeMode: {
    enabled: false,
    duration: '24h',
    customEndDate: null,
    allowExistingMatchesToMessage: true,
    hideFromDiscovery: true,
  },
  notifications: {
    newMessages: true,
    newMatches: true,
    likes: true,
    matchSuggestions: true,
    appAnnouncements: false,
    globalMute: false,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00',
    },
  },
  discoveryFilters: {
    ageMin: 18,
    ageMax: 35,
    distanceKm: 15,
    verifiedOnly: false,
    recentlyActiveOnly: true,
  },
  privacy: {
    showOnlineStatus: true,
    showLastActive: false,
    profileVisibility: 'everyone',
  },
  accountControls: {
    deactivateAccount: false,
    deleteAccountRequested: false,
  },
  safety: {
    blockedUserIds: [],
    screenshotProtection: true,
  },
  preferences: {
    language: 'en',
    theme: 'dark',
  },
  createdAt: '',
  updatedAt: '',
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const deepMerge = <T extends object>(target: T, patch: DeepPartial<T>): T => {
  const merged = { ...target };

  for (const [key, value] of Object.entries(patch as object)) {
    if (value === undefined) {
      continue;
    }

    const typedKey = key as keyof T;
    const currentValue = merged[typedKey];

    if (isPlainObject(currentValue) && isPlainObject(value)) {
      merged[typedKey] = deepMerge(
        currentValue as Record<string, unknown>,
        value as DeepPartial<Record<string, unknown>>
      ) as T[keyof T];
      continue;
    }

    merged[typedKey] = (Array.isArray(value) ? [...value] : value) as T[keyof T];
  }

  return merged;
};

const normalizeSettings = (incoming?: DeepPartial<UserSettings> | null): UserSettings =>
  deepMerge(defaultSettings, incoming ?? {});

const parseNullableNumber = (value: string): number | null => {
  if (value.trim() === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toDateTimeLocalValue = (isoDate: string | null): string => {
  if (!isoDate) {
    return '';
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

const formatUpdatedAt = (updatedAt: string): string | null => {
  if (!updatedAt) {
    return null;
  }

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const resolveSettingsAuthToken = async (fallbackToken: string | null) => {
  if (auth.currentUser) {
    return auth.currentUser.getIdToken();
  }

  return fallbackToken;
};

const Toggle = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-between py-3">
    <div className="pr-4">
      <p className="text-sm font-medium text-white">{label}</p>
      {description && <p className="mt-0.5 text-xs text-gray-400">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-purple-600' : 'bg-gray-700'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
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

const Settings: React.FC = () => {
  const { firebaseToken, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchSettings = async () => {
      if (authLoading) {
        return;
      }

      setSettingsLoading(true);
      setLoadError(null);

      try {
        const token = await resolveSettingsAuthToken(firebaseToken);

        if (!token) {
          throw new Error('No token provided');
        }

        const response = await fetch(SETTINGS_API_URL, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.message || 'Failed to retrieve settings');
        }

        setSettings(normalizeSettings(data.settings));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to retrieve settings';
        setLoadError(message);
      } finally {
        setSettingsLoading(false);
      }
    };

    void fetchSettings();
  }, [authLoading, firebaseToken]);

  const updateSettings = async (patch: DeepPartial<UserSettings>) => {
    const previousSettings = settings;
    const nextSettings = deepMerge(previousSettings, patch);

    setSettings(nextSettings);
    setSaveStatus('Saving...');

    try {
      const token = await resolveSettingsAuthToken(firebaseToken);

      if (!token) {
        throw new Error('No token provided');
      }

      const response = await fetch(SETTINGS_API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to update settings');
      }

      setSettings(normalizeSettings(data.settings));
      setSaveStatus('Saved');
      window.setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update settings';
      setSettings(previousSettings);
      setSaveStatus(message);
      window.setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  if (authLoading || settingsLoading) {
    return <div>Loading...</div>;
  }

  const updatedAtLabel = formatUpdatedAt(settings.updatedAt);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0f] font-['Inter',sans-serif] text-gray-200">
      {saveStatus && (
        <div className="fixed top-4 right-4 z-50 animate-pulse rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-md transition-all">
          {saveStatus}
        </div>
      )}

      <aside className="hidden w-64 flex-col border-r border-white/10 bg-black/50 p-6 md:flex">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mb-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
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

      <main className="custom-scrollbar flex-1 overflow-y-auto scroll-smooth p-4 md:p-8">
        <div className="mx-auto max-w-3xl pb-24">
          <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Your account settings</h2>
                <p className="text-sm text-gray-400">
                  These preferences are synced with your profile on the backend.
                </p>
              </div>
              {updatedAtLabel && (
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
                  Updated {updatedAtLabel}
                </p>
              )}
            </div>

            {loadError && (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {loadError}
              </div>
            )}
          </div>

          <Section id="connection" title="Connection Preferences" icon={Heart}>
            <div className="mb-4 flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">Looking for</label>
              <select
                value={settings.connectionPreferences.connectionType ?? ''}
                onChange={(e) =>
                  void updateSettings({
                    connectionPreferences: {
                      connectionType:
                        (e.target.value || null) as UserSettings['connectionPreferences']['connectionType'],
                    },
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">Prefer not to say</option>
                <option value="serious_relationship">Serious relationship</option>
                <option value="casual_dating">Casual dating</option>
                <option value="friendship">Friendship</option>
                <option value="open_to_anything">Open to anything</option>
              </select>
            </div>
            <Toggle
              label="Show on profile"
              description="Let others know what you're looking for"
              checked={settings.connectionPreferences.showOnProfile}
              onChange={(value) =>
                void updateSettings({
                  connectionPreferences: { showOnProfile: value },
                })
              }
            />
          </Section>

          <Section id="snooze" title="Snooze Mode" icon={Clock}>
            <Toggle
              label="Enable Snooze Mode"
              description="Temporarily hide your profile from new people"
              checked={settings.snoozeMode.enabled}
              onChange={(value) =>
                void updateSettings({
                  snoozeMode: { enabled: value },
                })
              }
            />
            {settings.snoozeMode.enabled && (
              <div className="mt-4 flex flex-col gap-4 rounded-xl border border-white/5 bg-black/30 p-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Duration</label>
                  <select
                    value={settings.snoozeMode.duration}
                    onChange={(e) =>
                      void updateSettings({
                        snoozeMode: {
                          duration: e.target.value as SnoozeDuration,
                          customEndDate:
                            e.target.value === 'custom'
                              ? settings.snoozeMode.customEndDate
                              : null,
                        },
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="24h">24 hours</option>
                    <option value="72h">72 hours</option>
                    <option value="1w">1 week</option>
                    <option value="custom">Custom end time</option>
                  </select>
                </div>

                {settings.snoozeMode.duration === 'custom' && (
                  <div>
                    <label className="text-sm font-medium text-gray-300">Custom end date</label>
                    <input
                      type="datetime-local"
                      value={toDateTimeLocalValue(settings.snoozeMode.customEndDate)}
                      onChange={(e) =>
                        void updateSettings({
                          snoozeMode: {
                            customEndDate: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          },
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                )}

                <Toggle
                  label="Allow existing matches to message"
                  checked={settings.snoozeMode.allowExistingMatchesToMessage}
                  onChange={(value) =>
                    void updateSettings({
                      snoozeMode: {
                        allowExistingMatchesToMessage: value,
                      },
                    })
                  }
                />
                <Toggle
                  label="Hide from discovery"
                  checked={settings.snoozeMode.hideFromDiscovery}
                  onChange={(value) =>
                    void updateSettings({
                      snoozeMode: { hideFromDiscovery: value },
                    })
                  }
                />
              </div>
            )}
          </Section>

          <Section id="notifications" title="Notifications" icon={Bell}>
            <Toggle
              label="Global Mute"
              description="Pause all push notifications"
              checked={settings.notifications.globalMute}
              onChange={(value) =>
                void updateSettings({
                  notifications: { globalMute: value },
                })
              }
            />
            <div
              className={`transition-opacity ${
                settings.notifications.globalMute ? 'pointer-events-none opacity-50' : 'opacity-100'
              }`}
            >
              <Toggle
                label="New Messages"
                checked={settings.notifications.newMessages}
                onChange={(value) =>
                  void updateSettings({
                    notifications: { newMessages: value },
                  })
                }
              />
              <Toggle
                label="New Matches"
                checked={settings.notifications.newMatches}
                onChange={(value) =>
                  void updateSettings({
                    notifications: { newMatches: value },
                  })
                }
              />
              <Toggle
                label="Likes"
                checked={settings.notifications.likes}
                onChange={(value) =>
                  void updateSettings({
                    notifications: { likes: value },
                  })
                }
              />
              <Toggle
                label="Match Suggestions"
                checked={settings.notifications.matchSuggestions}
                onChange={(value) =>
                  void updateSettings({
                    notifications: { matchSuggestions: value },
                  })
                }
              />
              <Toggle
                label="App Announcements"
                checked={settings.notifications.appAnnouncements}
                onChange={(value) =>
                  void updateSettings({
                    notifications: { appAnnouncements: value },
                  })
                }
              />
              <Toggle
                label="Quiet Hours"
                description="Mute notifications during specific hours"
                checked={settings.notifications.quietHours.enabled}
                onChange={(value) =>
                  void updateSettings({
                    notifications: {
                      quietHours: { enabled: value },
                    },
                  })
                }
              />
              {settings.notifications.quietHours.enabled && (
                <div className="mt-2 grid gap-4 rounded-xl border border-white/5 bg-black/30 p-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Start time</label>
                    <input
                      type="time"
                      value={settings.notifications.quietHours.start}
                      onChange={(e) =>
                        void updateSettings({
                          notifications: {
                            quietHours: { start: e.target.value },
                          },
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300">End time</label>
                    <input
                      type="time"
                      value={settings.notifications.quietHours.end}
                      onChange={(e) =>
                        void updateSettings({
                          notifications: {
                            quietHours: { end: e.target.value },
                          },
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section id="discovery" title="Discovery Filters" icon={Compass}>
            <div className="mb-6">
              <div className="mb-2 flex justify-between">
                <label className="text-sm font-medium text-white">Maximum Distance</label>
                <span className="text-sm font-bold text-purple-400">
                  {settings.discoveryFilters.distanceKm === null
                    ? 'Any distance'
                    : `${settings.discoveryFilters.distanceKm} km`}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={settings.discoveryFilters.distanceKm ?? 100}
                onChange={(e) =>
                  void updateSettings({
                    discoveryFilters: { distanceKm: Number(e.target.value) },
                  })
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-purple-500"
              />
              <button
                type="button"
                onClick={() =>
                  void updateSettings({
                    discoveryFilters: { distanceKm: null },
                  })
                }
                className="mt-3 text-sm font-medium text-purple-300 transition-colors hover:text-purple-200"
              >
                Remove distance limit
              </button>
            </div>

            <div className="mb-6 flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-300">Min Age</label>
                <input
                  type="number"
                  min="18"
                  max={settings.discoveryFilters.ageMax ?? 100}
                  value={settings.discoveryFilters.ageMin ?? ''}
                  placeholder="Any"
                  onChange={(e) =>
                    void updateSettings({
                      discoveryFilters: {
                        ageMin: parseNullableNumber(e.target.value),
                      },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-300">Max Age</label>
                <input
                  type="number"
                  min={settings.discoveryFilters.ageMin ?? 18}
                  max="100"
                  value={settings.discoveryFilters.ageMax ?? ''}
                  placeholder="Any"
                  onChange={(e) =>
                    void updateSettings({
                      discoveryFilters: {
                        ageMax: parseNullableNumber(e.target.value),
                      },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white"
                />
              </div>
            </div>

            <Toggle
              label="Verified profiles only"
              checked={settings.discoveryFilters.verifiedOnly}
              onChange={(value) =>
                void updateSettings({
                  discoveryFilters: { verifiedOnly: value },
                })
              }
            />
            <Toggle
              label="Recently active users"
              checked={settings.discoveryFilters.recentlyActiveOnly}
              onChange={(value) =>
                void updateSettings({
                  discoveryFilters: { recentlyActiveOnly: value },
                })
              }
            />
          </Section>

          <Section id="privacy" title="Privacy & Visibility" icon={Shield}>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-300">Profile Visibility</label>
              <select
                value={settings.privacy.profileVisibility}
                onChange={(e) =>
                  void updateSettings({
                    privacy: {
                      profileVisibility: e.target.value as ProfileVisibility,
                    },
                  })
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="everyone">Everyone</option>
                <option value="matches_only">Matches only</option>
              </select>
            </div>
            <Toggle
              label="Show Online Status"
              checked={settings.privacy.showOnlineStatus}
              onChange={(value) =>
                void updateSettings({
                  privacy: { showOnlineStatus: value },
                })
              }
            />
            <Toggle
              label="Show Last Active"
              checked={settings.privacy.showLastActive}
              onChange={(value) =>
                void updateSettings({
                  privacy: { showLastActive: value },
                })
              }
            />
          </Section>

          <Section id="account" title="Account" icon={UserCog}>
            <Toggle
              label="Deactivate Account"
              description="Temporarily disable your account while keeping your data."
              checked={settings.accountControls.deactivateAccount}
              onChange={(value) =>
                void updateSettings({
                  accountControls: { deactivateAccount: value },
                })
              }
            />
            <Toggle
              label="Request Account Deletion"
              description="Marks your account for the backend delete flow."
              checked={settings.accountControls.deleteAccountRequested}
              onChange={(value) =>
                void updateSettings({
                  accountControls: { deleteAccountRequested: value },
                })
              }
            />
            <button className="mt-2 flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 text-left transition-colors hover:bg-white/10">
              <span className="text-sm font-medium text-white">Change Password</span>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </Section>

          <Section id="safety" title="Safety" icon={AlertTriangle}>
            <Toggle
              label="Screenshot Protection"
              description="Prevent users from screenshotting your photos (Android only)"
              checked={settings.safety.screenshotProtection}
              onChange={(value) =>
                void updateSettings({
                  safety: { screenshotProtection: value },
                })
              }
            />
            <div className="mt-4 rounded-xl border border-white/5 bg-white/5 p-4">
              <p className="text-sm font-medium text-white">Blocked users</p>
              <p className="mt-1 text-sm text-gray-400">
                {settings.safety.blockedUserIds.length} account
                {settings.safety.blockedUserIds.length === 1 ? '' : 's'} currently blocked.
              </p>
            </div>
          </Section>

          <Section id="preferences" title="App Preferences" icon={SettingsIcon}>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Language</label>
                <select
                  value={settings.preferences.language}
                  onChange={(e) =>
                    void updateSettings({
                      preferences: { language: e.target.value },
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white focus:border-purple-500"
                >
                  <option value="en">English</option>
                  <option value="es">Espanol</option>
                  <option value="fr">Francais</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Theme</label>
                <div className="mt-2 flex gap-3">
                  {(['light', 'dark', 'system'] as ThemePreference[]).map((theme) => (
                    <button
                      key={theme}
                      onClick={() =>
                        void updateSettings({
                          preferences: { theme },
                        })
                      }
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

          <div className="mt-12">
            <button
              onClick={() => void logout()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >
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
