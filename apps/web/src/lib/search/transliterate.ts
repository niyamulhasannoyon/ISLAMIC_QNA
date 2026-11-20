/**
 * Professional Banglish (Latin Script) to Bengali Transliteration & Morphological Engine
 * 
 * Capabilities:
 * 1. Comprehensive Islamic Fiqh Lexicon (500+ terms & phrases)
 * 2. Banglish Morphological Analyzer (Suffix stripping & bidirectional Bengali inflection synthesis)
 * 3. Multi-word Banglish idiom / phrase recognition (e.g. "roja vanga", "bank interest", "ayatul kursi")
 * 4. Context-aware Avro/Ridmik phonetic engine for arbitrary out-of-vocabulary Latin text
 * 5. Unicode-safe vowel combinations & conjunct handling (যুক্তাক্ষর: ক্ত, প্র, স্ত, ম্প, ন্দ, ংক, etc.)
 */

// Curated Islamic dictionary mapping common Banglish spellings to Bengali canonical forms & variants
export const ISLAMIC_BANGLISH_DICT: Record<string, string[]> = {
  // === 1. Ablution & Purity (তাহারাত ও পবিত্রতা) ===
  'oju': ['ওযু', 'অজু', 'উযু', 'উজু', 'ওজু', 'ওযূ', 'উযূ'],
  'ojoo': ['ওযু', 'অজু', 'উযু', 'উজু'],
  'ojhu': ['ওযু', 'অজু', 'উযু'],
  'ozhu': ['ওযু', 'অজু', 'উযু'],
  'ozzu': ['ওযু', 'অজু'],
  'wudu': ['ওযু', 'অজু', 'উযু', 'উজু', 'ওজু', 'ওযূ', 'উযূ'],
  'wudhu': ['ওযু', 'অজু', 'উযু', 'উজু', 'ওযূ'],
  'wuzu': ['ওযু', 'অজু', 'উযু', 'উজু'],
  'wuzoo': ['ওযু', 'অজু', 'উযু'],
  'woodoo': ['ওযু', 'অজু', 'উযু'],
  'vudu': ['ওযু', 'অজু', 'উযু'],
  'ghusl': ['গোসল', 'ফরয গোসল', 'ফরজ গোসল', 'গোসলের'],
  'gusul': ['গোসল', 'ফরয গোসল', 'গোসলের'],
  'gosol': ['গোসল', 'ফরয গোসল', 'গোসলের'],
  'gochol': ['গোসল', 'গোসলের'],
  'kusal': ['গোসল', 'গোসলের'],
  'tayammum': ['তায়াম্মুম', 'তায়াম্মুম'],
  'tayamum': ['তায়াম্মুম', 'তায়াম্মুম'],
  'masah': ['মাসেহ', 'মাসাহ'],
  'maseh': ['মাসেহ', 'মাসাহ'],
  'moseho': ['মাসেহ'],
  'muzza': ['মোজা', 'মোজার উপর মাসেহ'],
  'muja': ['মোজা', 'মোজার উপর মাসেহ'],
  'moza': ['মোজা', 'মোজার উপর মাসেহ'],
  'napak': ['নাপাক', 'নাপাকী', 'অপবিত্র', 'নাজাসাত'],
  'napaki': ['নাপাকী', 'নাপাক', 'অপবিত্রতা'],
  'opobitro': ['অপবিত্র', 'নাপাক', 'নাপাকী'],
  'opobitrota': ['অপবিত্রতা', 'নাপাকী', 'নাজাসাত'],
  'najasa': ['নাজাসাত', 'নাপাকী'],
  'najasat': ['নাজাসাত', 'নাপাকী'],
  'haiz': ['হায়েয', 'হায়েজ', 'ঋতুস্রাব', 'মাসিক'],
  'haidh': ['হায়েয', 'হায়েজ', 'ঋতুস্রাব'],
  'hayez': ['হায়েয', 'হায়েজ', 'ঋতুস্রাব', 'মাসিক'],
  'hayes': ['হায়েয', 'হায়েজ'],
  'ritusrab': ['ঋতুস্রাব', 'হায়েয', 'মাসিক'],
  'masik': ['মাসিক', 'ঋতুস্রাব', 'হায়েয'],
  'period': ['মাসিক', 'ঋতুস্রাব', 'হায়েয'],
  'nifas': ['নিফাস', 'নেফাস', 'প্রসবোত্তর রক্তস্রাব'],
  'nefas': ['নিফাস', 'নেফাস', 'প্রসবোত্তর রক্তস্রাব'],
  'istihaza': ['ইস্তিহাযা', 'ইস্তিহাজা', 'মুস্তাহাযা', 'রক্তস্রাব'],
  'istihadha': ['ইস্তিহাযা', 'ইস্তিহাজা', 'মুস্তাহাযা'],
  'istihaja': ['ইস্তিহাযা', 'ইস্তিহাজা'],
  'mustahaza': ['মুস্তাহাযা', 'ইস্তিহাযা'],
  'mustahaja': ['মুস্তাহাযা', 'ইস্তিহাজা'],
  'mazur': ['মা‘যুর', 'মাযুর', 'উযর', 'ওজর'],
  'majur': ['মা‘যুর', 'মাযুর', 'উযর'],
  'ma\'zur': ['মা‘যুর', 'মাযুর'],
  'sadasrab': ['সাদাস্রাব', 'সাদা স্রাব', 'লিকুরিয়া'],
  'shadasrab': ['সাদাস্রাব', 'সাদা স্রাব'],
  'likuria': ['লিকুরিয়া', 'সাদাস্রাব'],
  'likuriya': ['লিকুরিয়া', 'সাদাস্রাব'],
  'tuhor': ['তুহর', 'পবিত্রতার কাল'],
  'tuhur': ['তুহর', 'পবিত্রতার কাল'],
  'istinza': ['ইস্তিঞ্জা', 'কুলুখ', 'পবিত্রতা'],
  'estinja': ['ইস্তিঞ্জা', 'পবিত্রতা'],
  'kuluk': ['কুলুখ', 'ঢিলা'],
  'dhila': ['ঢিলা', 'কুলুখ'],

  // === 2. Prayer & Salah (সালাত ও নামায) ===
  'namaj': ['নামাজ', 'নামায', 'সালাত', 'ছালাত'],
  'namaz': ['নামাজ', 'নামায', 'সালাত', 'ছালাত'],
  'salat': ['সালাত', 'ছালাত', 'নামাজ', 'নামায'],
  'solat': ['সালাত', 'ছালাত', 'নামাজ', 'নামায'],
  'salah': ['সালাত', 'ছালাত', 'নামাজ', 'নামায'],
  'shalaat': ['সালাত', 'ছালাত'],
  'sholat': ['সালাত', 'ছালাত'],
  'farz': ['ফরয', 'ফরজ', 'ফরয সালাত'],
  'fard': ['ফরয', 'ফরজ', 'ফরয সালাত'],
  'fardh': ['ফরয', 'ফরজ'],
  'foroz': ['ফরয', 'ফরজ'],
  'foroj': ['ফরয', 'ফরজ'],
  'wajib': ['ওয়াজিব', 'ওয়াজিব'],
  'owajib': ['ওয়াজিব', 'ওয়াজিব'],
  'oajeb': ['ওয়াজিব'],
  'sunnah': ['সুন্নাহ', 'সুন্নত', 'সুন্নাত'],
  'sunnat': ['সুন্নত', 'সুন্নাহ', 'সুন্নাত'],
  'nafl': ['নফল', 'নফল সালাত'],
  'nafal': ['নফল', 'নফল সালাত'],
  'nofol': ['নফল', 'নফল সালাত'],
  'tahajjud': ['তাহাজ্জুদ', 'তাহাজ্জুদের', 'কিয়ামুল লাইল'],
  'tahajut': ['তাহাজ্জুদ', 'কিয়ামুল লাইল'],
  'tahajjut': ['তাহাজ্জুদ', 'কিয়ামুল লাইল'],
  'tarabi': ['তারাবীহ', 'তারাবী', 'তারাবিহ', 'তারাবি'],
  'tarabih': ['তারাবীহ', 'তারাবিহ'],
  'taraweeh': ['তারাবীহ', 'তারাবিহ'],
  'tarawih': ['তারাবীহ', 'তারাবিহ'],
  'witr': ['বিতর', 'বেতের'],
  'bitor': ['বিতর', 'বেতের'],
  'beter': ['বিতর', 'বেতের'],
  'juma': ['জুমু‘আ', 'জুমা', 'জুমুআ'],
  'jumma': ['জুমু‘আ', 'জুমা', 'জুমুআ'],
  'jummah': ['জুমু‘আ', 'জুমা', 'জুমুআ'],
  'jumuah': ['জুমু‘আ', 'জুমুআ', 'জুমা'],
  'janaza': ['জানাযা', 'জানাজা', 'দাফন', 'কাফন'],
  'janazah': ['জানাযা', 'জানাজা'],
  'janaja': ['জানাযা', 'জানাজা'],
  'eid': ['ঈদ', 'ঈদের সালাত', 'ঈদুল ফিতর', 'ঈদুল আযহা'],
  'eed': ['ঈদ', 'ঈদের সালাত'],
  'eider': ['ঈদের', 'ঈদ'],
  'qasr': ['কসর', 'কছর', 'কসর সালাত'],
  'kasr': ['কসর', 'কছর'],
  'kasor': ['কসর', 'কছর সালাত'],
  'kashor': ['কসর', 'কছর'],
  'musafir': ['মুসাফির', 'সফর', 'মুসাফিরের সালাত'],
  'mushafir': ['মুসাফির', 'সফর'],
  'sofor': ['সফর', 'মুসাফির'],
  'shofor': ['সফর', 'মুসাফির'],
  'vromon': ['ভ্রমণ', 'সফর', 'মুসাফির'],
  'raful': ['রাফউল', 'রফউল', 'রাফয়ে'],
  'roful': ['রফউল', 'রাফউল'],
  'yadain': ['ইয়াদাইন', 'ইয়াদায়েন', 'হাত উঠানো'],
  'yadayein': ['ইয়াদায়েন', 'ইয়াদাইন'],
  'ameen': ['আমিন', 'আমীন', 'জোরে আমীন'],
  'amin': ['আমিন', 'আমীন'],
  'sajda': ['সিজদা', 'সেজদা', 'সিজদাহ', 'সাজদা'],
  'sajdah': ['সিজদা', 'সেজদা', 'সিজদাহ'],
  'sijda': ['সিজদা', 'সেজদা', 'সিজদাহ'],
  'sijdah': ['সিজদা', 'সেজদা', 'সিজদাহ'],
  'sejda': ['সেজদা', 'সিজদা'],
  'sujud': ['সিজদা', 'সেজদা'],
  'sahu': ['সাহু', 'সাহো', 'সেজদায়ে সাহু', 'সাহু সিজদা'],
  'saho': ['সাহো', 'সাহু', 'সেজদায়ে সাহু'],
  'shahu': ['সাহু', 'সাহো'],
  'boithok': ['বৈঠক', 'বসা', 'জালসা'],
  'jalsa': ['জালসা', 'বৈঠক', 'বসা'],
  'jalsaye': ['জালসায়ে', 'বৈঠকে'],
  'istirahat': ['ইস্তিরাহাত', 'জালসায়ে ইস্তিরাহাত', 'বিশ্রামের বৈঠক'],
  'istirahot': ['ইস্তিরাহাত', 'জালসায়ে ইস্তিরাহাত'],
  'rukuk': ['রুকু', 'রুকূ'],
  'ruku': ['রুকূ', 'রুকু'],
  'kauma': ['কওমা', 'সোজা হয়ে দাঁড়ানো'],
  'qawma': ['কওমা', 'সোজা হয়ে দাঁড়ানো'],
  'qiyam': ['কিয়াম', 'দাঁড়ানো'],
  'kiyam': ['কিয়াম', 'দাঁড়ানো'],
  'tashahhud': ['তাশাহহুদ', 'তাশাহ্হুদ', 'আত্তাহিয়্যাতু'],
  'attahiyatu': ['আত্তাহিয়্যাতু', 'তাশাহহুদ'],
  'attahiyyatu': ['আত্তাহিয়্যাতু', 'তাশাহহুদ'],
  'darood': ['দরূদ', 'দুরূদ', 'দরূদ শরীফ'],
  'durood': ['দুরূদ', 'দরূদ'],
  'salawat': ['দরূদ', 'সালাওয়াত'],
  'qunut': ['কুনূত', 'কুনুত', 'দোয়া কুনূত', 'বিতর'],
  'qunoot': ['কুনূত', 'কুনুত', 'দোয়া কুনূত'],
  'kunut': ['কুনূত', 'কুনুত'],
  'tilawat': ['তিলাওয়াত', 'তেলাওয়াত', 'তিলাওয়াতে সিজদা'],
  'telawat': ['তেলাওয়াত', 'তিলাওয়াত'],
  'masbuk': ['মাসবূক', 'মাসবুক'],
  'mashbuk': ['মাসবূক', 'মাসবুক'],
  'muqtadi': ['মুক্তাদী', 'মুকতাদী'],
  'muktadi': ['মুক্তাদী', 'মুকতাদী'],
  'imam': ['ইমাম', 'ইমামতি'],
  'imamot': ['ইমামতি', 'ইমাম'],
  'imamati': ['ইমামতি', 'ইমাম'],
  'jamat': ['জামাত', 'জামায়াত'],
  'jamayat': ['জামায়াত', 'জামাত'],
  'azaan': ['আযান', 'আজান'],
  'azan': ['আজান', 'আযান'],
  'ajan': ['আজান', 'আযান'],
  'iqamah': ['ইক্বামাত', 'ইকামত'],
  'iqamat': ['ইক্বামাত', 'ইকামত'],
  'iqamot': ['ইকামত', 'ইক্বামাত'],
  'ekamot': ['ইকামত', 'ইক্বামাত'],
  'qibla': ['কিবলা', 'ক্বিবলা'],
  'kibla': ['কিবলা', 'ক্বিবলা'],
  'satr': ['সতর', 'আওরাত'],
  'sotor': ['সতর', 'আওরাত'],
  'khutba': ['খুতবা', 'জুমার খুতবা'],
  'khutbah': ['খুতবা'],
  'istikhara': ['ইস্তিখারা', 'সালাতুল ইস্তিখারা'],
  'hajat': ['সালাতুল হাজত', 'হাজত'],
  'chast': ['চাশত', 'সালাতুদ দুহা'],
  'chasht': ['চাশত', 'সালাতুদ দুহা'],
  'dhuha': ['সালাতুদ দুহা', 'চাশত'],
  'ishraq': ['ইশরাক', 'সালাতুল ইশরাক'],
  'ishrak': ['ইশরাক'],
  'awwabin': ['আউয়াবিন', 'আউয়াবিন'],
  'awabin': ['আউয়াবিন'],
  'montojog': ['মনোযোগ', 'খুশু', 'খুজু', 'একাগ্রতা'],
  'monojog': ['মনোযোগ', 'খুশু'],
  'khushu': ['খুশু', 'মনোযোগ'],
  'masjid': ['মসজিদ', 'মসজিদে'],

  // === 3. Fasting & Ramadan (সিয়াম ও রমযান) ===
  'roja': ['রোজা', 'রোযা', 'সিয়াম', 'সিয়াম', 'সওম'],
  'roza': ['রোজা', 'রোযা', 'সিয়াম', 'সিয়াম', 'সওম'],
  'siam': ['সিয়াম', 'সিয়াম', 'রোজা', 'রোযা', 'সওম'],
  'siyam': ['সিয়াম', 'সিয়াম', 'রোজা', 'রোযা'],
  'saum': ['সওম', 'সিয়াম', 'রোজা'],
  'ramadan': ['রমযান', 'রমজান', 'মাহে রমজান'],
  'ramjan': ['রমজান', 'রমযান'],
  'romjan': ['রমজান', 'রমযান'],
  'sehri': ['সেহরী', 'সাহরী', 'সেহরি'],
  'sahri': ['সাহরী', 'সেহরী'],
  'suhur': ['সাহরী', 'সেহরী'],
  'iftar': ['ইফতার', 'ইফতারের'],
  'eftar': ['ইফতার'],
  'iftari': ['ইফতারী', 'ইফতার'],
  'itikaf': ['ই‘তিকাফ', 'ইতিকাফ', 'এতেকাফ'],
  'etekaf': ['ইতিকাফ', 'ই‘তিকাফ'],
  'qaza': ['কাযা', 'কাজা', 'কাযা রোজা'],
  'kaza': ['কাযা', 'কাজা'],
  'kaffara': ['কাফফারা'],
  'kaffarah': ['কাফফারা'],
  'fidya': ['ফিদয়া', 'ফিদয়াহ', 'ফিদইয়া'],
  'fidiah': ['ফিদয়া'],
  'shobe qadr': ['লাইলাতুল কদর', 'শবে কদর'],
  'laylatul qadr': ['লাইলাতুল কদর', 'শবে কদর'],
  'inhaler': ['ইনহেলার'],
  'inheler': ['ইনহেলার'],
  'inhailer': ['ইনহেলার'],
  'injection': ['ইনজেকশন', 'ইনজেকশান', 'ইনসুলিন', 'টিকা'],
  'injekshon': ['ইনজেকশন', 'ইনজেকশান'],
  'injekson': ['ইনজেকশন'],
  'tika': ['টিকা', 'ইনজেকশন', 'ভ্যাকসিন'],
  'vaccine': ['ভ্যাকসিন', 'টিকা', 'ইনজেকশন'],
  'saline': ['স্যালাইন'],
  'selain': ['স্যালাইন'],
  'insulin': ['ইনসুলিন', 'ইনজেকশন'],
  'dhumpan': ['ধূমপান', 'ধুমপান', 'বিড়ি', 'সিগারেট'],
  'dhum': ['ধূমপান', 'ধুমপান'],
  'biri': ['বিড়ি', 'বিড়ি', 'সিগারেট', 'ধূমপান'],
  'cigarette': ['সিগারেট', 'বিড়ি', 'ধূমপান'],
  'sigaret': ['সিগারেট', 'বিড়ি'],
  'miswak': ['মিসওয়াক', 'মেসওয়াক'],
  'meswak': ['মেসওয়াক', 'মিসওয়াক'],

  // === 4. Zakat & Charity (যাকাত ও সাদাকাহ) ===
  'zakat': ['যাকাত', 'জাকাত', 'ফিতরা'],
  'jakat': ['যাকাত', 'জাকাত', 'ফিতরা'],
  'zakaat': ['যাকাত', 'জাকাত'],
  'fitra': ['ফিতরা', 'ফিৎরা', 'যাকাতুল ফিতর', 'সাদাকাতুল ফিতর'],
  'fitrah': ['ফিতরা', 'সাদাকাহ'],
  'fetra': ['ফিতরা', 'ফিৎরা'],
  'sadqah': ['সাদাকাহ', 'সদকা', 'দান'],
  'sadaqah': ['সাদাকাহ', 'সদকা'],
  'sodka': ['সদকা', 'সাদাকাহ'],
  'dan': ['দান', 'সাদাকাহ'],
  'nisab': ['নিসাব'],
  'nesab': ['নিসাব'],
  'ushr': ['উশর'],
  'oshor': ['উশর'],
  'shorno': ['স্বর্ণ', 'সোনা'],
  'shona': ['সোনা', 'স্বর্ণ', 'শোনা', 'শ্রবণ'],
  'gold': ['স্বর্ণ', 'সোনা'],
  'rupa': ['রূপা', 'রুপা'],
  'silver': ['রূপা', 'রুপা'],
  'maal': ['সম্পদ', 'মাল'],
  'sompotti': ['সম্পদ', 'সম্পত্তি'],

  // === 5. Hajj, Umrah & Sacrifice (হজ ও কুরবানী) ===
  'hajj': ['হজ', 'হজ্জ', 'উমরাহ', 'ওমরাহ'],
  'haj': ['হজ', 'হজ্জ'],
  'umrah': ['উমরাহ', 'ওমরাহ', 'উমরা'],
  'omrah': ['ওমরাহ', 'উমরাহ'],
  'ihram': ['ইহরাম'],
  'ehram': ['ইহরাম'],
  'tawaf': ['তাওয়াফ', 'তওয়াফ'],
  'sai': ['সাঈ', 'সাফা-মারওয়া'],
  'saee': ['সাঈ'],
  'arafah': ['আরাফাহ', 'আরাফাত'],
  'arafat': ['আরাফাত', 'আরাফাহ'],
  'mina': ['মিনা'],
  'muzdalifah': ['মুযদালিফাহ'],
  'qurbani': ['কুরবানী', 'কোরবানী', 'কোরবানি', 'কুরবানি'],
  'kurbani': ['কুরবানী', 'কোরবানী', 'কুরবানি'],
  'korbani': ['কোরবানী', 'কুরবানী'],
  'akika': ['আকীকা', 'আক্বীক্বা', 'আকিকা'],
  'akikah': ['আকীকা', 'আক্বীক্বা'],
  'aqiqah': ['আকীকা', 'আক্বীক্বা'],
  'chagol': ['ছাগল', 'খাসী', 'ভেড়া', 'পশু'],
  'khasi': ['খাসী', 'ছাগল'],
  'bhera': ['ভেড়া', 'দুম্বা'],
  'dumba': ['দুম্বা', 'ভেড়া'],
  'goru': ['গরু', 'পশু'],
  'poshu': ['পশু', 'কুরবানী'],

  // === 6. Family, Marriage & Modesty (পরিবার, বিবাহ ও পর্দা) ===
  'biye': ['বিবাহ', 'বিয়ে', 'নিকাহ'],
  'bibaho': ['বিবাহ', 'বিয়ে'],
  'nikah': ['নিকাহ', 'বিবাহ', 'বিয়ে'],
  'shadi': ['বিবাহ', 'বিয়ে'],
  'mahr': ['মহর', 'দেনমোহর'],
  'denmohor': ['দেনমোহর', 'মহর'],
  'mohor': ['মহর', 'দেনমোহর'],
  'talaq': ['তালাক', 'ইদ্দত', 'খোলা'],
  'talak': ['তালাক', 'ইদ্দত'],
  'divorce': ['তালাক', 'বিবাহ বিচ্ছেদ'],
  'khula': ['খোলা', 'খোলা তালাক'],
  'khola': ['খোলা তালাক', 'তালাক'],
  'iddat': ['ইদ্দত'],
  'eddat': ['ইদ্দত'],
  'porda': ['পর্দা', 'হিজাব', 'নিকাব', 'বোরকা'],
  'pordah': ['পর্দা', 'হিজাব'],
  'hijab': ['হিজাব', 'পর্দা', 'বোরকা'],
  'niqab': ['নিকাব', 'নেকাব'],
  'burqa': ['বোরকা', 'বোরখা', 'হিজাব'],
  'borkha': ['বোরখা', 'বোরকা'],
  'dari': ['দাড়ি', 'দাঁড়ি', 'দাড়ি রাখা', 'দাড়ি কাটা'],
  'daari': ['দাড়ি', 'দাঁড়ি'],
  'daree': ['দাড়ি', 'দাঁড়ি'],
  'shev': ['শেভ', 'দাড়ি কাটা', 'দাড়ি মুণ্ডন'],
  'shave': ['শেভ', 'মুণ্ডন'],
  'gof': ['গোঁফ', 'মোচ'],
  'moch': ['মোচ', 'গোঁফ'],
  'porokiya': ['পরকীয়া', 'যিনা', 'ব্যাভিচার', 'অবৈধ সম্পর্ক'],
  'zina': ['যিনা', 'জিনা', 'ব্যাভিচার'],
  'jina': ['যিনা', 'জিনা'],
  'byabhichar': ['ব্যাভিচার', 'যিনা'],
  'prem': ['প্রেম', 'পরকীয়া', 'অবৈধ সম্পর্ক'],
  'chele': ['ছেলে', 'পুত্র', 'পুত্র সন্তান'],
  'putro': ['পুত্র', 'ছেলে'],
  'meye': ['মেয়ে', 'মেয়ে', 'কন্যা', 'কন্যা সন্তান'],
  'konna': ['কন্যা', 'মেয়ে'],
  'shami': ['স্বামী', 'স্বামী'],
  'swami': ['স্বামী'],
  'stri': ['স্ত্রী', 'স্ত্রী'],
  'bou': ['স্ত্রী', 'বউ'],
  'baba': ['বাবা', 'পিতা'],
  'pita': ['পিতা', 'বাবা'],
  'ma': ['মা', 'মাতা'],
  'mata': ['মাতা', 'মা'],
  'sontan': ['সন্তান', 'বাচ্চা'],

  // === 7. Finance & Muamalat (লেনদেন ও অর্থনীতি) ===
  'sud': ['সুদ', 'রিবা', 'সুদী', 'মুনাফা'],
  'sood': ['সুদ', 'রিবা'],
  'riba': ['রিবা', 'সুদ'],
  'interest': ['সুদ', 'রিবা', 'ব্যাংক মুনাফা'],
  'sudkhor': ['সুদখোর', 'সুদ গ্রহীতা'],
  'bank': ['ব্যাংক', 'ব্যাংকিং'],
  'banking': ['ব্যাংকিং', 'ব্যাংক'],
  'share': ['শেয়ার', 'স্টক', 'শেয়ার বাজার'],
  'stock': ['স্টক', 'শেয়ার'],
  'invest': ['বিনিয়োগ', 'ইনভেস্ট'],
  'biniyog': ['বিনিয়োগ', 'হালাল বিনিয়োগ'],
  'crypto': ['ক্রিপ্টো', 'ক্রিপ্টোকারেন্সি', 'বিটকয়েন'],
  'bitcoin': ['বিটকয়েন', 'ক্রিপ্টো'],
  'btc': ['বিটকয়েন', 'ক্রিপ্টো'],
  'insurance': ['বীমা', 'ইনস্যুরেন্স'],
  'bima': ['বীমা', 'ইনস্যুরেন্স'],
  'chakri': ['চাকরি', 'চাকরিজীবী', 'চাকুরীর বিধান'],
  'chakuri': ['চাকরি', 'চাকুরী'],
  'babsha': ['ব্যবসা', 'বাণিজ্য', 'বেচাকেনা'],
  'karbar': ['কারবার', 'ব্যবসা'],
  'mudaraba': ['মুদারাবা', 'বিনিয়োগ'],
  'musharaka': ['মুশারাকা', 'অংশীদারি ব্যবসা'],
  'shomporko': ['সম্পর্ক', 'সম্পর্কিত'],
  'somporko': ['সম্পর্ক', 'সম্পর্কিত'],

  // === 8. Belief, Scripture & Satan (আকীদাহ, কুরআন ও শয়তান) ===
  'allah': ['আল্লাহ', 'রব'],
  'rab': ['রব', 'আল্লাহ'],
  'khoda': ['খোদা', 'আল্লাহ'],
  'nobiji': ['নবীজি', 'রাসূল', 'মুহাম্মাদ'],
  'rasul': ['রাসূল', 'নবীজি', 'মুহাম্মাদ'],
  'prophet': ['নবী', 'রাসূল'],
  'muhammad': ['মুহাম্মাদ', 'রাসূলুল্লাহ'],
  'sahabi': ['সাহাবী', 'সাহাবায়ে কেরাম'],
  'sahaba': ['সাহাবায়ে কেরাম', 'সাহাবী'],
  'quran': ['কুরআন', 'কুর‘আন', 'কোরআন', 'কোরান', 'মুসহাফ'],
  'koran': ['কুরআন', 'কুর‘আন', 'কোরআন'],
  'mushaf': ['মুসহাফ', 'কুরআন'],
  'hadis': ['হাদীস', 'হাদিস', 'হাদীছ', 'হাদিছ'],
  'hadith': ['হাদীস', 'হাদিস', 'হাদীছ'],
  'hadees': ['হাদীস', 'হাদিস'],
  'bukhari': ['বুখারী', 'সহীহ বুখারী'],
  'muslim': ['মুসলিম', 'সহীহ মুসলিম'],
  'tirmizi': ['তিরমিযী'],
  'abu dawood': ['আবু দাউদ'],
  'surah': ['সূরা', 'সুরা'],
  'sura': ['সূরা', 'সুরা'],
  'fatiha': ['ফাতিহা', 'ফাতেহা'],
  'fateha': ['ফাতিহা', 'ফাতেহা'],
  'ayat': ['আয়াত', 'আয়াত'],
  'ayath': ['আয়াত'],
  'dua': ['দু‘আ', 'দুআ', 'দোয়া', 'দোয়া', 'মুনাজাত'],
  'doa': ['দোয়া', 'দোয়া', 'দু‘আ', 'দুআ'],
  'doya': ['দোয়া', 'দোয়া', 'দু‘আ'],
  'munajat': ['মুনাজাত', 'দু‘আ', 'দোয়া'],
  'shirk': ['শিরক', 'শিরিক'],
  'shirik': ['শিরিক', 'শিরক'],
  'kufr': ['কুফর', 'কুফরী'],
  'kufri': ['কুফরী', 'কুফর'],
  'bidat': ['বিদ‘আত', 'বিদআত', 'বিদাত', 'বেদাত'],
  'bidah': ['বিদ‘আত', 'বিদআত'],
  'bedat': ['বেদাত', 'বিদ‘আত'],
  'tabiz': ['তাবিজ', 'তাভীয', 'কবজ', 'রুকইয়াহ'],
  'tabij': ['তাবিজ', 'তাভীয', 'কবজ', 'রুকইয়াহ'],
  'kabaj': ['কবজ', 'তাবিজ'],
  'ruqyah': ['রুকইয়াহ', 'ঝাড়ফুঁক', 'রুকিয়া'],
  'rukia': ['রুকইয়াহ', 'রুকিয়া'],
  'soitan': ['শয়তান', 'শয়তান', 'ইবলিস', 'শয়তানের'],
  'shaitan': ['শয়তান', 'শয়তান', 'ইবলিস', 'শয়তানের'],
  'soytan': ['শয়তান', 'শয়তান', 'ইবলিস'],
  'iblis': ['ইবলিস', 'শয়তান'],
  'waswasa': ['ওয়াসওয়াসা', 'ওয়াসওয়াসা', 'শয়তানের কুমন্ত্রণা', 'কুচিন্তা', 'সংশয়'],
  'waswasah': ['ওয়াসওয়াসা', 'ওয়াসওয়াসা'],
  'kuchinta': ['কুচিন্তা', 'ওয়াসওয়াসা', 'সংশয়'],
  'kumontrona': ['কুমন্ত্রণা', 'ওয়াসওয়াসা'],
  'dhoka': ['ধোঁকা', 'ধোকা', 'প্রতারণা', 'ওয়াসওয়াসা'],
  'dhokah': ['ধোঁকা', 'ধোকা'],
  'dhokai': ['ধোঁকা', 'ধোকায়', 'ধোঁকায়'],
  'jinn': ['জিন', 'জীন', 'জ্বীন'],
  'jin': ['জিন', 'জীন', 'জ্বীন'],
  'jadu': ['জাদু', 'যাদু', 'জাদুটোনা'],
  'yadu': ['যাদু', 'জাদু'],
  'tona': ['জাদুটোনা', 'জাদু'],
  'gunah': ['গুনাহ', 'গোনাহ', 'পাপ', 'ক্ষমা'],
  'gonah': ['গোনাহ', 'গুনাহ', 'পাপ'],
  'pap': ['পাপ', 'গুনাহ', 'কবীরা গুনাহ'],
  'tawbah': ['তাওবাহ', 'তওবা', 'ইস্তিগফার'],
  'toba': ['তওবা', 'তাওবাহ'],
  'touba': ['তাওবাহ', 'তওবা'],
  'istighfar': ['ইস্তিগফার', 'এস্তেগফার'],
  'jannat': ['জান্নাত', 'বেহেশত'],
  'behest': ['বেহেশত', 'জান্নাত'],
  'jahannam': ['জাহান্নাম', 'দোযখ'],
  'dojok': ['দোযখ', 'জাহান্নাম'],
  'qiyamat': ['কিয়ামত', 'ক্বিয়ামত', 'আখেরাত'],
  'kiamat': ['কিয়ামত', 'ক্বিয়ামত'],
  'akherat': ['আখেরাত', 'পরকাল'],
  'halal': ['হালাল', 'বৈধ'],
  'jaiz': ['জায়েজ', 'জায়েয', 'জায়েয', 'বৈধ'],
  'jayez': ['জায়েয', 'জায়েয', 'জায়েজ'],
  'boidho': ['বৈধ', 'হালাল'],
  'haram': ['হারাম', 'অবৈধ', 'নাজায়েজ'],
  'najaiz': ['নাজায়েজ', 'নাজায়েয', 'নাজায়েয', 'অবৈধ', 'হারাম'],
  'najayez': ['নাজায়েয', 'নাজায়েজ', 'হারাম'],
  'makruh': ['মাকরূহ', 'মাকরুহ'],
  'makroo': ['মাকরূহ'],
  'sahih': ['সহীহ', 'সহিহ'],
  'sohih': ['সহীহ', 'সহিহ'],
  'zaif': ['যঈফ', 'জয়ীফ', 'দুর্বল'],
  'daif': ['যঈফ', 'দুর্বল'],
  'masala': ['মাসআলা', 'মাসয়ালা', 'মাসলা'],
  'maslah': ['মাসআলা', 'মাসলা'],
  'masla': ['মাসআলা', 'মাসলা', 'বিধান'],
  'fatwa': ['ফতোয়া', 'ফতোয়া', 'বিধান'],
  'fatwah': ['ফতোয়া', 'ফতোয়া'],
  'iman': ['ঈমান', 'ইমান'],
  'eman': ['ঈমান', 'ইমান'],
  'tawhid': ['তাওহীদ', 'তাওহিদ'],
  'tawheed': ['তাওহীদ', 'তাওহিদ'],

  // === 9. Body, Clothes & Impurities (শরীর, পোশাক ও নাপাকী) ===
  'kapor': ['কাপড়', 'কাপড়', 'পোশাক', 'বস্ত্র'],
  'kapod': ['কাপড়', 'কাপড়'],
  'kukur': ['কুকুর', 'কুকুরের'],
  'lala': ['লালা', 'মুখের লালা'],
  'rokto': ['রক্ত', 'রক্তপাত'],
  'chul': ['চুল', 'কেশ'],
  'rong': ['রং', 'রঙ', 'কলপ'],
  'mehendi': ['মেহেদি', 'মেহেন্দী'],
  'dant': ['দাঁত'],
  'nak': ['নাক'],
  'kan': ['কান'],
  'hath': ['হাত', 'হাতে'],
  'hat': ['হাত', 'হাতে'],
  'pa': ['পা', 'পায়ে'],
  'buk': ['বুক', 'বুকে'],
  'buke': ['বুকে', 'বুকের উপর'],
  'nabi': ['নাভি', 'নাভী'],
  'nabhi': ['নাভি', 'নাভী'],
  'niche': ['নিচে', 'নীচে'],
  'neeche': ['নিচে', 'নীচে'],
  'upor': ['উপর', 'উপরে'],
  'upore': ['উপরে', 'উপর'],
  'opor': ['উপর', 'উপরে'],
  'mukh': ['মুখ', 'চেহারা'],
  'mukhe': ['মুখে', 'মুখের'],
  'pani': ['পানি', 'পানির'],

  // === 10. Query Verbs & Inflections (ক্রিয়া ও অনুসর্গ) ===
  'vanga': ['ভাঙা', 'ভাঙ্গা', 'নষ্ট', 'ভঙ্গ'],
  'bhanga': ['ভাঙা', 'ভাঙ্গা', 'ভঙ্গ'],
  'vange': ['ভাঙে', 'ভাঙ্গে', 'নষ্ট হয়', 'ভঙ্গ হয়'],
  'bhenge': ['ভেঙে', 'ভাঙলে', 'ভঙ্গ হলে'],
  'venge': ['ভেঙে', 'ভাঙলে', 'ভঙ্গ হলে'],
  'vangar': ['ভাঙার', 'ভাঙ্গার', 'ভঙ্গের'],
  'bhangar': ['ভাঙার', 'ভাঙ্গার'],
  'vangle': ['ভাঙলে', 'ভাঙ্গলে', 'ভঙ্গ হলে'],
  'bhengle': ['ভাঙলে', 'ভেঙে গেলে'],
  'kora': ['করা'],
  'kore': ['করে'],
  'korle': ['করলে', 'করার'],
  'korar': ['করার', 'পড়ার'],
  'korte': ['করতে'],
  'kori': ['করি'],
  'pora': ['পড়া', 'পড়া', 'তিলাওয়াত'],
  'pore': ['পরে', 'পর', 'পড়ে', 'পড়ে'],
  'porle': ['পড়লে', 'পড়লে'],
  'porar': ['পড়ার', 'পড়ার', 'তিলাওয়াতের'],
  'porte': ['পড়তে', 'পড়তে'],
  'rakha': ['রাখা', 'রাখার'],
  'rakhe': ['রাখে'],
  'rakhle': ['রাখলে'],
  'rakhar': ['রাখার', 'রাখা'],
  'rakhte': ['রাখতে'],
  'dewa': ['দেওয়া', 'দেওয়া', 'প্রদান'],
  'deya': ['দেয়া', 'দেওয়া', 'দেওয়া'],
  'dile': ['দিলে', 'প্রদান করলে'],
  'deyar': ['দেওয়ার', 'দেওয়ার'],
  'dite': ['দিতে'],
  'neya': ['নেওয়া', 'নেওয়া', 'গ্রহণ'],
  'newa': ['নেওয়া', 'নেওয়া'],
  'nile': ['নিলে', 'গ্রহণ করলে'],
  'neyar': ['নেয়ার', 'নেওয়ার', 'নেওয়ার'],
  'nite': ['নিতে'],
  'khawa': ['খাওয়া', 'খাওয়া', 'পানাহার'],
  'kheye': ['খেয়ে', 'খেয়ে'],
  'khele': ['খেলে', 'পানাহার করলে'],
  'khawar': ['খাওয়ার', 'খাওয়ার', 'পানাহারের'],
  'chara': ['ছাড়া', 'ছাড়া', 'ব্যতীত'],
  'chada': ['ছাড়া', 'ছাড়া', 'ব্যতীত'],
  'bina': ['বিনা', 'ছাড়া', 'ব্যতীত'],
  'badha': ['বাঁধা', 'বাধা'],
  'badhar': ['বাঁধার', 'বাধার'],
  'bada': ['বাঁধা', 'বাধা'],
  'kata': ['কাটা', 'ছাঁটা', 'মুণ্ডন'],
  'katar': ['কাটার', 'ছাঁটার'],
  'katle': ['কাটলে', 'ছাঁটলে'],
  'dhora': ['ধরা', 'স্পর্শ', 'স্পর্শ করা'],
  'chowa': ['ছোঁয়া', 'স্পর্শ'],
  'dekha': ['দেখা', 'দৃষ্টি'],

  // === 11. Intent, Prepositions & Question Words ===
  'niyom': ['নিয়ম', 'নিয়ম', 'পদ্ধতি', 'বিধান'],
  'poddhoti': ['পদ্ধতি', 'নিয়ম'],
  'bidhan': ['বিধান', 'হুকুম', 'শারয়ী বিধান'],
  'hukom': ['হুকুম', 'বিধান'],
  'hobe': ['হবে', 'হবে কি'],
  'hobe ki': ['হবে কি', 'হবে কিনা'],
  'hobe kina': ['হবে কিনা', 'হবে কি'],
  'hoy': ['হয়', 'হয়'],
  'hole': ['হলে', 'হওয়ার পর'],
  'jabe': ['যাবে', 'যাবে কি'],
  'jabe ki': ['যাবে কি', 'যাবে কিনা'],
  'jabe kina': ['যাবে কিনা', 'যাবে কি'],
  'jay': ['যায়', 'যায়'],
  'jay kina': ['যায় কিনা', 'যায় কি'],
  'ki': ['কি', 'কী'],
  'kee': ['কি', 'কী'],
  'karon': ['কারণ', 'হেতু'],
  'keno': ['কেন'],
  'kobe': ['কবে'],
  'kothay': ['কোথায়', 'কোথায়'],
  'kivabe': ['কিভাবে', 'কীভাবে', 'পদ্ধতি', 'নিয়ম'],
  'ki bhabe': ['কিভাবে', 'কীভাবে'],
  'kina': ['কিনা'],
  'koyta': ['কয়টা', 'কয়টা', 'কয়টি', 'কয়টি', 'সংখ্যা'],
  'koyti': ['কয়টি', 'কয়টি', 'কয়টা', 'সংখ্যা'],
  'kototi': ['কতটি', 'কতটা'],
  'koto': ['কত', 'কতটি', 'পরিমাণ'],
  'dui': ['দুই', 'দুটি'],
  'duto': ['দুটো', 'দুই'],
  'ek': ['এক', 'একটি'],
  'tin': ['তিন', 'তিনটি'],
  'char': ['চার', 'চারটি'],
  'pach': ['পাঁচ', 'পাঁচটি'],
  'prothom': ['প্রথম'],
  'protom': ['প্রথম'],
  'ditio': ['দ্বিতীয়', 'দ্বিতীয়'],
  'ditiyo': ['দ্বিতীয়', 'দ্বিতীয়'],
  'tritio': ['তৃতীয়', 'তৃতীয়'],
  'tritiyo': ['তৃতীয়', 'তৃতীয়'],
  'somoy': ['সময়', 'সময়'],
  'shomoy': ['সময়', 'সময়'],
  'age': ['আগে', 'পূর্বে'],
  'purbe': ['পূর্বে', 'আগে'],
  'por': ['পর', 'পরে'],
  'sese': ['শেষে', 'পর'],
  'shese': ['শেষে', 'পর'],
  'majhe': ['মাঝে', 'মধ্যে'],
  'majher': ['মাঝের', 'মধ্যবর্তী'],
  'moddhe': ['মধ্যে', 'মাঝে'],
  'moddho': ['মধ্যবর্তী', 'মাঝের'],
  'obosthay': ['অবস্থায়', 'অবস্থায়'],
  'obostha': ['অবস্থা', 'অবস্থায়'],
  'theke': ['থেকে', 'হতে'],
  'mukti': ['মুক্তি', 'পরিত্রাণ', 'বাঁচবে'],
  'valo': ['ভালো', 'উত্তম'],
  'bhalo': ['ভালো', 'উত্তম'],
  'kharap': ['খারাপ', 'মন্দ'],
  'shothik': ['সঠিক', 'বিশুদ্ধ'],
  'sothik': ['সঠিক', 'বিশুদ্ধ'],
  'bhul': ['ভুল', 'ভুলবশত'],
  'rakat': ['রাকাত', 'রাকআত', 'রাকাআত'],
  'rakater': ['রাকাতের', 'রাকাআতের'],
};

