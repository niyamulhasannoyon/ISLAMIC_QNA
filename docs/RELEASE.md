# Mobile Release Playbook & Deployment Checklist

This document details the end-to-end promotion, testing, and production rollout pipeline for the mobile application across Android (Google Play Console) and iOS (Apple App Store Connect / TestFlight).

---

## 1. Pre-Flight Release Checklist

Before triggering a release build via Git tag:

- [ ] **Working Copy**: Ensure all feature branches are merged into `main` and working tree is clean.
- [ ] **Changelog**: Update release notes and version string in `package.json` and `app.json`.
- [ ] **Dependency Audit**: Ensure no native dependency discrepancies (`npx expo install --check`).
- [ ] **API & Backend**: Verify production API endpoints are deployed and backwards compatible with previous client versions.
- [ ] **Remote Config & Feature Flags**: Ensure default flag values reflect desired production behavior.
- [ ] **Deep Links**: Validate `/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association` are live and returning HTTP 200 with `application/json`.
- [ ] **Automated Tests**: Confirm test suite passes cleanly locally:
  ```bash
  npm run lint && npm test
  ```

---

## 2. Release Promotion Pipeline (Android)

```
[ Git Tag vX.Y.Z ]
        │
        ▼ (EAS Cloud Build: .aab)
[ Internal Testing Track ] ──► (Instant; up to 100 internal QA testers; zero review)
        │
        ▼ (Promote Release)
[ Closed Testing Track ]   ──► (Target tester ring: Alpha/Beta)
        │                      *Mandatory: 20 testers for 14 continuous days (Personal Accounts)
        ▼ (Apply for Production / Promotion)
[ Production Staged Rollout ] (5% ──► 10% ──► 20% ──► 50% ──► 100%)
```

### Step 2.1: Internal Testing Track
- **Purpose**: Immediate smoke testing and sanity verification by the core mobile engineering team.
- **Audience**: Up to 100 pre-registered internal testers via email list.
- **Review Delay**: **None (Instant)**. Builds appear in Play Store within 10–15 minutes of upload.
- **Submission**: Automated via GitHub Actions (`eas submit --platform android --profile production --track internal`).
- **Validation**: Verify install, cold start, login flow, deep linking, and push notification tokens.

### Step 2.2: Closed Testing Track & Google Play Account Verification
- **Purpose**: Extended regression testing with real external devices and conditions.
- **Mandatory Requirement for New Personal Accounts (Google Play Policy)**:
  > **Policy Requirement**: All personal developer accounts created on or after **November 13, 2023** MUST run a closed test with **at least 20 testers opted-in for at least 14 days continuously** before applying for production access.
  >
  > - **Tester Count**: Minimum 20 distinct Google accounts opted into the closed test.
  > - **Duration**: All 20 testers must maintain active opt-in for 14 continuous consecutive days.
  > - **Production Application**: Once the 14 days elapse, navigate to Google Play Console Dashboard and click **"Apply for production"**. Fill out the mandatory questionnaire:
  >   1. How you recruited your testers (e.g. employee lists, early beta signups).
  >   2. Description of your app and core user journey.
  >   3. Engagement summary: Feedback received, crash reports investigated, and iterations released during the 14-day window.
  > - **Organization Accounts**: Developer accounts registered as an Organization (requiring a valid D-U-N-S number) are **exempt** from this 20-tester/14-day gate, though running a closed test prior to production is strongly enforced as best practice.

### Step 2.3: Production Staged Rollout
Once approved for production, NEVER release to 100% immediately. Use Google Play's Staged Rollout:

| Day | Percentage | Monitoring Gate & Criteria |
| :--- | :--- | :--- |
| **Day 1** | **5%** | Deploy to 5%. Monitor Android Vitals & Sentry/Crashlytics for 24 hours. |
| **Day 2** | **10%** | Inspect crash-free user rate (must exceed 99.5%). Verify ANR rates. |
| **Day 3** | **20%** | Check server load / API throughput with increased active clients. |
| **Day 4** | **50%** | Broad device OEM verification (Samsung, Xiaomi, Pixel). |
| **Day 5** | **100%** | Full global release. |

