import fs from 'fs';
import path from 'path';
import { batchUpsertFatwas } from '../lib/db';
import { computeFatwaHash } from '../lib/hash';
import { IngestItemInput, FatwaSource } from '../types/fatwa';

/**
 * Categorizes a fatwa based on common Bengali Islamic keywords.
 */
function inferCategory(text: string): string {
  const t = text.toLowerCase();
  if (/(?:সালাত|ছালাত|নামাজ|ইমাম|আযান|জানাযা|রুকূ|সিজদা|তাহাজ্জুদ|জুমুআ)/.test(t)) {
    return 'সালাত (Prayer)';
  }
  if (/(?:যাকাত|যাকাতুল|সাদাকাহ|ছাদাক্বা|ফিতরা|টাকা|অর্থসম্পদ|প্রভিডেন্ট)/.test(t)) {
    return 'যাকাত ও সাদাকাহ (Zakat)';
  }
  if (/(?:সিয়াম|রোযা|রমযান|ইফতার|সেহরী|তারাবীহ)/.test(t)) {
    return 'সিয়াম (Fasting)';
  }
  if (/(?:হজ্জ|উমরা|কুরবানী|কোরবানি|যবেহ|পশু)/.test(t)) {
    return 'হজ্জ ও উমরাহ (Hajj)';
  }
  if (/(?:বিবাহ|বিয়ে|তালাক|স্ত্রী|স্বামী|মোহর|দেনমোহর|পর্দা|চাচী)/.test(t)) {
    return 'পারিবারিক ও বিবাহ (Family)';
  }
  if (/(?:শিরক|কুফর|বিদআত|তাবিজ|আকীদাহ|তাওহীদ|ঈমান|জান্নাত|জাহান্নাম)/.test(t)) {
    return 'আকীদাহ ও তাওহীদ (Creed)';
  }
  if (/(?:হারাম|হালাল|ক্রিপ্টো|বিটকয়েন|সুদ|ব্যাংক|ব্যবসা|চাকুরি|লেনদেন|মুয়ামালাত)/.test(t)) {
    return 'মুয়ামালাত ও লেনদেন (Transactions)';
  }
  return 'সাধারণ জিজ্ঞাসা (General)';
}

/**
 * Parses raw text formatted like:
 * "প্রশ্ন (২৯) : প্রশ্ন এখানে...\nউত্তর : উত্তর এখানে...\nAl-itisam\n-\nতারিখ"
 */
function parseRawStringItem(raw: string, defaultSource: FatwaSource): IngestItemInput | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  let question = '';
  let answer = '';
  let dateStr = '';
  const scholar = defaultSource === 'at-tahreek' ? 'ড. মুহাম্মাদ আসাদুল্লাহ আল-গালিব' : 'আল-ইতিসাম ফতোয়া বোর্ড';
  let source: FatwaSource = defaultSource;

  // Check source from content if mentioned
  if (/at-tahreek/i.test(cleaned)) {
    source = 'at-tahreek';
  } else if (/al-itisam/i.test(cleaned)) {
    source = 'al-itisam';
  }

  // Extract Question: "প্রশ্ন (X) : ..." or "প্রশ্ন : ..."
  const qMatch = cleaned.match(/প্রশ্ন\s*(?:\([^)]+\))?\s*:\s*([\s\S]+?)(?=\n\s*উত্তর\s*:|\r\n\s*উত্তর\s*:|\nউত্তর|\Z)/);
  if (qMatch) {
    question = qMatch[1].trim();
  }

  // Extract Answer: "উত্তর : ..."
  const aMatch = cleaned.match(/উত্তর\s*:\s*([\s\S]+?)(?=\n\s*Al-itisam|\n\s*At-Tahreek|\n\s*-\s*\n|\Z)/i);
  if (aMatch) {
    answer = aMatch[1].trim();
  } else {
    // Fallback: If no explicit delimiter at end, take everything after "উত্তর :"
    const fallbackAnswer = cleaned.split(/উত্তর\s*:\s*/);
    if (fallbackAnswer.length > 1) {
      answer = fallbackAnswer.slice(1).join('উত্তর :').trim();
    }
  }

  // If question and answer could not be extracted properly
  if (!question && !answer) {
    return null;
  }

  if (!question && answer) {
    question = answer.slice(0, 100) + '...';
  }

  // Extract Date if available
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(-3)) {
    if (/[\u09E6-\u09EF]{4}|\d{4}|সেপ্টেম্বর|জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|অক্টোবর|নভেম্বর|ডিসেম্বর/i.test(line)) {
      dateStr = line;
      break;
    }
  }

  const category = inferCategory(question + ' ' + answer);
  const title = question.length > 120 ? question.slice(0, 117) + '...' : question;

  const sha256_hash = computeFatwaHash({ question, answer });

  return {
    source,
    source_url: source === 'at-tahreek' ? 'https://www.at-tahreek.com' : 'https://al-itisam.com',
    title,
    question,
    answer,
    category,
    tags: [category.split(' ')[0]],
    scholar,
    published_date: dateStr || new Date().toISOString().split('T')[0],
    scraped_at: new Date().toISOString(),
    sha256_hash,
    hash: sha256_hash,
  };
}

