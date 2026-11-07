# Store Privacy & Data Safety Declarations

This document contains the disclosures, privacy nutrition labels, and data safety answers required for Apple App Store and Google Play Store submissions for **StrayCat Walk**.

---

## 1. App Store Privacy Nutrition Labels (Apple)

### Data Used to Track You
- **None**: StrayCat Walk does NOT track users across third-party apps or websites for targeted advertising.

### Data Linked to You (Account & Activity)
| Data Category | Data Type | Purpose | Optional / Required |
|---|---|---|---|
| **Location** | Precise Location (Active walk recording only) | App Functionality (calculating walk distance, pace, and displaying route). GPS coordinates are never stored on cat sightings or shared with friends. | Required to record walks; optional for viewing. |
| **Location** | Coarse Location (~5 km cell) | App Functionality (optional general neighborhood badge on cat cards, default OFF). | Optional (opt-in toggle in Privacy Settings). |
| **Health & Fitness** | Steps, Active Energy (Calories) | App Functionality (displaying daily step milestones and personal walking progress). Calorie estimates are strictly personal and never displayed on leaderboards. | Optional (can use phone pedometer or skip). |
| **Photos or Videos** | User Photos (Cat camera sightings) | App Functionality (creating personal collectible cat cards). Camera flash is permanently disabled. | Optional (cat spotting feature). |
| **User Content** | Cat card nicknames, reports | App Functionality & Content Moderation. | Optional. |
| **Identifiers** | User ID, Device ID | App Functionality, Account Authentication. | Required for cloud sync. |

---

## 2. Apple HealthKit Purpose Strings (`Info.plist`)

- `NSHealthShareUsageDescription`:
  > "StrayCat Walk reads your daily walking step count and active walking workouts from Apple Health to help you complete walking challenges and earn paw points."
- `NSHealthUpdateUsageDescription`:
  > "StrayCat Walk saves walking workouts recorded during your outdoor strolls to Apple Health."
- `NSLocationWhenInUseUsageDescription`:
  > "StrayCat Walk requires location access while recording your outdoor stroll to calculate your distance, walking pace, and map your route."
- `NSLocationAlwaysAndWhenInUseUsageDescription`:
  > "StrayCat Walk uses background location to continue recording your walking distance and route while your screen is locked or the app is in the background."
- `NSCameraUsageDescription`:
  > "StrayCat Walk uses your camera to capture respectful, no-flash stray cat sightings for your personal collection card deck."

---

## 3. Google Play Data Safety Declaration

### Data Collected & Shared
1. **Location**:
   - *Approximate location*: Yes, collected for app functionality. Not shared with third parties.
   - *Precise location*: Yes, collected during active walks for distance and polyline path. Not shared with third parties or stored on cat sightings.
2. **Health and Fitness**:
   - *Steps & Distance*: Collected for personal activity progress.
   - *Data sharing*: Never shared with advertisers or data brokers.
3. **Photos**:
   - Collected for cat card creation. Stored in a private, authenticated cloud storage bucket. EXIF metadata (including location) is stripped prior to transmission.
4. **Account Information**:
   - Email address, username, display name.

### Security Practices
- **Data Encrypted in Transit**: All network requests use TLS 1.3.
- **Data Deletion Request Available**: Yes, users can delete individual walks, all walks, all cat photos, or their entire account directly in-app at **Settings > Account & Data Controls**.
- **Child Policy**: Not targeted at children under 13.

---

## 4. Third-Party AI Vision Processing
- Cat photos submitted for card creation are processed by Google Gemini 2.5 Flash API via a backend serverless Edge Function (`validate-sighting`).
- **Processing Scope**: Evaluates whether the image contains a cat, image safety/moderation flags, and checks for screen/print re-photographing.
- **Privacy Protection**: Zero user identifiers or account emails are transmitted to the AI provider. EXIF geolocation and camera metadata are stripped before image upload.

---

## 5. Retention & Deletion Summary
- **Routes & GPS Points**: Stored securely in `walks` table; start and end points trimmed by 100–300 m on-device. Users can delete any walk or all walks at any time.
- **Cat Sightings**: Stored in `sightings` with perceptual hash; photos stored in private storage bucket.
- **Account Deletion**: Invokes `delete-account` Edge Function, removing all cloud storage photos and executing database cascade deletion of all user records.
