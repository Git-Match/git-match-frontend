import { Router, Request, Response, NextFunction } from "express";
import admin from "../firebase/admin.js";

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    [key: string]: any;
  };
}

// Core settings data model
export type ConnectionType =
  | "serious_relationship"
  | "casual_dating"
  | "friendship"
  | "open_to_anything";

export interface ConnectionPreferencesSettings {
  connectionType: ConnectionType | null;
  showOnProfile: boolean;
}

export type SnoozeDuration = "24h" | "72h" | "1w" | "custom";

export interface SnoozeModeSettings {
  enabled: boolean;
  duration: SnoozeDuration;
  customEndDate?: string | null; // ISO date when duration === "custom"
  allowExistingMatchesToMessage: boolean;
  hideFromDiscovery: boolean;
}

export interface QuietHoursSettings {
  enabled: boolean;
  start: string; // e.g. "22:00" (24h)
  end: string;   // e.g. "07:00"
}

export interface NotificationSettings {
  newMessages: boolean;
  newMatches: boolean;
  likes: boolean;
  matchSuggestions: boolean;
  appAnnouncements: boolean;
  globalMute: boolean;
  quietHours: QuietHoursSettings;
}

export interface DiscoveryFiltersSettings {
  ageMin: number | null;
  ageMax: number | null;
  distanceKm: number | null;
  verifiedOnly: boolean;
  recentlyActiveOnly: boolean;
}

export type ProfileVisibility = "everyone" | "matches_only";

export interface PrivacySettings {
  showOnlineStatus: boolean;
  showLastActive: boolean;
  profileVisibility: ProfileVisibility;
}

export interface AccountControlsSettings {
  deactivateAccount: boolean; // soft-deactivation flag
  deleteAccountRequested: boolean; // used to trigger deletion flow
}

export interface SafetySettings {
  blockedUserIds: string[];
  screenshotProtection: boolean;
}

export type ThemePreference = "light" | "dark" | "system";

export interface PreferencesSettings {
  language: string; // e.g. "en", "de"
  theme: ThemePreference;
}

export interface UserSettings {
  connectionPreferences: ConnectionPreferencesSettings;
  snoozeMode: SnoozeModeSettings;
  notifications: NotificationSettings;
  discoveryFilters: DiscoveryFiltersSettings;
  privacy: PrivacySettings;
  accountControls: AccountControlsSettings;
  safety: SafetySettings;
  preferences: PreferencesSettings;
  createdAt: string;
  updatedAt: string;
}

// Middleware to verify Firebase ID token or Session cookie
const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = (req.headers.authorization || "") as string;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    (req as AuthenticatedRequest).user = decodedToken as any;
    return next();
  } catch (error: any) {
    console.error("ID token verification failed:", error.message);

    try {
      const decodedToken = await admin
        .auth()
        .verifySessionCookie(token, true)
        .catch(() => {
          throw new Error("Not a session cookie");
        });
      (req as AuthenticatedRequest).user = decodedToken as any;
      return next();
    } catch (customError: any) {
      console.error(
        "Session cookie verification also failed:",
        customError.message
      );
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
    }
  }
};

const defaultSettings = (): UserSettings => {
  const now = new Date().toISOString();
  return {
    connectionPreferences: {
      connectionType: null,
      showOnProfile: true,
    },
    snoozeMode: {
      enabled: false,
      duration: "24h",
      customEndDate: null,
      allowExistingMatchesToMessage: true,
      hideFromDiscovery: true,
    },
    notifications: {
      newMessages: true,
      newMatches: true,
      likes: true,
      matchSuggestions: true,
      appAnnouncements: true,
      globalMute: false,
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "07:00",
      },
    },
    discoveryFilters: {
      ageMin: null,
      ageMax: null,
      distanceKm: null,
      verifiedOnly: false,
      recentlyActiveOnly: false,
    },
    privacy: {
      showOnlineStatus: true,
      showLastActive: true,
      profileVisibility: "everyone",
    },
    accountControls: {
      deactivateAccount: false,
      deleteAccountRequested: false,
    },
    safety: {
      blockedUserIds: [],
      screenshotProtection: false,
    },
    preferences: {
      language: "en",
      theme: "system",
    },
    createdAt: now,
    updatedAt: now,
  };
};

// Deep merge helper for nested settings objects
const isPlainObject = (value: any): value is Record<string, any> => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
};

const deepMerge = <T>(target: T, source: Partial<T>): T => {
  const result: any = Array.isArray(target)
    ? [...(target as any)]
    : { ...(target as any) };

  Object.keys(source as any).forEach((key) => {
    const srcVal = (source as any)[key];
    const tgtVal = (result as any)[key];

    if (srcVal === undefined) {
      return;
    }

    if (Array.isArray(srcVal)) {
      (result as any)[key] = srcVal;
    } else if (isPlainObject(srcVal) && isPlainObject(tgtVal)) {
      (result as any)[key] = deepMerge(tgtVal, srcVal);
    } else {
      (result as any)[key] = srcVal;
    }
  });

  return result as T;
};

const router = Router();

// GET /api/settings/me - fetch current user's settings
router.get("/me", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.uid;

    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const data = userDoc.data() as { settings?: Partial<UserSettings> } | undefined;
    const existing = data?.settings;

    const base = defaultSettings();
    const merged = existing ? deepMerge(base, existing) : base;

    return res.json({
      success: true,
      message: "Settings retrieved successfully",
      settings: merged,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve settings",
    });
  }
});

// PUT /api/settings/me - update current user's settings
router.put("/me", verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.uid;
    const update = (req.body || {}) as Partial<UserSettings>;

    const userDocRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const data = userDoc.data() as { settings?: UserSettings } | undefined;
    const currentSettings = data?.settings ?? defaultSettings();

    const merged: UserSettings = {
      ...deepMerge(currentSettings, update),
      updatedAt: new Date().toISOString(),
      createdAt: currentSettings.createdAt,
    };

    await userDocRef.set(
      {
        settings: merged,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return res.json({
      success: true,
      message: "Settings updated successfully",
      settings: merged,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update settings",
    });
  }
});

export default router;