#### Android Vitals Halting Criteria:
Halt the rollout immediately in Google Play Console (`Release > Production > Edit release > Halt rollout`) if any of the following Google Bad Behavior thresholds are approached:
- **User-perceived Crash Rate**: > **1.09%** (Google Play Threshold). Target: < **0.20%**.
- **User-perceived ANR Rate**: > **0.47%** (Google Play Threshold). Target: < **0.10%**.

---

## 3. Release Promotion Pipeline (iOS)

```
[ Git Tag vX.Y.Z ]
        │
        ▼ (EAS Cloud Build: .ipa / Archive)
[ TestFlight Internal ]   ──► (Instant; up to 100 App Store Connect users; zero review)
        │
        ▼ (Add Build to External Group)
[ TestFlight External ]   ──► (Up to 10,000 public testers; requires Beta App Review)
        │
        ▼ (Submit for App Store Review)
[ App Store Review ]      ──► (App Review team manual inspection; 24-48 hours)
        │
        ▼ (Approved: Release via Phased Release)
[ 7-Day Phased Release ]  (1% ──► 2% ──► 5% ──► 10% ──► 20% ──► 50% ──► 100%)
```

### Step 3.1: TestFlight Internal Testing
- **Audience**: Up to 100 internal team members added to App Store Connect (Admins, App Managers, Developers, Marketers).
- **Processing Time**: 5–15 minutes after upload for Apple's asset validation.
- **Review Requirement**: **No Apple Review**. Immediately available via TestFlight app once processed.
- **Action**: Smoke test immediately upon push notification from TestFlight.

### Step 3.2: TestFlight External Testing
- **Audience**: Up to 10,000 external beta testers via email invitation or public TestFlight URL.
- **Review Requirement**: Requires **Beta App Review** for the first build of a new version (`v1.0.0 (1)`). Turnaround is typically 8–24 hours. Subsequent sub-builds of the same version (`v1.0.0 (2)`) often pass without re-review unless significant entitlements change.
- **Test Information**: Include brief testing notes describing what new features/fixes are present.

### Step 3.3: App Store Review Submission
- Navigate to **App Store Connect > Apps > [App Name] > iOS App > Prepare for Submission**.
- **Version Release Information**:
  - **What's New in This Version**: Clear, user-facing changelog.
  - **App Review Notes**: Demo account credentials (`username: reviewer@fatwasearch.com`, `password: SampleSecret123!`), instructions on how to reach core features.
  - **Contact Information**: Name, phone number, and email of the release engineer on call.
  - **Export Compliance**: ITSAppUsesNonExemptEncryption set to `false` (configured in `app.json`).
- Submit build for formal review. Review times average 24 to 48 hours.

### Step 3.4: 7-Day Phased Release (Automatic)
Configure **Phased Release for Automatic Updates**:
- **Day 1**: 1% of automatic updates
- **Day 2**: 2%
- **Day 3**: 5%
- **Day 4**: 10%
- **Day 5**: 20%
- **Day 6**: 50%
- **Day 7**: 100%
- *Note*: Users who manually download the app from the App Store receive the new version immediately.
- **Emergency Pause**: You may pause the phased release for a cumulative maximum of **30 days** at any point if a critical regression is identified.

---

## 4. Emergency Procedures: Hotfix vs. OTA Update

Depending on the nature of a production bug:

### Scenario A: JavaScript/TypeScript or Asset Bug (No Native Code Changed)
Use **EAS Update** for instant, zero-store-review OTA deployment:
```bash
# Publish instant OTA update to production channel
eas update --channel production --message "HOTFIX: Resolve query crash in search screen"
```
The update is instantly delivered to active users based on the matching `runtimeVersion` policy (`fingerprint`).

### Scenario B: Native Code, Crash in Pods/Gradle, or Security Vulnerability
1. **Pause Staged Rollout**:
   - Google Play: Click **Halt rollout**.
   - Apple App Store: Click **Pause Phased Release**.
2. **Commit Fix & Bump Version**:
   - Create hotfix branch `hotfix/v1.0.1`.
   - Bump version to `1.0.1` and push Git tag `v1.0.1`.
3. **Expedited Review Request (Apple)**:
   - In App Store Connect, submit the new binary and submit an **Expedited App Review Request** selecting "Critical Bug Fix" with step-by-step reproduction and impact metrics.