// Curated Multi-Word Banglish Phrases:
// Maps exact Banglish phrase patterns to precise Bengali replacement and expanded concepts
const ISLAMIC_BANGLISH_PHRASES: Array<{
  pattern: RegExp;
  replacement: string;
  concepts: string[];
}> = [
  // Ablution
  {
    pattern: /\b(?:wudur|ojur|wudhur|wuzur)\s+niyom\b/gi,
    replacement: 'ওযুর নিয়ম',
    concepts: ['ওযুর নিয়ম', 'অজুর নিয়ম', 'তাহারাত', 'পবিত্রতা'],
  },
  {
    pattern: /\b(?:wudur|ojur)\s+foroj\b/gi,
    replacement: 'ওযুর ফরয',
    concepts: ['ওযুর ফরয', 'অজুর ফরজ', 'ওযুর অঙ্গ'],
  },
  {
    pattern: /\b(?:wudu|oju)\s+(?:vangar|bhangar)\b/gi,
    replacement: 'ওযু ভাঙার',
    concepts: ['ওযু ভঙ্গের কারণ', 'অজু ভাঙার কারণ', 'ওযু নষ্ট'],
  },
  {
    pattern: /\b(?:wudu|oju)\s+(?:vanga|bhanga)\b/gi,
    replacement: 'ওযু ভাঙা',
    concepts: ['ওযু ভঙ্গের কারণ', 'অজু ভাঙার কারণ', 'ওযু নষ্ট'],
  },
  {
    pattern: /\b(?:wudu|oju)\s+(?:vange|bhenge|venge)\b/gi,
    replacement: 'ওযু ভাঙে',
    concepts: ['ওযু ভঙ্গের কারণ', 'ওযু নষ্ট'],
  },
  {
    pattern: /\b(?:biri|cigarette|sigaret)\s+(?:khele|khawa)\b/gi,
    replacement: 'সিগারেট খেলে',
    concepts: ['ধূমপান', 'সিগারেট খেলে', 'বিড়ি খেলে', 'বিড়ি'],
  },

  // Prayer
  {
    pattern: /\bnamaje?\s+(?:montojog|monojog)\b/gi,
    replacement: 'নামাজে মনোযোগ',
    concepts: ['নামাজে মনোযোগ', 'সালাতে একাগ্রতা', 'খুশু খুজু', 'ওয়াসওয়াসা'],
  },
  {
    pattern: /\bnamajer?\s+somoy\b/gi,
    replacement: 'নামাজের সময়',
    concepts: ['নামাজের সময়', 'সালাতের ওয়াক্ত'],
  },
  {
    pattern: /\b(?:sijdah|sajda|sijda)\s+sahu\b/gi,
    replacement: 'সিজদায়ে সাহু',
    concepts: ['সিজদায়ে সাহু', 'সাহু সিজদা', 'সেজদায়ে সাহু'],
  },
  {
    pattern: /\b(?:buke|buker)\s+(?:hath|hat)\s+(?:badha|badhar)\b/gi,
    replacement: 'বুকে হাত বাঁধা',
    concepts: ['বুকে হাত বাঁধা', 'বুকের উপর হাত রাখা', 'তাকবীরে তাহরীমা'],
  },
  {
    pattern: /\b(?:nabir|nabhir)\s+(?:niche|neeche)\s+(?:hath|hat)\b/gi,
    replacement: 'নাভির নিচে হাত',
    concepts: ['নাভির নিচে হাত বাঁধা', 'বুকের উপর হাত রাখা'],
  },
  {
    pattern: /\bdua\s+(?:qunoot|qunut|kunut)\b/gi,
    replacement: 'দোয়া কুনূত',
    concepts: ['দোয়া কুনূত', 'বিতর সালাত', 'কুনূত'],
  },
  {
    pattern: /\bayatul\s+kursi\b/gi,
    replacement: 'আয়াতুল কুরসি',
    concepts: ['আয়াতুল কুরসি', 'আয়াতুল কুরসী', 'কুরআন'],
  },
  {
    pattern: /\bsurah\s+(?:fatiha|fateha)\b/gi,
    replacement: 'সূরা ফাতিহা',
    concepts: ['সূরা ফাতিহা', 'সূরা ফাতেহা', 'আলহামদু সূরা'],
  },
  {
    pattern: /\btahajjut?\s+namaj\b/gi,
    replacement: 'তাহাজ্জুদ সালাত',
    concepts: ['তাহাজ্জুদ সালাত', 'কিয়ামুল লাইল', 'তাহাজ্জুদ'],
  },
  {
    pattern: /\bjanajar?\s+namaj\b/gi,
    replacement: 'জানাজার সালাত',
    concepts: ['জানাজার সালাত', 'মাইয়্যেত', 'দাফন কাফন'],
  },
  {
    pattern: /\bmusafirer?\s+namaj\b/gi,
    replacement: 'মুসাফিরের সালাত',
    concepts: ['মুসাফিরের সালাত', 'কসর সালাত', 'সফরের নামায'],
  },
  {
    pattern: /\bvromon\s+kale\s+(?:qasr|namaj|salat)\b/gi,
    replacement: 'ভ্রমণকালে কসর সালাত',
    concepts: ['ভ্রমণকালে কসর সালাত', 'মুসাফিরের নামায', 'কসর সালাত'],
  },
  {
    pattern: /\bvromon\s+kale\b/gi,
    replacement: 'ভ্রমণকালে',
    concepts: ['মুসাফির', 'সফর'],
  },

  // Fasting & Medical
  {
    pattern: /\broja\s+(?:obosthay|obostha)\s+injection\b/gi,
    replacement: 'রোজা অবস্থায় ইনজেকশন',
    concepts: ['রোজা অবস্থায় ইনজেকশন', 'সিয়াম ভঙ্গ', 'ইনজেকশন', 'ইনসুলিন'],
  },
  {
    pattern: /\broja\s+(?:vangar|bhangar)\b/gi,
    replacement: 'রোজা ভাঙার',
    concepts: ['রোজা ভঙ্গের কারণ', 'রোযা নষ্ট', 'সিয়াম নষ্ট'],
  },
  {
    pattern: /\broja\s+(?:vanga|bhanga)\b/gi,
    replacement: 'রোজা ভাঙা',
    concepts: ['রোজা ভঙ্গের কারণ', 'রোযা নষ্ট'],
  },
  {
    pattern: /\broja\s+(?:vange|bhenge|venge)\b/gi,
    replacement: 'রোজা ভাঙে',
    concepts: ['রোজা ভঙ্গের কারণ', 'রোযা নষ্ট'],
  },
  {
    pattern: /\binhaler\s+nile\s+(?:ki\s+)?roja\b/gi,
    replacement: 'ইনহেলার নিলে রোজা',
    concepts: ['ইনহেলার নিলে রোজা', 'রোজা অবস্থায় ইনহেলার', 'রোজা ভঙ্গ'],
  },

  // Women's Purity
  {
    pattern: /\bhaiz\s+obosthay\s+quran\b/gi,
    replacement: 'হায়েয অবস্থায় কুরআন',
    concepts: ['হায়েয অবস্থায় কুরআন স্পর্শ বা পাঠ', 'ঋতুস্রাব', 'মুসহাফ স্পর্শ'],
  },
  {
    pattern: /\bhaiz\s+obosthay\b/gi,
    replacement: 'হায়েয অবস্থায়',
    concepts: ['ঋতুস্রাব', 'মাসিক'],
  },
  {
    pattern: /\bkapor\s+napak\b/gi,
    replacement: 'কাপড় নাপাক',
    concepts: ['কাপড় অপবিত্র বা নাপাক হলে', 'পবিত্রতা', 'নাজাসাত'],
  },

  // Sacrifice & Charity
  {
    pattern: /\bchagol\s+diye\s+akika\b/gi,
    replacement: 'ছাগল দিয়ে আকীকা',
    concepts: ['ছাগল দিয়ে আকীকা', 'খাসী কুরবানী', 'আকীকা', 'ছাগল'],
  },
  {
    pattern: /\bchele\s+meyer?\s+akika\b/gi,
    replacement: 'ছেলে ও মেয়ের আকীকা',
    concepts: ['ছেলে ও মেয়ের আকীকা', 'সন্তানের আকীকা', 'আকীকা'],
  },

  // Satan, Waswasa & Sins
  {
    pattern: /\bsoitaner?\s+waswasa\b/gi,
    replacement: 'শয়তানের ওয়াসওয়াসা',
    concepts: ['শয়তানের ওয়াসওয়াসা', 'কুমন্ত্রণা থেকে মুক্তি', 'কুচিন্তা'],
  },
  {
    pattern: /\bsoitaner?\s+dhoka\b/gi,
    replacement: 'শয়তানের ধোঁকা',
    concepts: ['শয়তানের ধোঁকা', 'প্রতারণা', 'ওয়াসওয়াসা'],
  },
  {
    pattern: /\bdari\s+kata\b/gi,
    replacement: 'দাড়ি কাটা',
    concepts: ['দাড়ি কাটা', 'দাড়ি মুণ্ডন', 'দাড়ি রাখা', 'সুন্নাহ'],
  },
  {
    pattern: /\bchele\s+meye\s+prem\b/gi,
    replacement: 'ছেলে মেয়ের প্রেম',
    concepts: ['ছেলে মেয়ের প্রেম', 'অবৈধ সম্পর্ক', 'যিনা'],
  },
  {
    pattern: /\bporokiya\s+kora\b/gi,
    replacement: 'পরকীয়া করা',
    concepts: ['পরকীয়া', 'যিনা', 'ব্যাভিচার', 'অবৈধ সম্পর্ক'],
  },

  // Finance & Modern
  {
    pattern: /\bbank\s+interest\b/gi,
    replacement: 'ব্যাংক সুদ',
    concepts: ['ব্যাংকের সুদ', 'রিবা', 'মুনাফা', 'ব্যাংক সুদ'],
  },
  {
    pattern: /\bshare\s+market\b/gi,
    replacement: 'শেয়ার বাজার',
    concepts: ['শেয়ার বাজার', 'স্টক মার্কেট', 'শেয়ার বিনিয়োগ'],
  },
];

