# GitMatch Backend API Endpoints

Base URL (local): `http://localhost:3000`

## Auth

### POST `/api/auth/signup`
Creates a new user in Firebase Auth and stores a minimal profile document in Firestore.

- **Auth**: none
- **Body (JSON)**
  - `fullName` (string, required)
  - `email` (string, required)
  - `githubProfileUrl` (string, required)
  - `password` (string, required)

- **Success (201)**
  - `success` (boolean)
  - `message` (string)
  - `user` (object) minimal `UserProfile` stored in Firestore:
    - `uid`, `fullName`, `email`, `githubProfileUrl`, `role`, `aboutMe`, `createdAt`, `updatedAt`
    - plus defaulted nullable fields: `city`, `country`, `location`, `gender`, `interest`, `goal`
  - `token` (string) — Firebase **ID token** if `FIREBASE_API_KEY` is set and exchange succeeds; otherwise a Firebase **custom token**
  - when ID-token exchange succeeds, response may also include:
    - `refreshToken` (string)
    - `expiresIn` (string, seconds)

- **Errors**
  - **400** `{ success: false, message: string }` (missing fields, firebase auth errors like email exists/weak password)

---

### POST `/api/auth/login`
Logs in using Firebase Identity Toolkit (email/password) and returns the user profile from Firestore.

- **Auth**: none
- **Body (JSON)**
  - `email` (string, required)
  - `password` (string, required)

- **Success (200)**
  - `success` (boolean)
  - `message` (string)
  - `user` (object) `UserProfile` from Firestore
  - `token` (string) Firebase ID token
  - may also include: `refreshToken`, `expiresIn`

- **Errors**
  - **400** `{ success: false, message: "Email and password are required" }`
  - **401** `{ success: false, message: "Invalid email or password" | "User not found" | "Login failed" }`
  - **404** `{ success: false, message: "User profile not found" }`
  - **500** `{ success: false, message: "Server configuration error: FIREBASE_API_KEY not set" }`

---

### POST `/api/auth/token-info`
Debug helper: decodes JWT payload **without verification** (useful for inspecting token fields).

- **Auth**: none
- **Input**
  - Either provide header `Authorization: Bearer <token>`
  - Or body field `token`

- **Success (200)**
  - `success: true`
  - `payload` (object) decoded JWT payload

- **Errors**
  - **400** `{ success: false, message: "No token provided" | "Invalid JWT format" | "Failed to decode token", error?: string }`

## Profile

All authenticated profile endpoints require:
- Header: `Authorization: Bearer <Firebase ID token>`
  - The backend also attempts to treat the token as a Firebase session cookie if ID token verification fails.

### GET `/api/profile/me`
Returns the authenticated user’s profile from Firestore (`users/{uid}`).

- **Auth**: required
- **Success (200)**
  - `success` (boolean)
  - `message` (string)
  - `profile` (object) `UserProfile`

- **Errors**
  - **401** `{ success: false, message: "No token provided" | "Invalid or expired token" }`
  - **404** `{ success: false, message: "Profile not found" }`
  - **500** `{ success: false, message: "Failed to retrieve profile" }`

---

### PUT `/api/profile/me`
Updates the authenticated user’s profile in Firestore.

- **Auth**: required
- **Body (JSON)**: accepts `UpdateProfileRequest` fields (all optional), including:
  - `fullName`, `role`, `aboutMe`, `githubProfileUrl`
  - `dateOfBirth` (string) — if provided and `age` not provided, backend calculates and stores `age`
  - `age` (number)
  - `location` (string | null)
  - `city` (string | null), `country` (string | null)
    - If either is present, backend rebuilds `location` from them (or clears it if both are null)
  - `gender` (string | null)
  - `interest` (string | null)
  - `goal` (string | null)
  - `profileImage` (string) — base64 image; backend uploads to Firebase Storage and stores `profileImage` URL

- **Success (200)**
  - `success` (boolean)
  - `message` (string)
  - `profile` (object) updated `UserProfile`

- **Errors**
  - **401** `{ success: false, message: "No token provided" | "Invalid or expired token" }`
  - **404** `{ success: false, message: "Profile not found" }`
  - **400** `{ success: false, message: "Failed to upload profile image" }`
  - **500** `{ success: false, message: "Failed to update profile" }`

---

### GET `/api/profile/:userId`
Public endpoint to fetch a user profile by id.

- **Auth**: none
- **Path params**
  - `userId` (string, required)

- **Success (200)**
  - `success` (boolean)
  - `message` (string)
  - `profile` (object) `UserProfile` with `email` removed if present

- **Errors**
  - **400** `{ success: false, message: "userId is required" }`
  - **404** `{ success: false, message: "Profile not found" }`
  - **500** `{ success: false, message: "Failed to retrieve profile" }`

## Swipes

### POST `/api/leftswipe`
Records a left swipe by adding a target user id into the authenticated user’s `leftswiped` array field on `users/{uid}`.

- **Auth**: required (`Authorization: Bearer <Firebase ID token>`; session-cookie fallback)
- **Body (JSON)**
  - `targetUserId` (string, required)

- **Success (200)**
  - `{ success: true, message: "Left swipe recorded successfully" }`

- **Errors**
  - **400** `{ success: false, message: "targetUserId is required" | "Cannot left-swipe yourself" }`
  - **401** `{ success: false, message: "No token provided" | "Invalid or expired token" }`
  - **404** `{ success: false, message: "User profile not found" }`
  - **500** `{ success: false, message: "Failed to record left swipe" }`

## Recommendations

### GET `/api/recommendations`
Returns a ranked list of recommended users for swipe cards. Excludes users already present in the caller’s `leftswiped` list.

