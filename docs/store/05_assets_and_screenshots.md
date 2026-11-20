# Visual Asset Specifications & Screenshot Generation Plan

**Application:** Deen QnA (দ্বীন কিউএনএ)  
**Target Platforms:** Apple App Store (iOS, iPadOS) & Google Play Console (Android)  
**Design Philosophy:** Minimalist, editorial, high-contrast, distraction-free (Linear / Perplexity aesthetic with Emerald accent `#10b981`).

---

## 1. App Icon Specifications

### A. iOS App Icon (Apple App Store & TestFlight)
- **Dimensions:** `1024 x 1024 px`
- **Format:** PNG (24-bit RGB)
- **Color Profile:** sRGB or Display P3
- **Alpha Channel:** **STRICTLY NO ALPHA (Transparency = 0%)**  
  > *Critical App Store Rule:* App Store Connect will immediately reject icons that contain an alpha channel or transparent pixels. The canvas must be 100% opaque.
- **Corner Radius:** **Square corners (`0px` radius).** Do NOT pre-round the icon corners. iOS applies its proprietary squircles (`continuous-corner-radius`) automatically.
- **Design Elements:**
  - Background: Deep Dark Slate gradient (`#09090b` to `#18181b`).
  - Central Emblem: Refined Arabic ligature **"فت"** (representing Fatwa / ফতোয়া) in crisp ivory white (`#f4f4f5`) with emerald dot accent (`#10b981`).
  - Subtle 1px inner border in `#27272a`.

### B. Google Play Store App Icon
- **Dimensions:** `512 x 512 px` (or scaled from 1024x1024)
- **Format:** 32-bit PNG (alpha permitted for circular corners, but square with flat background recommended)
- **Max File Size:** 1,024 KB

### C. Android Adaptive Icon (App Bundle Assets)
- **Asset Size:** `108dp x 108dp` (Rendered at `432 x 432 px` for `xxxhdpi`)
- **Background Layer:** Solid dark slate canvas (`#09090b`) or XML vector drawable `@drawable/ic_launcher_background`.
- **Foreground Layer:** Central "فت" typographic glyph centered within the **Safe Zone (inner 66dp diameter / 264 x 264 px)**.
- **Monochrome Layer (Android 13+ Themed Icons):** Flat vector silhouette `@drawable/ic_launcher_monochrome` for dynamic system color theming.

---

## 2. Google Play Feature Graphic

- **Dimensions:** `1024 x 500 px`
- **Format:** JPEG or 24-bit PNG (No alpha channel)
- **Max File Size:** 15 MB
- **Composition & Layout:**
  - **Focal Safe Area:** Central `800 x 400 px` box (edges may be clipped by Google Play on smaller viewports or TV listings).
  - **Left / Center Side:** Deen QnA branding lockup:
    - Logo mark + text: `Deen QnA` (with Emerald accent on `QnA`).
    - Subtitle in Bengali: `২০,০০০+ প্রামাণিক ইসলামিক ফতোয়া ও গবেষণা আর্কাইভ`
    - Subtitle in English: `Authentic Islamic Q&A & Research Search Archive`
  - **Right Side:** Slanted floating perspective mockup cards showcasing real Q&A cards with green "Verified" badges (`যাচাইকৃত`) and source tags (`আত-তাহরীক`, `আলকাউসার`, `আল-ইতিসাম`).
  - **Background:** Deep dark ambient gradient (`#09090b` to `#064e3b` emerald glow at 15% opacity).

---

## 3. Store Screenshot Specifications

### A. Apple App Store Requirements

| Device Class | Display Size | Native Pixel Resolution | Required / Optional |
| :--- | :--- | :--- | :--- |
| **iPhone Primary** | 6.9" Super Retina (iPhone 16 Pro Max) | **1320 x 2868 px** (portrait) | **Mandatory** |
| **iPhone Alternate** | 6.7" / 6.5" Super Retina (iPhone 15 Pro Max / 11 Pro Max) | **1290 x 2796 px** or **1242 x 2688 px** | **Mandatory** *(if 6.9" not uploaded)* |
| **iPad Primary** | 13" Liquid Retina (iPad Pro 13-inch M4 / 12.9" 6th Gen) | **2064 x 2752 px** (portrait) | **Mandatory** *(for Universal iOS build)* |

### B. Google Play Console Requirements

| Device Class | Aspect Ratio | Recommended Resolution | Count |
| :--- | :--- | :--- | :--- |
| **Android Phone** | 9:20 / 9:16 Portrait | **1080 x 2400 px** (or 1080 x 1920 px) | Min 4, Max 8 |
| **7-Inch Tablet** | 16:10 Portrait | **1200 x 1920 px** | Min 1 (Optional but recommended) |
| **10-Inch Tablet** | 16:10 Portrait | **1600 x 2560 px** | Min 1 (Optional but recommended) |

---

## 4. Screenshot Storyboard: Screens, Layouts & Bilingual Captions

Each screenshot follows a high-converting layout:
1. **Top Banner (20% height):** Bold headline + descriptive secondary caption.
2. **Middle/Bottom (80% height):** High-resolution device frame with realistic in-app screens (no mock/lorem ipsum data).

```
+------------------------------------------+
|  HEADLINE: Bold 52pt Inter / Tiro Bangla |
|  Subheading: 26pt Regular Zinc-400       |
|                                          |
|  +------------------------------------+  |
|  | [Device Mockup Frame]              |  |
|  |                                    |  |
|  |   App Screen UI in OLED Dark Mode  |  |
|  |                                    |  |
|  +------------------------------------+  |
+------------------------------------------+
```

