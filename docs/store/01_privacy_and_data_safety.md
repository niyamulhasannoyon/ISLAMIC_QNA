# Privacy Policy, Terms, Data Collection Inventory & App Store Declarations

**Application Name:** Deen QnA (দ্বীন কিউএনএ)  
**Production Host:** `https://deenqna.vercel.app`  
**Primary Support Email:** `support@deenqna.org` (or `contact@deenqna.vercel.app`)  
**Release Version:** 1.0.0  
**Target Stores:** Apple App Store (iOS/iPadOS) & Google Play Console (Android)

---

## 1. Hosted Legal URLs

| Document | Canonical Web URL | Status |
| :--- | :--- | :--- |
| **Privacy Policy** | `https://deenqna.vercel.app/privacy` | Live & Publicly Accessible |
| **Terms of Service** | `https://deenqna.vercel.app/terms` | Live & Publicly Accessible |
| **Data Safety / Deletion Request** | `https://deenqna.vercel.app/privacy#data-retention` | Live & Publicly Accessible |

> **Store Guideline Compliance Note:** Both URLs are direct, non-authenticated web pages, load over secure HTTPS with valid TLS certificates, and render responsively on mobile browsers without modal paywalls or sign-in walls.

---

## 2. Data Collection Inventory (Mobile Client)

### Architecture & Privacy Philosophy
Deen QnA is designed as a **public reference and educational research archive**. The mobile application functions entirely in **Guest Mode**:
- **No User Registration or Login Required:** Users can search, browse, filter, read, and share fatwas without creating an account or providing any personal details (no name, email, phone number, or passwords).
- **No Third-Party Advertising SDKs:** The application contains zero commercial ad networks (no AdMob, Unity Ads, Facebook Audience Network, or programmatic ad bidders).
- **No Cross-App Tracking:** The application does not read IDFA (Identifier for Advertisers) or GAID (Google Advertising ID) and never participates in tracking or data brokering across external apps or websites.

### Data Types Collected

| Data Category | Specific Data Element | Collected? | Linked to User Identity? | Used for Tracking? | Purpose | Retention Period |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Identifiers** | User ID, Name, Email, Phone | **NO** | N/A | No | None (App requires no registration) | N/A |
| **Diagnostics** | Crash Logs & Stack Traces | **YES** | **NO** (Anonymous) | No | App Stability, Crash Resolution | 90 days rolling |
| **Diagnostics** | Performance Metrics (e.g. search latency) | **YES** | **NO** (Anonymous) | No | Performance Optimization | 90 days rolling |
| **App Activity** | Anonymous Search Queries & Clicks | **YES** | **NO** (Pseudonymous/Visitor Token) | No | Search Index Optimization, Trending Topics | 90 days rolling |
| **Location** | Precise or Coarse GPS Location | **NO** | N/A | No | None | N/A |
| **Financial / Purchases** | Credit Cards, In-App Purchases | **NO** | N/A | No | None (Free App) | N/A |
| **Device Storage / Media** | Photos, Camera, Files, Microphone | **NO** | N/A | No | None | N/A |
| **Contacts / Social Graph** | Address Book, Social Accounts | **NO** | N/A | No | None | N/A |

---

## 3. Google Play Data Safety Form Answers

Use the exact responses below when completing the **Data Safety** questionnaire in Google Play Console:

### Section 1: Data collection and security
1. **Does your app collect or share any of the required user data types?**
   - **Answer:** **Yes** (Diagnostics & App Activity).
2. **Is all of the user data collected by your app encrypted in transit?**
   - **Answer:** **Yes** (All communications use HTTPS / TLS 1.3).
3. **Do you provide a way for users to request that their data be deleted?**
   - **Answer:** **Yes** (Users can reset their anonymous local storage visitor token directly in app settings, or contact support to request server-side log purge).

### Section 2: Data types breakdown

#### A. App info and performance: Crash logs
- **Collected?** Yes
- **Shared?** No (Data is processed solely on our self-hosted / cloud telemetry infrastructure and not transferred to third parties).
- **Is this data processed ephemerally?** No (Stored up to 90 days for crash triage).
- **Is this data required for your app or can users choose whether it’s collected?** Required (Essential for maintaining application stability).
- **Why is this user data collected?**
  - Select: **App functionality**
  - Select: **Analytics**

#### B. App info and performance: Diagnostics
- **Collected?** Yes
- **Shared?** No
- **Is this data processed ephemerally?** No
- **Is this data required?** Required
- **Why is this user data collected?**
  - Select: **Analytics** (Measuring search query execution latency and edge network round trips).

#### C. App activity: App interactions
- **Collected?** Yes
- **Shared?** No
- **Is this data processed ephemerally?** No
- **Is this data required?** Required
- **Why is this user data collected?**
  - Select: **App functionality**
  - Select: **Analytics** (Aggregating popular questions and verifying search relevancy).

#### D. All other categories
- **Personal info:** **No**
- **Financial info:** **No**
- **Location:** **No**
- **Photos and videos:** **No**
- **Audio files:** **No**
- **Health and fitness:** **No**
- **Messages:** **No**
- **Contacts:** **No**
- **Web browsing:** **No**
- **Device or other IDs:** **No**