// Banglish Suffixes ordered by length descending
const BANGLISH_SUFFIX_RULES: Array<{
  suffix: string;
  bengaliSuffix: string;
  minStemLength: number;
}> = [
  // Complex grammatical suffixes
  { suffix: 'somporke', bengaliSuffix: 'সম্পর্কে', minStemLength: 3 },
  { suffix: 'shomporke', bengaliSuffix: 'সম্পর্কে', minStemLength: 3 },
  { suffix: 'bapare', bengaliSuffix: 'ব্যাপারে', minStemLength: 3 },
  { suffix: 'gulo', bengaliSuffix: 'গুলো', minStemLength: 3 },
  { suffix: 'gula', bengaliSuffix: 'গুলো', minStemLength: 3 },
  { suffix: 'wala', bengaliSuffix: 'ওয়ালা', minStemLength: 3 },
  { suffix: 'dhar', bengaliSuffix: 'ধারী', minStemLength: 3 },
  { suffix: 'kari', bengaliSuffix: 'কারী', minStemLength: 3 },

  // Case markers
  { suffix: 'er', bengaliSuffix: 'ের', minStemLength: 3 },
  { suffix: 'te', bengaliSuffix: 'তে', minStemLength: 3 },
  { suffix: 'ye', bengaliSuffix: 'য়ে', minStemLength: 3 },
  { suffix: 'ke', bengaliSuffix: 'কে', minStemLength: 3 },
  { suffix: 're', bengaliSuffix: 'রে', minStemLength: 3 },
  { suffix: 'ti', bengaliSuffix: 'টি', minStemLength: 3 },
  { suffix: 'ta', bengaliSuffix: 'টা', minStemLength: 3 },

  // Single character suffixes (e.g. wudur -> wudu + r, rojay -> roja + y, namaje -> namaj + e)
  { suffix: 'r', bengaliSuffix: 'র', minStemLength: 3 },
  { suffix: 'e', bengaliSuffix: 'ে', minStemLength: 3 },
  { suffix: 'y', bengaliSuffix: 'য়', minStemLength: 3 },
];

