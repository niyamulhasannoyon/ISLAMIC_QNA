export type Language = 'bn' | 'en' | 'ar';

export interface TranslationSchema {
  header: {
    brandTitle: string;
    brandShortTitle: string;
    brandSubtitle: string;
    archiveStatus: string;
    archiveStatusShort: string;
    toggleTheme: string;
    selectLanguage: string;
  };
  searchHero: {
    placeholder: string;
    shortcutHint: string;
    clearQuery: string;
    previewHeading: string;
    noPreviewResults: string;
    resultsFound: string;
    tookTime: string;
    popularInquiries: string;
    popularSuggestions: Array<{ text: string; category: string }>;
  };
  filters: {
    archiveLabel: string;
    categoryLabel: string;
    scholarLabel: string;
    allArchives: string;
    allCategories: string;
    allScholars: string;
  };
  cards: {
    questionLabel: string;
    answerLabel: string;
    readFull: string;
    collapse: string;
    copyLink: string;
    copied: string;
    viewSource: string;
    verifiedBadge: string;
    scholarBadge: string;
    openReaderModal: string;
  };
  modal: {
    readerTitle: string;
    fullAnswer: string;
    originalFatwa: string;
    tags: string;
    shaFingerprint: string;
    verifiedNotice: string;
    close: string;
    scholar: string;
    category: string;
    date: string;
  };
  empty: {
    noResultsTitle: string;
    noResultsHint: string;
    suggestedQueries: string;
    authenticArchiveTitle: string;
    authenticArchiveSubtitle: string;
    popularInquiries: string;
    suggestions: Array<{ text: string; desc: string }>;
  };
  pagination: {
    previous: string;
    next: string;
    pageOf: string;
  };
  footer: {
    archiveNotice: string;
    apiInfo: string;
  };
  notFound: {
    code: string;
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    backHome: string;
    popularTopicsTitle: string;
  };
}