---

### Screenshot 1: Instant Intelligent Search (Home & Discover)
- **App Screen Shown:** Home screen with Perplexity-style central search input, active query `"তাহাজ্জুদ সালাতের নিয়ম"`, debounced instant dropdown preview, and response time badge `(৮ মিলিসেকেন্ড)`.
- **English Banner:**
  - **Headline:** Instant Sub-Millisecond Search
  - **Subtitle:** Fast fuzzy search across 20,000+ authentic Q&As in Bengali & English
- **Bengali Banner:**
  - **Headline:** মুহূর্তেই নির্ভরযোগ্য অনুসন্ধান
  - **Subtitle:** বাংলা ও ইংরেজিতে ২০,০০০+ প্রামাণিক ফতোয়া ও গবেষণার নির্ভুল সার্চ

---

### Screenshot 2: Comprehensive Categorized Exploration
- **App Screen Shown:** Topical filter bar with active category chips: সালাত (Prayer), সিয়াম (Fasting), যাকাত (Zakat), পরিবার ও বিবাহ (Family), মুয়ামালাত (Transactions) with live count badges.
- **English Banner:**
  - **Headline:** Browse by Category
  - **Subtitle:** Explore daily worship, family affairs, and commercial jurisprudence
- **Bengali Banner:**
  - **Headline:** বিষয়ভিত্তিক ফতোয়া সূচি
  - **Subtitle:** সালাত, সিয়াম, বিবাহ ও লেনদেনের মাসআলা খুব সহজেই খুঁজে নিন

---

### Screenshot 3: Refined Reader Mode & Scholar Attribution
- **App Screen Shown:** Dedicated Reader Modal open on a comprehensive fatwa card. Distinct green badge for `আত-তাহরীক` / `আলকাউসার`, answering Mufti/Scholar badge, publication issue date, and beautifully formatted Bengali/Arabic typography.
- **English Banner:**
  - **Headline:** Authentic Scholarly Reference
  - **Subtitle:** Clear attribution to original muftis, verified journals, and issue dates
- **Bengali Banner:**
  - **Headline:** স্পষ্ট উৎস ও গবেষকের রেফারেন্স
  - **Subtitle:** মূল মুফতী, গবেষণাপত্র ও প্রকাশনার তারিখসহ বিস্তারিত শরয়ী উত্তর

---

### Screenshot 4: Cryptographic Provenance & Direct Publisher Link
- **App Screen Shown:** Bottom of Fatwa Reader showing the **SHA-256 fingerprint badge** (`SHA-256: 4ab1a108... Verified`), accompanied by the one-click external link `মূল ওয়েবসাইটে দেখুন (https://alkawsar.com)`.
- **English Banner:**
  - **Headline:** Cryptographic Integrity
  - **Subtitle:** SHA-256 verified text ensuring zero alteration and direct publisher links
- **Bengali Banner:**
  - **Headline:** ক্রিপ্টোগ্রাফিক প্রামাণিকতা
  - **Subtitle:** তথ্যের অবিকলতা নিশ্চিতে SHA-256 সুরক্ষা ও মূল প্রকাশকের সরাসরি লিংক

---

### Screenshot 5: 100% Private, Ad-Free & Dark Mode
- **App Screen Shown:** Clean settings / full interface showcasing deep OLED dark mode (`#09090b`), zero banners, zero interstitial popups, with privacy badge: "কোনো একাউন্ট বা লগইনের প্রয়োজন নেই".
- **English Banner:**
  - **Headline:** 100% Private & Ad-Free
  - **Subtitle:** No registration required, zero tracking, and elegant OLED dark mode
- **Bengali Banner:**
  - **Headline:** সম্পূর্ণ বিজ্ঞাপনমুক্ত ও নিরাপদ
  - **Subtitle:** কোনো লগইন ঝামেলা নেই, ট্র্যাকিংমুক্ত এবং আরামদায়ক ডার্ক মোড

---

## 5. Automated Asset Generation Plan

To generate the exact pixel assets across all iOS and Android target resolutions without manual slicing:

### Recommended Toolchain:
1. **Figma Store Kit:** Utilize community mobile frame mockups (iPhone 16 Pro Max, iPad Pro 13, Pixel 9 Pro).
2. **Playwright / Puppeteer Screenshot Automation Script:**
   - Run local web build at standard viewports (`1320x2868`, `2064x2752`, `1080x2400`).
   - Capture clean PNG screenshots with dark mode forced (`page.emulateMedia({ colorScheme: 'dark' })`).
3. **ImageMagick Post-Processing CLI (Ensure No Alpha on iOS Icon):**
   ```bash
   # Remove alpha channel and ensure flat 24-bit sRGB for iOS 1024x1024 icon
   magick convert app_icon_raw.png -alpha off -depth 8 -colorspace sRGB app_icon_1024x1024_no_alpha.png

   # Verify no alpha channel exists:
   magick identify -format "%[channels]" app_icon_1024x1024_no_alpha.png
   # Expected Output: srgb (NOT srgba)
   ```

### Check Before Upload:
- [ ] iOS App Icon has 0% alpha (format is 24-bit RGB PNG).
- [ ] Google Play Feature Graphic is exactly `1024 x 500 px` under 15MB.
- [ ] All iPhone screenshots are exactly `1320 x 2868 px` or `1290 x 2796 px`.
- [ ] All iPad screenshots are exactly `2064 x 2752 px` or `2048 x 2732 px`.
- [ ] Text headlines are completely legible when viewed at 50% scale on mobile storefronts.