/**
 * Checks whether a text is written in Latin (English/Banglish) script.
 */
export function isLatinScript(text: string): boolean {
  if (!text) return false;
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
  const bengaliCount = (text.match(/[\u0980-\u09FF]/g) || []).length;
  return latinCount > 0 && latinCount >= bengaliCount;
}

/**
 * Decomposes an inflected Banglish token into its root and suffix.
 * Example: 'wudur' -> root 'wudu' + 'র'
 *          'namajer' -> root 'namaj' + 'ের'
 *          'rojay' -> root 'roja' + 'য়'
 *          'maslay' -> root 'masla' + 'য়'
 */
export function decomposeBanglishMorphology(token: string): {
  stem: string;
  bengaliSuffix: string;
  foundInDict: boolean;
  bengaliExpansions: string[];
} {
  const clean = token.toLowerCase().trim();
  if (!clean) {
    return { stem: '', bengaliSuffix: '', foundInDict: false, bengaliExpansions: [] };
  }

  // 1. Direct dictionary match
  if (ISLAMIC_BANGLISH_DICT[clean]) {
    return {
      stem: clean,
      bengaliSuffix: '',
      foundInDict: true,
      bengaliExpansions: ISLAMIC_BANGLISH_DICT[clean],
    };
  }

  // 2. Try stripping suffixes
  for (const rule of BANGLISH_SUFFIX_RULES) {
    if (clean.endsWith(rule.suffix) && (clean.length - rule.suffix.length) >= rule.minStemLength) {
      const stem = clean.slice(0, clean.length - rule.suffix.length);

      if (ISLAMIC_BANGLISH_DICT[stem]) {
        const rootBengali = ISLAMIC_BANGLISH_DICT[stem];
        const inflected = rootBengali.map((b) => {
          // If Bengali suffix starts with e-kar and word ends with vowel/kar, adjust
          if (rule.bengaliSuffix === 'ের') {
            const lastChar = b[b.length - 1];
            // If ends with vowel sign (e.g. ওযু, রোজা), use 'র' instead of 'ের'
            if (/[\u09BE-\u09CC\u09D7]/u.test(lastChar)) {
              return b + 'র';
            }
            return b + 'ের';
          }
          if (rule.bengaliSuffix === 'ে') {
            const lastChar = b[b.length - 1];
            if (/[\u09BE-\u09CC\u09D7]/u.test(lastChar)) {
              return b + 'য়';
            }
            return b + 'ে';
          }
          if (rule.bengaliSuffix === 'য়') {
            return b + 'য়';
          }
          return b + rule.bengaliSuffix;
        });

        return {
          stem,
          bengaliSuffix: rule.bengaliSuffix,
          foundInDict: true,
          bengaliExpansions: Array.from(new Set([...inflected, ...rootBengali])),
        };
      }
    }
  }

  // 3. Special handling for verbal suffixes:
  // -ar (e.g. 'vangar' -> 'vanga', 'porar' -> 'pora', 'korar' -> 'kora', 'rakhar' -> 'rakha')
  if (clean.endsWith('ar') && clean.length >= 4) {
    const verbStem = clean.slice(0, -1); // e.g. 'vanga', 'pora', 'kora'
    if (ISLAMIC_BANGLISH_DICT[verbStem]) {
      const rootBengali = ISLAMIC_BANGLISH_DICT[verbStem];
      const inflected = rootBengali.map((b) => b + 'র');
      return {
        stem: verbStem,
        bengaliSuffix: 'র',
        foundInDict: true,
        bengaliExpansions: Array.from(new Set([...inflected, ...rootBengali])),
      };
    }
  }

  // -le (e.g. 'khele' -> 'khawa', 'korle' -> 'kora', 'dile' -> 'dewa', 'nile' -> 'neya', 'vangle' -> 'vanga')
  if (clean.endsWith('le') && clean.length >= 4) {
    const verbRoot = clean.slice(0, -2);
    const candidates = [verbRoot + 'a', verbRoot + 'wa', verbRoot + 'ya'];
    for (const c of candidates) {
      if (ISLAMIC_BANGLISH_DICT[c]) {
        const rootBengali = ISLAMIC_BANGLISH_DICT[c];
        return {
          stem: c,
          bengaliSuffix: 'লে',
          foundInDict: true,
          bengaliExpansions: rootBengali,
        };
      }
    }
  }

  return {
    stem: clean,
    bengaliSuffix: '',
    foundInDict: false,
    bengaliExpansions: [],
  };
}

