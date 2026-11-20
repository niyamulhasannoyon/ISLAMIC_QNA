# Apple App Store Reviewer Notes & Submission Guide

**Application:** Deen QnA (দ্বীন কিউএনএ)  
**Bundle Identifier:** `org.deenqna.app` (or configured bundle ID)  
**Version:** 1.0.0  
**Submission Section:** App Store Connect > App Review Information > Notes

---

## 1. App Review Information Form Fields

In **App Store Connect > App Review Information**, configure the required submission fields exactly as follows:

| Field | Setting / Value | Notes |
| :--- | :--- | :--- |
| **Sign-In Required** | **UNCHECKED (No)** | **Crucial:** The application requires **NO login, user registration, or authentication**. All features are 100% accessible in guest mode immediately upon launch. |
| **User Name** | *Leave Empty* | N/A |
| **Password** | *Leave Empty* | N/A |
| **First Name** | `[Your First Name]` | Primary release contact |
| **Last Name** | `[Your Last Name]` | Primary release contact |
| **Phone Number** | `+1 (XXX) XXX-XXXX` or `+880 1XXXXXXXXX` | Active contact number including country code |
| **Email Address** | `support@deenqna.org` (or developer email) | Monitored contact email |
| **Attachment** | *Optional (Upload walkthrough video if requested)* | N/A |

---

## 2. Copy-Paste Text for App Store Connect "Notes" Field

Copy and paste the exact text block below into the **Notes (4,000 character limit)** textarea in App Store Connect:

```
DEAR APPLE APP REVIEW TEAM,

Thank you for reviewing Deen QnA (Version 1.0.0). Below is a complete operational guide and compliance disclosure to assist in your evaluation.

1. NO SIGN-IN OR ACCOUNT REQUIRED
This app operates strictly as an open educational reference library and search engine. No sign-in, user registration, subscription, or account creation is required or requested. 100% of the app's features and indexed content are freely accessible immediately upon launch.

2. CORE TESTING FLOWS & HOW TO USE THE APP
• Step 1 (Search): On the main screen, tap the search input. Enter any query in Bengali, English, or transliterated text.
  - Recommended Test Queries:
    * "সালাত" or "prayer" (displays prayer rulings)
    * "রোজা" or "fasting" (displays Ramadan & fasting rulings)
    * "যাকাত" or "zakat" (displays charity rulings)
    * "উত্তরাধিকার" (displays inheritance rulings)
• Step 2 (Instant Results & Fuzzy Matching): Notice that search results update instantly with sub-millisecond latency. Keyword terms are safely highlighted.
• Step 3 (Category Filtering): Tap any category badge at the top (e.g., "সালাত (Prayer)", "সিয়াম (Fasting)", "পারিবারিক ও বিবাহ (Family & Marriage)") to instantly filter results with live count badges.
• Step 4 (Reader Mode & Scholarly Attribution): Tap any search card to open the distraction-free Reader View. Notice:
  - Clear source badge citing the publishing journal (e.g., "উৎস: মাসিক আত-তাহরীক", "উৎস: মাসিক আলকাউসার", "উৎস: আল-ইতিসাম").
  - Answering scholar / mufti name.
  - Original publication date and issue number.
  - Complete, unedited question and detailed scholarly answer.
• Step 5 (Cryptographic Integrity & External Source): Scroll to the bottom of any fatwa reader view to see the cryptographic SHA-256 fingerprint badge ("SHA-256: [hash] Verified"). Tap "মূল ওয়েবসাইটে দেখুন" (View Original Source) to open the original source article in the external system browser.
• Step 6 (Themes & Languages): Toggle the Dark/Light mode button in the top navigation bar to test OLED dark theme rendering. Use the language switcher to view UI strings in English, Bengali, or Arabic.
• Step 7 (Content Reporting): In any Q&A view, tap the Flag / "ত্রুটি জানান" (Report Issue) button to view the error reporting sheet (used for reporting typographical errors or broken links).

3. SOURCE OF CONTENT & INTELLECTUAL PROPERTY (GUIDELINE 5.2)
• Deen QnA is a digital indexing and retrieval platform aggregating previously published Islamic jurisprudence (Fiqh) Q&As and research papers from established, accredited Islamic periodicals in Bangladesh:
  1. Monthly At-Tahreek (Published by Hadith Foundation Bangladesh, https://at-tahreek.com)
  2. Monthly Al-Kawsar (Published by Markazud Da'wah Al-Islamia Dhaka, https://alkawsar.com)
  3. Al-I'tisam Research Archive (https://al-itisam.com)
• Every indexed Q&A explicitly credits the originating publication and scholar, links to the publisher's canonical web page, and maintains an immutable SHA-256 hash ensuring textual fidelity.
• The app and its developers DO NOT issue original fatwas and DO NOT claim independent religious or scholarly authority. The app acts strictly as an educational search index for previously published works.
• A clear DMCA-compliant Notice & Takedown policy is maintained at https://deenqna.vercel.app/terms with a designated contact email (copyright@deenqna.org).

4. MEDICAL & LEGAL DISCLAIMERS (GUIDELINE 1.4.1 & 1.4)
• Certain classical religious rulings discuss fasting while sick, medications during Ramadan, or personal law (inheritance, divorce).
• The app prominently includes clear disclaimers that all content is for educational and religious reference only, is NEVER a substitute for professional healthcare or medical advice, and does not constitute formal legal counsel. Users experiencing health concerns are directed to licensed physicians.

5. DATA PRIVACY & COMPLIANCE (GUIDELINE 5.1)
• The app collects zero personally identifiable information (PII).
• No advertising SDKs or third-party tracking libraries are included.
• An Apple Privacy Manifest (PrivacyInfo.xcprivacy) is embedded in the binary declaring all Required Reason APIs (UserDefaults CA92.1, FileTimestamp C617.1, SystemBootTime 35F9.1, DiskSpace 85F4.1).
• Live Privacy Policy: https://deenqna.vercel.app/privacy
• Live Terms of Service: https://deenqna.vercel.app/terms

If you have any questions or require further information during review, please contact us directly at support@deenqna.org. We appreciate your assistance!
```