- **Auth**: required (`Authorization: Bearer <Firebase ID token>`; session-cookie fallback)
- **Query**
  - `limit` (number, optional; default `20`; min `1`; max `50`)

- **Success (200)**
  - `success` (boolean)
  - `message` (string)
  - `count` (number)
  - `users` (array) of "card-ready" profiles (email never included):
    - `uid`
    - `fullName?`, `age?`, `role?`
    - `location?`, `city?`, `country?`
    - `aboutMe?`, `profileImage?`, `githubProfileUrl?`
    - `interests?` (string[])
    - `goal?`

- **Errors**
  - **401** `{ success: false, message: "No token provided" | "Invalid or expired token" }`
  - **404** `{ success: false, message: "User profile not found" }`
  - **500** `{ success: false, message: "Failed to retrieve recommendations" }`

## Settings

User settings are stored under the `settings` field of the user document in `users/{uid}`. If no settings exist yet, the backend returns sensible defaults.

All settings endpoints require:
- Header: `Authorization: Bearer <Firebase ID token>` (session-cookie fallback is also attempted).

### GET `/api/settings/me`
Fetch the authenticated user's settings.

- **Auth**: required
- **Success (200)**
  - `success` (boolean)
  - `message` (string)
  - `settings` (object) with shape:
    - `connectionPreferences` (object)
      - `connectionType` (string | null) — one of:
        - `"serious_relationship"`
        - `"casual_dating"`
        - `"friendship"`
        - `"open_to_anything"`
      - `showOnProfile` (boolean)
    - `snoozeMode` (object)
      - `enabled` (boolean)
      - `duration` (string) — one of `"24h"`, `"72h"`, `"1w"`, `"custom"`
      - `customEndDate` (string | null, ISO) — only used when `duration === "custom"`
      - `allowExistingMatchesToMessage` (boolean)
      - `hideFromDiscovery` (boolean)
    - `notifications` (object)
      - `newMessages` (boolean)
      - `newMatches` (boolean)
      - `likes` (boolean)
      - `matchSuggestions` (boolean)
      - `appAnnouncements` (boolean)
      - `globalMute` (boolean)
      - `quietHours` (object)
        - `enabled` (boolean)
        - `start` (string, e.g. `"22:00"`)
        - `end` (string, e.g. `"07:00"`)
    - `discoveryFilters` (object)
      - `ageMin` (number | null)
      - `ageMax` (number | null)
      - `distanceKm` (number | null)
      - `verifiedOnly` (boolean)
      - `recentlyActiveOnly` (boolean)
    - `privacy` (object)
      - `showOnlineStatus` (boolean)
      - `showLastActive` (boolean)
      - `profileVisibility` (string) — `"everyone"` or `"matches_only"`
    - `accountControls` (object)
      - `deactivateAccount` (boolean) — flag for temporary deactivation
      - `deleteAccountRequested` (boolean) — flag that a delete flow should run
    - `safety` (object)
      - `blockedUserIds` (string[])
      - `screenshotProtection` (boolean)
    - `preferences` (object)
      - `language` (string, e.g. `"en"`)
      - `theme` (string) — `"light" | "dark" | "system"`
    - `createdAt` (string, ISO)
    - `updatedAt` (string, ISO)

- **Errors**
  - **401** `{ success: false, message: "No token provided" | "Invalid or expired token" }`
  - **404** `{ success: false, message: "User not found" }`
  - **500** `{ success: false, message: "Failed to retrieve settings" }`

---

### PUT `/api/settings/me`
Partially update the authenticated user's settings. The backend deep-merges the payload into the existing settings object and updates timestamps.

- **Auth**: required
- **Body (JSON)**: any subset of the `settings` shape from **GET** above. Examples:

```json
{
  "connectionPreferences": {
    "connectionType": "serious_relationship",
    "showOnProfile": true
  },
  "snoozeMode": {
    "enabled": true,
    "duration": "72h",
    "allowExistingMatchesToMessage": true,
    "hideFromDiscovery": true
  }
}
```

```json
{
  "notifications": {
    "globalMute": false,
    "newMessages": true,
    "newMatches": true,
    "likes": true,
    "matchSuggestions": true,
    "appAnnouncements": false,
    "quietHours": {
      "enabled": true,
      "start": "21:00",
      "end": "07:30"
    }
  },
  "discoveryFilters": {
    "ageMin": 18,
    "ageMax": 25,
    "distanceKm": 15,
    "verifiedOnly": true,
    "recentlyActiveOnly": true
  },
  "privacy": {
    "showOnlineStatus": false,
    "showLastActive": false,
    "profileVisibility": "matches_only"
  },
  "preferences": {
    "language": "en",
    "theme": "dark"
  }
}
```

- **Success (200)**
  - `success` (boolean)
  - `message` (string)
  - `settings` (object) — full merged settings after update

- **Errors**
  - **401** `{ success: false, message: "No token provided" | "Invalid or expired token" }`
  - **404** `{ success: false, message: "User not found" }`
  - **500** `{ success: false, message: "Failed to update settings" }`

## Health

### GET `/health`
Simple health check.

- **Auth**: none
- **Success (200)**
  - `status` (string) = `"OK"`
  - `message` (string)
  - `timestamp` (string, ISO)

## Notes

- The backend currently mounts these route modules in `src/server.ts`:
  - `/api/auth` -> `src/routes/auth.ts`
  - `/api/profile` -> `src/routes/profile.ts`
  - `/api/leftswipe` -> `src/routes/leftswipe.ts`
  - `/api/recommendations` -> `src/routes/recommendations.ts`
  - `/api/settings` -> `src/routes/settings.ts`
- The files `src/routes/auth.routes.ts`, `src/routes/match.routes.ts`, `src/routes/user.routes.ts`, and `src/routes/index.ts` are present but contain placeholder comments and are not mounted by the server.