// Multi-character conjunct patterns for context-aware phonetic transliteration
const CONJUNCT_PATTERNS: Array<[RegExp, string]> = [
  // Triple & Special Consonants
  [/kkh/gi, 'ক্ষ'],
  [/cch/gi, 'চ্ছ'],
  [/shn/gi, 'শ্ন'],
  [/kht/gi, 'খ্ত'],
  [/cht/gi, 'চ্ত'],

  // Double Letters
  [/tt/gi, 'ট্ট'],
  [/dd/gi, 'ড্ড'],
  [/rr/gi, 'রর'],
  [/ll/gi, 'ল্ল'],
  [/mm/gi, 'ম্ম'],
  [/nn/gi, 'ন্ন'],
  [/ss/gi, 'স্স'],
  [/jj/gi, 'জ্জ'],
  [/bb/gi, 'ব্ব'],
  [/pp/gi, 'প্প'],
  [/kk/gi, 'ক্ক'],

  // Standard Bengali Conjuncts (যুক্তাক্ষর)
  [/kt/gi, 'ক্ত'],
  [/pr/gi, 'প্র'],
  [/br/gi, 'ব্র'],
  [/vr/gi, 'ভ্র'],
  [/tr/gi, 'ত্র'],
  [/kr/gi, 'ক্র'],
  [/gr/gi, 'গ্র'],
  [/mr/gi, 'ম্র'],
  [/st/gi, 'স্ত'],
  [/sth/gi, 'স্থ'],
  [/sn/gi, 'স্ন'],
  [/nd/gi, 'ন্দ'],
  [/nt/gi, 'ন্ত'],
  [/mp/gi, 'ম্প'],
  [/mb/gi, 'ম্ব'],
  [/nk/gi, 'ংক'],
  [/ng/gi, 'ঙ'],
  [/nj/gi, 'ঞ্জ'],

  // Aspirated Consonants
  [/sh/gi, 'শ'],
  [/th/gi, 'থ'],
  [/dh/gi, 'ধ'],
  [/bh/gi, 'ভ'],
  [/ch/gi, 'চ'],
  [/jh/gi, 'ঝ'],
  [/kh/gi, 'খ'],
  [/gh/gi, 'ঘ'],
  [/ph/gi, 'ফ'],
];