export const translations: Record<Language, TranslationSchema> = {
  bn: {
    header: {
      brandTitle: "Deen QnA - ইসলামিক প্রশ্নোত্তর ও ফতোয়া",
      brandShortTitle: "Deen QnA",
      brandSubtitle: "/ আল-ইতিসাম • আত-তাহরীক • আলকাউসার",
      archiveStatus: "সংরক্ষণাগার সক্রিয়",
      archiveStatusShort: "লাইভ",
      toggleTheme: "থিম পরিবর্তন করুন",
      selectLanguage: "ভাষা নির্বাচন",
    },
    searchHero: {
      placeholder: "সহীহ ফতোয়া, প্রশ্ন বা বিষয়বস্তু খুঁজুন...",
      shortcutHint: "খুঁজতে চাপুন",
      clearQuery: "মুছুন",
      previewHeading: "তাৎক্ষণিক ফলাফল",
      noPreviewResults: "কোনো তাৎক্ষণিক ফলাফল নেই",
      resultsFound: "টি ফলাফল পাওয়া গেছে",
      tookTime: "মি.সে.",
      popularInquiries: "জনপ্রিয় অনুসন্ধান:",
      popularSuggestions: [
        { text: "সালাতে রাফউল ইয়াদাইন", category: "সালাত" },
        { text: "রোযায় ইনহেলার ব্যবহার", category: "সিয়াম" },
        { text: "প্রভিডেন্ট ফান্ডের যাকাত", category: "যাকাত" },
        { text: "বিটকয়েন ও ক্রিপ্টো ট্রেডিং", category: "লেনদেন" },
        { text: "তাবিজ ঝুলানো ও রুকইয়াহ", category: "আকীদাহ" },
        { text: "জুমুআর খুতবা মাতৃভাষায়", category: "সালাত" },
      ],
    },
    filters: {
      archiveLabel: "উৎস:",
      categoryLabel: "বিভাগ:",
      scholarLabel: "গবেষক / আলেম:",
      allArchives: "সকল উৎস",
      allCategories: "সকল বিভাগ",
      allScholars: "সকল আলেম",
    },
    cards: {
      questionLabel: "প্রশ্ন",
      answerLabel: "উত্তর",
      readFull: "সম্পূর্ণ ফতোয়া পড়ুন",
      collapse: "সংক্ষেপ করুন",
      copyLink: "লিংক কপি করুন",
      copied: "কপি হয়েছে",
      viewSource: "মূল ফতোয়া দেখুন",
      verifiedBadge: "SHA-256 ভেরিফাইড",
      scholarBadge: "মুফতী / আলেম",
      openReaderModal: "রিডার মোডে পড়ুন",
    },
    modal: {
      readerTitle: "ফতোয়া বিস্তারিত পাঠ",
      fullAnswer: "শরয়ী সমাধান ও দলীল",
      originalFatwa: "মূল উৎস দেখুন",
      tags: "ট্যাগসমূহ",
      shaFingerprint: "ক্রিপ্টোগ্রাফিক ফিঙ্গারপ্রিন্ট (SHA-256)",
      verifiedNotice: "এই ফতোয়াটি প্রশ্ন ও উত্তরের টেক্সট থেকে ক্রিপ্টোগ্রাফিক হ্যাশ দ্বারা অপরিবর্তনীয়ভাবে সুরক্ষিত।",
      close: "বন্ধ করুন (Esc)",
      scholar: "আলেম",
      category: "বিষয়",
      date: "তারিখ",
    },
    empty: {
      noResultsTitle: "কোনো ফলাফল পাওয়া যায়নি",
      noResultsHint: "বানান পরীক্ষা করুন অথবা বিকল্প মূল শব্দ দিয়ে অনুসন্ধান করুন।",
      suggestedQueries: "প্রস্তাবিত অনুসন্ধানসমূহ",
      authenticArchiveTitle: "যাচাইকৃত ইসলামিক গবেষণা আর্কাইভ",
      authenticArchiveSubtitle: "আল-ইতিসাম, আত-তাহরীক এবং মাসিক আলকাউসার থেকে সহীহ ফতোয়া ও সমাধান অনুসন্ধানে যেকোনো শব্দ টাইপ করুন",
      popularInquiries: "জনপ্রিয় অনুসন্ধান:",
      suggestions: [
        { text: "সালাতে রাফউল ইয়াদাইন", desc: "হাদীস ও ফিকহ বিধান" },
        { text: "রোযায় ইনহেলার ব্যবহার", desc: "চিকিৎসা ও সিয়াম" },
        { text: "প্রভিডেন্ট ফান্ডের যাকাত", desc: "চাকুরী ও সম্পদ" },
        { text: "বিটকয়েন ও ক্রিপ্টো ট্রেডিং", desc: "আধুনিক মুয়ামালাত" },
        { text: "তাবিজ ব্যবহার ও রুকইয়াহ", desc: "তাওহীদ ও শিরক" },
        { text: "জুমুআর খুতবা মাতৃভাষায়", desc: "মসজিদ ও সুন্নাহ" },
      ],
    },
    pagination: {
      previous: "পূর্ববর্তী",
      next: "পরবর্তী",
      pageOf: "পৃষ্ঠা",
    },
    footer: {
      archiveNotice: "ইসলামিক ফতোয়া ও গবেষণা আর্কাইভ • আল-ইতিসাম, আত-তাহরীক ও আলকাউসার সমন্বিত",
      apiInfo: "SHA-256 সুরক্ষিত ও যাচাইকৃত",
    },
    notFound: {
      code: "৪০৪",
      title: "পৃষ্ঠাটি পাওয়া যায়নি",
      subtitle: "আপনি যে ফতোয়া বা পৃষ্ঠাটি খুঁজছেন তা স্থানান্তরিত হয়েছে অথবা ইউআরএল (URL) টি সঠিক নয়।",
      searchPlaceholder: "সহীহ ফতোয়া, প্রশ্ন বা বিষয়বস্তু খুঁজুন...",
      backHome: "মূল পাতায় ফিরে যান",
      popularTopicsTitle: "অথবা জনপ্রিয় বিষয়সমূহ দেখুন:",
    },
  },

  en: {
    header: {
      brandTitle: "Deen QnA | Islamic Fatwa Archive",
      brandShortTitle: "Deen QnA",
      brandSubtitle: "/ Al-I'tisam • At-Tahreek • Al-Kawsar",
      archiveStatus: "Archive Active",
      archiveStatusShort: "Live",
      toggleTheme: "Toggle theme",
      selectLanguage: "Language",
    },
    searchHero: {
      placeholder: "Search authentic fatwas, questions or topics...",
      shortcutHint: "to search",
      clearQuery: "Clear",
      previewHeading: "Instant Previews",
      noPreviewResults: "No instant matches",
      resultsFound: "results found",
      tookTime: "ms",
      popularInquiries: "Popular Inquiries:",
      popularSuggestions: [
        { text: "Raf al-Yadayn in Salah", category: "Salah" },
        { text: "Inhaler use during fasting", category: "Fasting" },
        { text: "Zakat on provident fund", category: "Zakat" },
        { text: "Cryptocurrency & Bitcoin trading", category: "Finance" },
        { text: "Wearing amulets and Ruqyah", category: "Aqeedah" },
        { text: "Friday sermon in native language", category: "Salah" },
      ],
    },
    filters: {
      archiveLabel: "Archive:",
      categoryLabel: "Category:",
      scholarLabel: "Scholar / Mufti:",
      allArchives: "All Archives",
      allCategories: "All Categories",
      allScholars: "All Scholars",
    },
    cards: {
      questionLabel: "Question",
      answerLabel: "Answer",
      readFull: "Read Full Fatwa",
      collapse: "Collapse",
      copyLink: "Copy Link",
      copied: "Copied",
      viewSource: "Original Source",
      verifiedBadge: "SHA-256 Verified",
      scholarBadge: "Scholar",
      openReaderModal: "Open Reader",
    },
    modal: {
      readerTitle: "Editorial Reader",
      fullAnswer: "Scholarly Ruling & Evidence",
      originalFatwa: "View Source",
      tags: "Tags",
      shaFingerprint: "Cryptographic Fingerprint (SHA-256)",
      verifiedNotice: "This fatwa is immutably verified via SHA-256 cryptographic hash computed strictly over question and answer text.",
      close: "Close (Esc)",
      scholar: "Scholar",
      category: "Category",
      date: "Date",
    },
    empty: {
      noResultsTitle: "No records matched your search",
      noResultsHint: "Check the spelling or try broader Islamic terminology.",
      suggestedQueries: "Suggested Queries",
      authenticArchiveTitle: "Authentic Islamic Scholarly Index",
      authenticArchiveSubtitle: "Search peer-reviewed rulings and verified legal solutions from Al-I'tisam, At-Tahreek, and Al-Kawsar archives",
      popularInquiries: "Popular Inquiries:",
      suggestions: [
        { text: "Raf al-Yadayn in Salah", desc: "Hadith & Fiqh Ruling" },
        { text: "Inhaler use during fasting", desc: "Medical & Fasting" },
        { text: "Zakat on provident fund", desc: "Employment & Assets" },
        { text: "Cryptocurrency & Bitcoin trading", desc: "Modern Transactions" },
        { text: "Wearing amulets and Ruqyah", desc: "Tawheed & Superstition" },
        { text: "Friday sermon in native language", desc: "Sunnah & Mosque" },
      ],
    },
    pagination: {
      previous: "Previous",
      next: "Next",
      pageOf: "Page",
    },
    footer: {
      archiveNotice: "Islamic Fatwa & Research Archive • Aggregating Al-I'tisam, At-Tahreek & Al-Kawsar",
      apiInfo: "SHA-256 Verified & Idempotent",
    },
    notFound: {
      code: "404",
      title: "Page Not Found",
      subtitle: "The page or fatwa you are looking for has been moved or the URL is incorrect.",
      searchPlaceholder: "Search authentic fatwas, questions or topics...",
      backHome: "Back to Home",
      popularTopicsTitle: "Or explore popular topics:",
    },
  },

  ar: {
    header: {
      brandTitle: "Deen QnA | أرشيف الفتاوى والبحوث الإسلامية",
      brandShortTitle: "Deen QnA",
      brandSubtitle: "/ الاعتصام • التحريك • الكوثر",
      archiveStatus: "الأرشيف نشط",
      archiveStatusShort: "مباشر",
      toggleTheme: "تبديل المظهر",
      selectLanguage: "اللغة",
    },
    searchHero: {
      placeholder: "ابحث في الفتاوى الموثوقة والمسائل الشرعية...",
      shortcutHint: "للبحث",
      clearQuery: "مسح",
      previewHeading: "نتائج فورية",
      noPreviewResults: "لا توجد نتائج فورية",
      resultsFound: "نتيجة",
      tookTime: "مللي ثانية",
      popularInquiries: "أبرز المسائل الشائعة:",
      popularSuggestions: [
        { text: "رفع اليدين في الصلاة", category: "الصلاة" },
        { text: "استعمال بخاخ الربو للصائم", category: "الصيام" },
        { text: "زكاة صندوق الادخار والتقاعد", category: "الزكاة" },
        { text: "حكم تداول العملات الرقمية والبيتكوين", category: "المعاملات" },
        { text: "حكم تعليق التمائم والرقى", category: "العقيدة" },
        { text: "خطبة الجمعة باللغة المحلية", category: "الصلاة" },
      ],
    },
    filters: {
      archiveLabel: "المصدر:",
      categoryLabel: "القسم:",
      scholarLabel: "المفتي / الباحث:",
      allArchives: "جميع المصادر",
      allCategories: "جميع الأقسام",
      allScholars: "جميع العلماء",
    },
    cards: {
      questionLabel: "السؤال",
      answerLabel: "الجواب",
      readFull: "اقرأ الفتوى كاملة",
      collapse: "طي الفتوى",
      copyLink: "نسخ الرابط",
      copied: "تم النسخ",
      viewSource: "المصدر الأصلي",
      verifiedBadge: "موثق بتجزئة SHA-256",
      scholarBadge: "المفتي",
      openReaderModal: "فتح نافذة القراءة",
    },
    modal: {
      readerTitle: "نافذة القراءة والتوثيق الشرعي",
      fullAnswer: "الحكم الشرعي والأدلة",
      originalFatwa: "زيارة المصدر الأصلي",
      tags: "الكلمات الدلالية",
      shaFingerprint: "البصمة التشفيرية الرقمية (SHA-256)",
      verifiedNotice: "هذه الفتوى موثقة تشفيرياً ببصمة رقمية مستخرجة بدقة من نص السؤال والجواب لمنع أي تعديل أو تكرার.",
      close: "إغلاق (Esc)",
      scholar: "المفتي",
      category: "الموضوع",
      date: "التاريخ",
    },
    empty: {
      noResultsTitle: "لم يتم العثور على نتائج",
      noResultsHint: "يرجى التحقق من صحة الإملاء أو تجربة كلمات بحث أخرى.",
      suggestedQueries: "مسائل مقترحة للبحث",
      authenticArchiveTitle: "الأرشيف العلمي للفتاوى المعتمدة",
      authenticArchiveSubtitle: "ابحث في الفتاوى المحققة والحلول الشرعية من مجلات الاعتصام والتحريك والكوثر",
      popularInquiries: "المسائل الشائعة:",
      suggestions: [
        { text: "رفع اليدين في الصلاة", desc: "أحكام الفقه والحديث" },
        { text: "استعمال بخاخ الربو للصائم", desc: "الصيام والتداوي" },
        { text: "زكاة صندوق الادخار والتقاعد", desc: "الأموال والمعاشات" },
        { text: "حكم تداول العملات الرقمية والبيتكوين", desc: "المعاملات المعاصرة" },
        { text: "حكم تعليق التمائم والرقى", desc: "التوحيد والشرك" },
        { text: "خطبة الجمعة باللغة المحلية", desc: "السنة والمسجد" },
      ],
    },
    pagination: {
      previous: "السابق",
      next: "التالي",
      pageOf: "صفحة",
    },
    footer: {
      archiveNotice: "أرشيف الفتاوى والبحوث الإسلامية • جمع مجلات الاعتصام والتحريك والكوثر",
      apiInfo: "موثق بتجزئة SHA-256",
    },
    notFound: {
      code: "٤٠٤",
      title: "الصفحة غير موجودة",
      subtitle: "الصفحة أو الفتوى التي تبحث عنها غير موجودة أو تم نقلها أو أن الرابط غير صحيح.",
      searchPlaceholder: "ابحث في الفتاوى الموثوقة والمسائل الشرعية...",
      backHome: "العودة إلى الصفحة الرئيسية",
      popularTopicsTitle: "أو تصفح أبرز المواضيع الشائعة:",
    },
  },
};