---

## 4. Apple App Privacy "Nutrition Labels" (App Store Connect)

In **App Store Connect > App Privacy**, answer as follows:

### Step 1: Do you or your third-party partners collect data from this app?
- **Answer:** **Yes**

### Step 2: Data Types Configuration

#### 1. Diagnostics -> Crash Data
- **Collected:** Yes
- **Usage:**
  - App Functionality: Yes
  - Analytics: Yes
- **Linked to the User's Identity:** **NO**
- **Used for Tracking Purposes:** **NO**

#### 2. Diagnostics -> Performance Data
- **Collected:** Yes
- **Usage:**
  - Analytics: Yes
- **Linked to the User's Identity:** **NO**
- **Used for Tracking Purposes:** **NO**

#### 3. Usage Data -> Product Interaction
- **Collected:** Yes (Anonymous search query strings, category filter selections, and fatwa view events).
- **Usage:**
  - App Functionality: Yes
  - Analytics: Yes
- **Linked to the User's Identity:** **NO**
- **Used for Tracking Purposes:** **NO**

### Final App Privacy Summary Displayed to App Store Users:
```
Data Not Linked to You
The following data may be collected but it is not linked to your identity:
- Diagnostics (Crash Data, Performance Data)
- Usage Data (Product Interaction)

Data Used to Track You:
None
```

---

## 5. Apple Privacy Manifest (`PrivacyInfo.xcprivacy`)

Starting May 1, 2024, Apple requires all iOS/iPadOS applications and third-party frameworks to include a `PrivacyInfo.xcprivacy` property list file declaring Required Reason APIs and data collection.

Place the following XML in your Xcode project root / resource bundle as `PrivacyInfo.xcprivacy`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Tracking Domain Declarations (Must be false as no ATT tracking occurs) -->
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyTrackingDomains</key>
    <array/>

    <!-- Collected Data Types -->
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <!-- 1. Crash Data -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeCrashData</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
                <string>NSPrivacyCollectedDataTypePurposeAnalytics</string>
            </array>
        </dict>
        <!-- 2. Performance Data -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypePerformanceData</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAnalytics</string>
            </array>
        </dict>
        <!-- 3. Product Interaction -->
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeProductInteraction</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
                <string>NSPrivacyCollectedDataTypePurposeAnalytics</string>
            </array>
        </dict>
    </array>

    <!-- Required-Reason APIs Used by App and Core Dependencies -->
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <!-- 1. User Defaults: Used for storing local preferences (Theme: Dark/Light, Language: bn/en/ar) -->
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <!-- CA92.1: Access user defaults to read and write app-specific information -->
                <string>CA92.1</string>
            </array>
        </dict>

        <!-- 2. File Timestamp: Used for managing client-side SQLite/WAL offline search cache -->
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <!-- C617.1: Access timestamp to manage files inside the app container -->
                <string>C617.1</string>
            </array>
        </dict>

        <!-- 3. System Boot Time: Used for measuring search query and network response latency -->
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <!-- 35F9.1: Measure elapsed time between events within the app -->
                <string>35F9.1</string>
            </array>
        </dict>

        <!-- 4. Disk Space: Used to verify available storage before caching offline fatwa indices -->
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryDiskSpace</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <!-- 85F4.1: Display or verify space before persisting large offline indices -->
                <string>85F4.1</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

---

## 6. Full Privacy Policy Reference Text (For In-App View & Store Verification)

```markdown
# Privacy Policy (Deen QnA)
Last Updated: November 2026

Deen QnA operates as an open digital archive and search engine for authentic Islamic research and fatwas. We are committed to upholding transparency, data minimalism, and user privacy.

1. Information We Do Not Collect
- We do not require personal registration or account creation to use Deen QnA.
- We do not collect your real name, physical address, email address, phone number, or government ID.
- We do not access your device camera, microphone, photo library, or contact list.
- We do not collect GPS location data.

2. Anonymous Telemetry & Search Logs
- To optimize search quality and verify server stability, our servers log anonymous search query strings, response times, and device classifications (e.g. iOS / Android).
- IP addresses are cryptographically hashed using SHA-256 for basic DDoS protection and rate limiting; raw IP addresses are discarded.
- Crash reports contain anonymous stack traces to assist our open-source developers in fixing bugs.

3. Cookies & Local Storage
- Local storage (NSUserDefaults / SharedPreferences) is used exclusively on your local device to remember your reading preferences (e.g., Dark Mode or Light Mode, Bengali or English interface language).

4. Data Sharing & Third Parties
- We do not sell, rent, monetize, or broker user data to any advertising exchanges or third-party brokers.
- We do not include third-party advertising SDKs.

5. Data Retention & Deletion Rights
- Anonymous crash diagnostics and server logs are purged on a rolling 90-day retention schedule.
- Users can clear their local preferences and cached search history at any time by clearing the application storage in their device settings or contacting support@deenqna.org.
```