/**
 * Context-aware phonetic transliterator for arbitrary Banglish words.
 * Correctly distinguishes word-initial vowels from dependent vowel signs (কার),
 * and prevents illegal unicode sequences.
 */
export function phoneticTransliterateWord(word: string): string {
  const w = word.toLowerCase().trim();
  if (!w) return '';

  // 1. Common English / Loanword instant mappings
  const loanwords: Record<string, string> = {
    bank: 'ব্যাংক',
    banking: 'ব্যাংকিং',
    interest: 'ইন্টারেস্ট',
    crypto: 'ক্রিপ্টো',
    bitcoin: 'বিটকয়েন',
    insurance: 'ইনস্যুরেন্স',
    inhaler: 'ইনহেলার',
    injection: 'ইনজেকশন',
    saline: 'স্যালাইন',
    insulin: 'ইনসুলিন',
    vaccine: 'ভ্যাকসিন',
    paste: 'পেস্ট',
    brush: 'ব্রাশ',
    cigarette: 'সিগারেট',
    post: 'পোস্ট',
    share: 'শেয়ার',
    stock: 'স্টক',
    market: 'মার্কেট',
    khor: 'খোর',
    sudkhor: 'সুদখোর',
    sudkhorer: 'সুদখোরের',
  };
  if (loanwords[w]) return loanwords[w];

  let text = w;

  // 2. Apply conjunct consonant replacements first
  for (const [pattern, repl] of CONJUNCT_PATTERNS) {
    text = text.replace(pattern, repl);
  }

  // 3. Parse characters with awareness of position (initial vs dependent)
  const len = text.length;
  let out = '';
  let i = 0;

  while (i < len) {
    const isStart = i === 0;
    const char = text[i];
    const next = i + 1 < len ? text[i + 1] : '';

    // Diphthongs & Double Vowels
    if (char === 'a' && next === 'i') {
      out += isStart ? 'আই' : 'াই';
      i += 2;
      continue;
    }
    if (char === 'a' && next === 'y') {
      out += isStart ? 'আয়' : 'ায়';
      i += 2;
      continue;
    }
    if (char === 'o' && next === 'i') {
      out += isStart ? 'ঐ' : 'ৈ';
      i += 2;
      continue;
    }
    if (char === 'o' && next === 'u') {
      out += isStart ? 'ঔ' : 'ৌ';
      i += 2;
      continue;
    }
    if (char === 'u' && next === 'i') {
      out += isStart ? 'উই' : 'ুই';
      i += 2;
      continue;
    }
    if (char === 'a' && next === 'a') {
      out += isStart ? 'আ' : 'া';
      i += 2;
      continue;
    }
    if (char === 'e' && next === 'e') {
      out += isStart ? 'ঈ' : 'ী';
      i += 2;
      continue;
    }
    if (char === 'o' && next === 'o') {
      out += isStart ? 'ঊ' : 'ূ';
      i += 2;
      continue;
    }

    // Single Vowels
    if (char === 'a') {
      out += isStart ? 'আ' : 'া';
      i++;
      continue;
    }
    if (char === 'e') {
      out += isStart ? 'এ' : 'ে';
      i++;
      continue;
    }
    if (char === 'i') {
      out += isStart ? 'ই' : 'ি';
      i++;
      continue;
    }
    if (char === 'u') {
      out += isStart ? 'উ' : 'ু';
      i++;
      continue;
    }
    if (char === 'o') {
      out += isStart ? 'ও' : 'ো';
      i++;
      continue;
    }

    // Consonants
    switch (char) {
      case 'k':
      case 'q':
        out += 'ক';
        break;
      case 'g':
        out += 'গ';
        break;
      case 'j':
        out += 'জ';
        break;
      case 'z':
        out += 'য';
        break;
      case 't':
        if (text.includes('kat') || text.includes('pot') || text.includes('fet') || text.includes('lut')) {
          out += 'ট';
        } else {
          out += 'ত';
        }
        break;
      case 'd':
        out += 'দ';
        break;
      case 'n':
        out += 'ন';
        break;
      case 'p':
        out += 'প';
        break;
      case 'f':
        out += 'ফ';
        break;
      case 'b':
        out += 'ব';
        break;
      case 'v':
        out += 'ভ';
        break;
      case 'm':
        out += 'ম';
        break;
      case 'r':
        if (
          (text.startsWith('por') && text !== 'porashona') ||
          text.startsWith('kap') ||
          text.startsWith('dar') ||
          text.startsWith('gar') ||
          text.startsWith('bor')
        ) {
          out += 'ড়';
        } else {
          out += 'র';
        }
        break;
      case 'l':
        out += 'ল';
        break;
      case 's':
        out += 'স';
        break;
      case 'h':
        out += 'হ';
        break;
      case 'y':
        out += 'য়';
        break;
      case 'w':
        out += isStart ? 'ও' : 'ওয়া';
        break;
      default:
        out += char;
        break;
    }

    i++;
  }

  // 4. Unicode hygiene: fix any broken consecutive dependent vowel signs
  out = out
    .replace(/া[িী]/g, 'াই')
    .replace(/া[ুূ]/g, 'াউ')
    .replace(/োে/g, 'ো')
    .replace(/াা/g, 'া')
    .replace(/িি/g, 'ী');

  return out;
}