---

## 3. Anticipated Apple Review Scenarios & Ready Responses

### Scenario A: Ingestion / Web Content Question (Guideline 4.2 - Minimum Functionality)
- **Reviewer Question:** *"Your app appears to be a web repackaging or provides content accessible via Safari."*
- **Response Template:**
  ```
  Deen QnA is specifically engineered as a high-performance native-feeling search engine and offline-capable reference tool, providing significant functionality beyond a standard website:
  1. Sub-millisecond client-side fuzzy search indexing (tolerating spelling mistakes and phonetics in Bengali and English).
  2. Offline local database caching allowing users to review previously searched fatwas without active network connectivity.
  3. Native system share sheet integration and clipboard deep-linking.
  4. Specialized typographic rendering engine with dynamic Arabic/Bengali font ligature scaling and OLED true-black theme.
  5. Cryptographic SHA-256 verification checking data integrity locally.
  These capabilities deliver a fluid, native reference utility designed specifically for touch devices.
  ```

### Scenario B: Scholarly Authority / User Safety Question (Guideline 1.4 / 2.3.7)
- **Reviewer Question:** *"Please clarify the authority or certification of the rulings provided in your app."*
- **Response Template:**
  ```
  We emphasize that Deen QnA does NOT author or issue religious fatwas, nor do the app developers claim personal religious authority.

  Deen QnA is purely a digital search index for established, previously published Islamic research journals:
  - Monthly At-Tahreek (published continuously since 1997 by Hadith Foundation Bangladesh)
  - Monthly Al-Kawsar (published continuously since 2005 by Markazud Da'wah Al-Islamia Dhaka)
  - Al-I'tisam Research Archive

  Each record explicitly cites the original publication, the named scholar or mufti from the respective editorial board, the publication date, and the direct canonical web link. Prominent disclaimers instruct users to seek personal guidance from qualified local scholars and remind users that content is not medical or legal advice.
  ```

### Scenario C: Copyright / Permission Inquiry (Guideline 5.2.1)
- **Reviewer Question:** *"Please provide documentation demonstrating authorization to distribute the third-party content."*
- **Response Template:**
  ```
  Deen QnA functions as a public educational reference index. All indexed materials are non-commercial scholarly Q&As published openly by the respective research institutions for public guidance.
  
  In accordance with scholarly indexing standards:
  1. Full attribution is given to the source journal, editorial board, and author for every item.
  2. Direct permalinks route users to the original publisher's website to view the original publication.
  3. No commercial paywall, monetization, or advertisements exist in the app.
  4. A published DMCA and copyright takedown procedure is maintained on our website (https://deenqna.vercel.app/terms) and monitored by our designated copyright agent (copyright@deenqna.org).
  ```