/**
 * Normalizes an item that might be either an object or a raw string.
 */
function normalizeItem(item: any, defaultSource: FatwaSource): IngestItemInput | null {
  if (typeof item === 'string') {
    return parseRawStringItem(item, defaultSource);
  }

  if (typeof item === 'object' && item !== null) {
    const question = item.question || item.title || '';
    const answer = item.answer || item.body || '';

    if (!question || !answer) return null;

    const source: FatwaSource =
      item.source && String(item.source).toLowerCase().includes('tahreek')
        ? 'at-tahreek'
        : item.source && (String(item.source).toLowerCase().includes('kawsar') || String(item.source).toLowerCase().includes('kausar'))
        ? 'al-kawsar'
        : defaultSource;

    const category = item.category || inferCategory(question + ' ' + answer);
    const title = item.title || (question.length > 120 ? question.slice(0, 117) + '...' : question);
    const scholar = item.scholar || (source === 'at-tahreek' ? 'ড. মুহাম্মাদ আসাদুল্লাহ আল-গালিব' : source === 'al-kawsar' ? 'মারকাযুদ দাওয়াহ / আলকাউসার' : 'আল-ইতিসাম ফতোয়া বোর্ড');
    const tags = Array.isArray(item.tags) ? item.tags : [category.split(' ')[0]];
    const source_url = item.source_url || (source === 'at-tahreek' ? 'https://www.at-tahreek.com' : source === 'al-kawsar' ? 'https://www.alkawsar.com' : 'https://al-itisam.com');
    const published_date = item.published_date || item.date || item.createdAt || new Date().toISOString().split('T')[0];

    const sha256_hash = item.sha256_hash || item.hash || computeFatwaHash({ question, answer });

    return {
      source,
      source_url,
      title,
      question,
      answer,
      category,
      tags,
      scholar,
      published_date,
      scraped_at: item.scraped_at || new Date().toISOString(),
      sha256_hash,
      hash: sha256_hash,
    };
  }

  return null;
}

/**
 * Main importer runner.
 */
export async function runImport(filePath?: string) {
  const dataDir = path.join(process.cwd(), 'data');
  const filesToProcess: string[] = [];

  if (filePath) {
    const target = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    if (fs.existsSync(target)) {
      filesToProcess.push(target);
    } else {
      console.error(`File not found: ${target}`);
      process.exit(1);
    }
  } else {
    // Scan data directory for .json files
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      for (const f of files) {
        if (f.endsWith('.json')) {
          filesToProcess.push(path.join(dataDir, f));
        }
      }
    }
  }

  if (filesToProcess.length === 0) {
    console.log('No JSON files found to import in data/ directory.');
    return;
  }

  console.log(`Found ${filesToProcess.length} JSON file(s) to process.`);

  for (const file of filesToProcess) {
    const filename = path.basename(file);
    console.log(`\n========================================`);
    console.log(`Processing: ${filename}`);
    console.log(`========================================`);

    const rawContent = fs.readFileSync(file, 'utf-8');
    let rawData: any;
    try {
      rawData = JSON.parse(rawContent);
    } catch (err) {
      console.error(`Failed to parse JSON in ${filename}:`, err);
      continue;
    }

    const itemsArray = Array.isArray(rawData) ? rawData : [rawData];
    console.log(`Total records in file: ${itemsArray.length}`);

    const defaultSource: FatwaSource = filename.toLowerCase().includes('tahreek')
      ? 'at-tahreek'
      : filename.toLowerCase().includes('kawsar') || filename.toLowerCase().includes('kausar')
      ? 'al-kawsar'
      : 'al-itisam';

    const validItems: IngestItemInput[] = [];
    const seenHashes = new Set<string>();

    for (const rawItem of itemsArray) {
      const parsed = normalizeItem(rawItem, defaultSource);
      if (parsed) {
        const hash = parsed.sha256_hash || computeFatwaHash({ question: parsed.question, answer: parsed.answer });
        if (!seenHashes.has(hash)) {
          seenHashes.add(hash);
          validItems.push({
            ...parsed,
            sha256_hash: hash,
            hash,
          });
        }
      }
    }

    console.log(`Valid unique records to upsert: ${validItems.length}`);

    // Ingest in chunks of 500
    const chunkSize = 500;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (let i = 0; i < validItems.length; i += chunkSize) {
      const chunk = validItems.slice(i, i + chunkSize);
      const res = batchUpsertFatwas(chunk);
      totalInserted += res.inserted;
      totalUpdated += res.updated;
      totalSkipped += res.skipped;
    }

    console.log(`Ingestion Result for ${filename}:`);
    console.log(`- Inserted (New): ${totalInserted}`);
    console.log(`- Updated:        ${totalUpdated}`);
    console.log(`- Skipped:        ${totalSkipped}`);
  }

  console.log('\nAll files processed successfully!');
}

if (require.main === module) {
  const argFile = process.argv[2];
  runImport(argFile).catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });
}