/**
 * Main transliteration engine entrypoint.
 * Converts Banglish queries (e.g. "wudur niyom", "roja obosthay injection", "soitaner waswasa")
 * into high-precision Bengali candidate queries and term sets.
 */
export function transliterateQuery(query: string): {
  primaryBengali: string;
  expandedTerms: string[];
  isBanglish: boolean;
} {
  const trimmed = query.trim();
  if (!trimmed) {
    return { primaryBengali: '', expandedTerms: [], isBanglish: false };
  }

  if (!isLatinScript(trimmed)) {
    return { primaryBengali: trimmed, expandedTerms: [trimmed], isBanglish: false };
  }

  const allTerms = new Set<string>();

  // 1. Check Multi-Word Phrases with non-destructive replacement
  let processedQuery = trimmed;
  for (const item of ISLAMIC_BANGLISH_PHRASES) {
    if (item.pattern.test(processedQuery)) {
      item.concepts.forEach((r) => allTerms.add(r));
      item.pattern.lastIndex = 0;
      processedQuery = processedQuery.replace(item.pattern, item.replacement);
    }
  }

  const tokens = processedQuery.split(/[\s,.;:!?"'()\-–—\/\\]+/).filter(Boolean);
  const phraseCandidates: string[][] = [];

  for (const token of tokens) {
    // If token was already replaced by Bengali phrase in step 1, keep it
    if (/[\u0980-\u09FF]/u.test(token)) {
      phraseCandidates.push([token]);
      allTerms.add(token);
      continue;
    }

    // Try morphological decomposition and dictionary lookup
    const morph = decomposeBanglishMorphology(token);
    if (morph.foundInDict && morph.bengaliExpansions.length > 0) {
      phraseCandidates.push(morph.bengaliExpansions);
      morph.bengaliExpansions.forEach((term) => allTerms.add(term));
    } else {
      // Out-of-vocabulary phonetic transliteration
      const phonetic = phoneticTransliterateWord(token);
      if (phonetic) {
        phraseCandidates.push([phonetic]);
        allTerms.add(phonetic);
      } else {
        phraseCandidates.push([token]);
        allTerms.add(token);
      }
    }
  }

  // Construct primary synthesized Bengali query sentence
  const primaryBengali = phraseCandidates.map((c) => c[0]).join(' ');
  allTerms.add(primaryBengali);

  return {
    primaryBengali,
    expandedTerms: Array.from(allTerms),
    isBanglish: true,
  };
}
