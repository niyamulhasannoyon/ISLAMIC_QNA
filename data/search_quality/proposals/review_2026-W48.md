# 📋 Search Quality Review Proposal: Week 2026-W48

> **Generated:** 2026-11-20T20:33:21.612Z  
> **Safety Policy:** **NEVER AUTO-MERGE**. This document is for manual engineer review and approval before merging into `synonyms.ts` or `eval/golden.json`.

## 1. Executive Summary
- **Total Queries Scanned:** 1
- **Zero-Result Queries:** 0
- **Low-CTR Queries (<15%):** 5
- **Target Output:** `/Users/niyamulhasan/Desktop/Code/Question & Answer/data/search_quality/proposals/review_2026-W48.json`

## 2. Problem Queries Breakdown

| Query | Script | Type | Hits | Results | CTR | Proposed Canonical / Synonyms |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `নামাজ কাজা করার নিয়ম` | Bengali | LOW_CTR | 12 | 19976 | 0% | নামাজ কাজা করার নিয়ম |
| `tahajjud kivabe porbo` | Banglish | LOW_CTR | 8 | 2 | 0% | তাহাজ্জুদ কিভাবে পোড়বো, তাহাজ্জুদ, তাহাজ্জুদের |
| `কুকুর কাপড়ে মুখ দিলে` | Bengali | LOW_CTR | 7 | 28304 | 0% | কুকুর কাপড়ে মুখ দিলে |
| `share market halal ki` | Banglish | LOW_CTR | 6 | 33458 | 0% | শেয়ার বাজার হালাল কি, শেয়ার বাজার, স্টক মার্কেট |
| `soitaner waswasa theke bachar upay` | Banglish | LOW_CTR | 5 | 11312 | 0% | শয়তানের ওয়াসওয়াসা থেকে বাচার উপায়, শয়তানের ওয়াসওয়াসা, কুমন্ত্রণা থেকে মুক্তি |

## 3. Proposed `SYNONYM_CLUSTERS` Additions (`src/lib/search/synonyms.ts`)

Review and append approved clusters to `SYNONYM_CLUSTERS`:

```typescript
// Proposed additions for Week 2026-W48
  ['নামাজ কাজা করার নিয়ম'], // LOW_CTR (12 hits)
  ['tahajjud kivabe porbo', 'তাহাজ্জুদ কিভাবে পোড়বো', 'তাহাজ্জুদ', 'তাহাজ্জুদের', 'কিয়ামুল লাইল', 'কিভাবে', 'কীভাবে', 'পদ্ধতি', 'নিয়ম', 'পোড়বো'], // LOW_CTR (8 hits)
  ['কুকুর কাপড়ে মুখ দিলে'], // LOW_CTR (7 hits)
  ['share market halal ki', 'শেয়ার বাজার হালাল কি', 'শেয়ার বাজার', 'স্টক মার্কেট', 'শেয়ার বিনিয়োগ', 'শেয়ার', 'বাজার', 'হালাল', 'বৈধ', 'কি', 'কী'], // LOW_CTR (6 hits)
  ['soitaner waswasa theke bachar upay', 'শয়তানের ওয়াসওয়াসা থেকে বাচার উপায়', 'শয়তানের ওয়াসওয়াসা', 'কুমন্ত্রণা থেকে মুক্তি', 'কুচিন্তা', 'শয়তানের', 'ওয়াসওয়াসা', 'থেকে', 'হতে', 'বাচার', 'উপায়'], // LOW_CTR (5 hits)
```

## 4. Proposed Golden-Set Additions (`eval/golden.json`)

Review and append approved entries to `eval/golden.json` for automated regression checking:

```json
[
  {
    "id": 1001,
    "query": "নামাজ কাজা করার নিয়ম",
    "type": "bengali",
    "titleKeywords": [
      "নামাজ কাজা করার নিয়ম",
      "প্রশ্ন",
      "(২৮/১৪৮)",
      "ছালাতে",
      "(১৭)"
    ],
    "expectedIds": [
      "df9362d9-3469-9c7a-2c6f-199027079d2d",
      "68d15d39-ed0c-df98-c155-ef68af79621f",
      "e5012207-244d-7b6b-e251-0cdd1c8aea99"
    ],
    "sampleExpectedTitles": [
      "প্রশ্ন (২৮/১৪৮) : কেউ ছালাতে শেষ বৈঠকে ভুলবশতঃ আত্তাহিইয়াতু..., দরূদ না পড়ে সালাম ফিরিয়ে দিলে তার",
      "প্রশ্ন (১৭) : জায়নামাযে বা মেঝেতে ময়লা থাকলে তা ছালাত অবস্থায় হাত দিয়ে কিংবা ফুঁক দিয়ে পরিষ্কার",
      "১৭৭৫. প্রশ্ন জনৈক ব্যক্তি মারা যাওয়ার পর তার পরিবারের লোকজন স্বেচ্ছায় চাচ্ছে যে, তার কাযা নামায ও "
    ]
  },
  {
    "id": 1002,
    "query": "tahajjud kivabe porbo",
    "type": "banglish",
    "titleKeywords": [
      "tahajjud kivabe porbo",
      "তাহাজ্জুদ কিভাবে পোড়বো",
      "ছালাত",
      "গুরুত্ব",
      "ফযীলত"
    ],
    "expectedIds": [
      "1b4826da-35e6-bf30-39d8-b58656748cca"
    ],
    "sampleExpectedTitles": [
      "ফজর ছালাত : গুরুত্ব ও ফযীলত"
    ]
  },
  {
    "id": 1003,
    "query": "কুকুর কাপড়ে মুখ দিলে",
    "type": "bengali",
    "titleKeywords": [
      "কুকুর কাপড়ে মুখ দিলে",
      "প্রশ্ন",
      "(১৩/৯৩)",
      "অবস্থায়",
      "(৩২):"
    ],
    "expectedIds": [
      "7b528214-05b9-da58-2cf6-83f58d7fbf97",
      "cdc7224f-2e51-e3af-54bc-eb92c26c5b29",
      "abfbdd7b-bb6b-c0dc-e700-92a0cad2ec33"
    ],
    "sampleExpectedTitles": [
      "প্রশ্ন (১৩/৯৩) : ওযূ অবস্থায় শরীরে বা কাপড়ে কুকুরের স্পর্শ লাগলে ওযূ ভেঙ্গে যাবে কি? এমতাবস্থায় ক",
      "প্রশ্ন (৩২): প্রশিক্ষণপ্রাপ্ত কুকুর ক্রয়-বিক্রয় করা যাবে কি?",
      "৬৯৬০. প্রশ্ন কুকুরের লালা কাপড়ে লাগলে তা কতবার ধৌত করলে পাক হবে?"
    ]
  },
  {
    "id": 1004,
    "query": "share market halal ki",
    "type": "banglish",
    "titleKeywords": [
      "share market halal ki",
      "শেয়ার বাজার হালাল কি",
      "প্রশ্ন",
      "(২৮/১০৮)",
      "দেশে"
    ],
    "expectedIds": [
      "01bd9c7a-b34c-0315-45e3-b285a87aa51a",
      "24d50e17-6bc0-d5e0-cd08-94fb750e1405",
      "3ae84a78-ff14-b87a-9aef-677f326525f2"
    ],
    "sampleExpectedTitles": [
      "প্রশ্ন (২৮/১০৮) : দেশে প্রচলিত শেয়ার বাজারের ব্যবসা শরী‘আতসম্মত কি?",
      "প্রশ্ন (৪৯): শেয়ার বাজারে কিছু টাকা একবছর আগে বিনিয়োগ করেছি। এখন দাম কমে যাওয়ায় লসের কারণে বিক্র",
      "২৯২২. প্রশ্ন শেয়ারবাজার সম্পর্কে সর্বশেষ সিদ্ধান্ত কী? বর্তমান শেয়ারবাজারে অংশগ্রহণ করা জায়েয কি "
    ]
  },
  {
    "id": 1005,
    "query": "soitaner waswasa theke bachar upay",
    "type": "banglish",
    "titleKeywords": [
      "soitaner waswasa theke bachar upay",
      "শয়তানের ওয়াসওয়াসা থেকে বাচার উপায়",
      "প্রশ্ন",
      "(১৩/১৭৩)",
      "জামা‘আতে"
    ],
    "expectedIds": [
      "cc3de0fb-fec1-26c9-2abb-dbe12b81f1ab",
      "b38502bd-1c45-74f3-47ba-b293ccf250c3",
      "283cbe02-8ee2-b150-33b4-17075e84a79c"
    ],
    "sampleExpectedTitles": [
      "প্রশ্ন (১৩/১৭৩) : জামা‘আতে ছালাতরত অবস্থায় শয়তানের ওয়াসওয়াসা থেকে বাঁচার উপায় কি?",
      "প্রশ্ন (১): অন্তরকে শয়তান এর ওয়াসওয়াসা থেকে মুক্ত রাখার উপায় কী?",
      "প্রশ্ন (২/৪০২) : যদি কেউ জেনে-শুনে পাপ কাজে লিপ্ত হয় এবং পরে আল্লাহর কাছে ক্ষমা চায়, তাহ’লে তার পা"
    ]
  }
]
```

## 5. Engineer Action Items
1. **Review Synonyms:** Inspect proposed clusters above. Ensure no semantic drift occurs (e.g. verifying distinction between Fard vs Sunnah rulings).
2. **Verify Golden Expectations:** Confirm the expected IDs point to authoritative rulings.
3. **Run Regression:** After manually pasting approved changes, verify relevance with:
   `npm run eval:search`
