import crypto from 'crypto';
import { getDb } from './db';

export interface PageviewInput {
  visitorId: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  path: string;
  pageTitle?: string | null;
  fatwaId?: string | null;
  searchQuery?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  ip?: string | null;
}

export function parseUserAgent(ua?: string | null): {
  device: 'Mobile' | 'Tablet' | 'Desktop';
  browser: string;
  os: string;
} {
  if (!ua) {
    return { device: 'Desktop', browser: 'Unknown', os: 'Unknown' };
  }

  const u = ua.toLowerCase();

  // Device Detection
  let device: 'Mobile' | 'Tablet' | 'Desktop' = 'Desktop';
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    device = 'Tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|opera mobi|windows phone/i.test(ua)) {
    device = 'Mobile';
  }

  // OS Detection
  let os = 'Unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // Browser Detection
  let browser = 'Chrome';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';

  return { device, browser, os };
}

export function recordPageview(input: PageviewInput): { success: boolean; id: string } {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const pvId = crypto.randomUUID();

    const { device, browser, os } = parseUserAgent(input.userAgent);
    const visitorId = input.visitorId || crypto.randomUUID();

    // Check if user is logged in
    const isUserLoggedIn = Boolean(input.userId || input.userEmail);
    const userType = isUserLoggedIn ? 'logged_in' : 'guest';

    // Hash IP for privacy if present
    const ipHash = input.ip
      ? crypto.createHash('sha256').update(input.ip).digest('hex').substring(0, 12)
      : '';

    // Extract search query if path contains ?q= or search_query param passed
    let searchQuery = input.searchQuery || null;
    if (!searchQuery && input.path.includes('q=')) {
      try {
        const urlParams = new URLSearchParams(input.path.split('?')[1]);
        searchQuery = urlParams.get('q') || urlParams.get('query') || null;
      } catch (e) {
        // ignore
      }
    }

    // Attempt to resolve page title / fatwa title if fatwa_id is present
    let pageTitle = input.pageTitle || null;
    let fatwaId = input.fatwaId || null;

    if (!fatwaId && input.path.includes('/fatwa/')) {
      const parts = input.path.split('/fatwa/')[1]?.split('?')[0]?.split('#')[0];
      if (parts) {
        fatwaId = parts;
      }
    }

    if (fatwaId && !pageTitle) {
      try {
        const row = db.prepare('SELECT title FROM fatwas WHERE id = ?').get(fatwaId) as { title?: string } | undefined;
        if (row && row.title) {
          pageTitle = row.title;
        }
      } catch (e) {
        // ignore lookup errors
      }
    }

    // 1. Insert Pageview
    db.prepare(`
      INSERT INTO analytics_pageviews (
        id, visitor_id, user_id, user_type, user_name, user_email,
        path, page_title, fatwa_id, search_query, referrer,
        device_type, browser, os, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pvId,
      visitorId,
      input.userId || null,
      userType,
      input.userName || null,
      input.userEmail || null,
      input.path.slice(0, 500),
      pageTitle ? pageTitle.slice(0, 250) : null,
      fatwaId || null,
      searchQuery ? searchQuery.slice(0, 250) : null,
      input.referrer ? input.referrer.slice(0, 500) : null,
      device,
      browser,
      os,
      now
    );

    // 2. Upsert Visitor Record
    const existingVisitor = db
      .prepare('SELECT visitor_id, total_pageviews FROM analytics_visitors WHERE visitor_id = ?')
      .get(visitorId) as { visitor_id: string; total_pageviews: number } | undefined;

    if (existingVisitor) {
      db.prepare(`
        UPDATE analytics_visitors
        SET last_seen_at = ?,
            total_pageviews = total_pageviews + 1,
            user_id = COALESCE(?, user_id),
            user_name = COALESCE(?, user_name),
            user_email = COALESCE(?, user_email),
            device_type = ?,
            browser = ?,
            os = ?
        WHERE visitor_id = ?
      `).run(
        now,
        input.userId || null,
        input.userName || null,
        input.userEmail || null,
        device,
        browser,
        os,
        visitorId
      );
    } else {
      db.prepare(`
        INSERT INTO analytics_visitors (
          visitor_id, user_id, user_email, user_name,
          device_type, browser, os, ip_hash,
          first_seen_at, last_seen_at, total_pageviews
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        visitorId,
        input.userId || null,
        input.userEmail || null,
        input.userName || null,
        device,
        browser,
        os,
        ipHash,
        now,
        now
      );
    }

    return { success: true, id: pvId };
  } catch (err) {
    console.error('[Analytics Record Error]:', err);
    return { success: false, id: '' };
  }
}

export function getAnalyticsOverview(timeframe: 'today' | '7d' | '30d' | 'all' = 'today') {
  const db = getDb();
  const now = new Date();
  let startTimeIso: string;

  if (timeframe === 'today') {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startTimeIso = todayStart.toISOString();
  } else if (timeframe === '7d') {
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    startTimeIso = d7.toISOString();
  } else if (timeframe === '30d') {
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    startTimeIso = d30.toISOString();
  } else {
    startTimeIso = '1970-01-01T00:00:00.000Z';
  }

  // 15 Minutes ago for real-time active users
  const activeCutoffIso = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

  // Summary Metrics
  const todayStartIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const todayVisitors = (db.prepare(
    'SELECT COUNT(DISTINCT visitor_id) as count FROM analytics_pageviews WHERE created_at >= ?'
  ).get(todayStartIso) as any)?.count || 0;

  const todayPageviews = (db.prepare(
    'SELECT COUNT(*) as count FROM analytics_pageviews WHERE created_at >= ?'
  ).get(todayStartIso) as any)?.count || 0;

  const loggedInVisitorsToday = (db.prepare(
    "SELECT COUNT(DISTINCT visitor_id) as count FROM analytics_pageviews WHERE created_at >= ? AND user_type = 'logged_in'"
  ).get(todayStartIso) as any)?.count || 0;

  const guestVisitorsToday = (db.prepare(
    "SELECT COUNT(DISTINCT visitor_id) as count FROM analytics_pageviews WHERE created_at >= ? AND user_type = 'guest'"
  ).get(todayStartIso) as any)?.count || 0;

  const activeUsers15m = (db.prepare(
    'SELECT COUNT(DISTINCT visitor_id) as count FROM analytics_pageviews WHERE created_at >= ?'
  ).get(activeCutoffIso) as any)?.count || 0;

  const periodVisitors = (db.prepare(
    'SELECT COUNT(DISTINCT visitor_id) as count FROM analytics_pageviews WHERE created_at >= ?'
  ).get(startTimeIso) as any)?.count || 0;

  const periodPageviews = (db.prepare(
    'SELECT COUNT(*) as count FROM analytics_pageviews WHERE created_at >= ?'
  ).get(startTimeIso) as any)?.count || 0;

  const totalVisitorsAllTime = (db.prepare(
    'SELECT COUNT(*) as count FROM analytics_visitors'
  ).get() as any)?.count || 0;

  const totalPageviewsAllTime = (db.prepare(
    'SELECT COUNT(*) as count FROM analytics_pageviews'
  ).get() as any)?.count || 0;

  // Time Trends (Grouped by Date YYYY-MM-DD)
  const trendRows = db.prepare(`
    SELECT
      substr(created_at, 1, 10) as date,
      COUNT(*) as pageviews,
      COUNT(DISTINCT visitor_id) as visitors,
      COUNT(DISTINCT CASE WHEN user_type = 'logged_in' THEN visitor_id END) as logged_in,
      COUNT(DISTINCT CASE WHEN user_type = 'guest' THEN visitor_id END) as guest
    FROM analytics_pageviews
    WHERE created_at >= ?
    GROUP BY substr(created_at, 1, 10)
    ORDER BY date ASC
  `).all(startTimeIso) as Array<{
    date: string;
    pageviews: number;
    visitors: number;
    logged_in: number;
    guest: number;
  }>;

  // Top Fatwas Viewed
  const topFatwaRows = db.prepare(`
    SELECT 
      pv.fatwa_id,
      COALESCE(pv.page_title, f.title, 'ফতোয়া বিষদ') as title,
      COALESCE(f.source, 'General') as source,
      COALESCE(f.category, 'General') as category,
      COUNT(*) as view_count,
      COUNT(DISTINCT pv.visitor_id) as unique_visitors
    FROM analytics_pageviews pv
    LEFT JOIN fatwas f ON f.id = pv.fatwa_id
    WHERE pv.created_at >= ? AND pv.fatwa_id IS NOT NULL AND pv.fatwa_id != ''
    GROUP BY pv.fatwa_id
    ORDER BY view_count DESC
    LIMIT 10
  `).all(startTimeIso) as Array<{
    fatwa_id: string;
    title: string;
    source: string;
    category: string;
    view_count: number;
    unique_visitors: number;
  }>;

  // Top Site Paths
  const topPageRows = db.prepare(`
    SELECT 
      path,
      COALESCE(page_title, path) as title,
      COUNT(*) as views,
      COUNT(DISTINCT visitor_id) as visitors
    FROM analytics_pageviews
    WHERE created_at >= ?
    GROUP BY path
    ORDER BY views DESC
    LIMIT 10
  `).all(startTimeIso) as Array<{
    path: string;
    title: string;
    views: number;
    visitors: number;
  }>;

  // Top Search Queries
  const topSearchRows = db.prepare(`
    SELECT 
      search_query,
      COUNT(*) as count
    FROM analytics_pageviews
    WHERE created_at >= ? AND search_query IS NOT NULL AND search_query != ''
    GROUP BY search_query
    ORDER BY count DESC
    LIMIT 10
  `).all(startTimeIso) as Array<{
    search_query: string;
    count: number;
  }>;

  // Logged-in vs Guest split in period
  const userTypeRows = db.prepare(`
    SELECT 
      user_type,
      COUNT(DISTINCT visitor_id) as count
    FROM analytics_pageviews
    WHERE created_at >= ?
    GROUP BY user_type
  `).all(startTimeIso) as Array<{ user_type: string; count: number }>;

  let periodLoggedInCount = 0;
  let periodGuestCount = 0;
  for (const r of userTypeRows) {
    if (r.user_type === 'logged_in') periodLoggedInCount = r.count;
    else periodGuestCount = r.count;
  }

  // Device Breakdown
  const deviceRows = db.prepare(`
    SELECT 
      device_type,
      COUNT(*) as count
    FROM analytics_pageviews
    WHERE created_at >= ?
    GROUP BY device_type
    ORDER BY count DESC
  `).all(startTimeIso) as Array<{ device_type: string; count: number }>;

  // Browser Breakdown
  const browserRows = db.prepare(`
    SELECT 
      browser,
      COUNT(*) as count
    FROM analytics_pageviews
    WHERE created_at >= ?
    GROUP BY browser
    ORDER BY count DESC
    LIMIT 6
  `).all(startTimeIso) as Array<{ browser: string; count: number }>;

  // Recent Activity Feed
  const recentLogs = db.prepare(`
    SELECT 
      pv.id,
      pv.visitor_id,
      pv.user_type,
      pv.user_name,
      pv.user_email,
      pv.path,
      COALESCE(pv.page_title, f.title, pv.path) as page_title,
      pv.fatwa_id,
      pv.device_type,
      pv.browser,
      pv.os,
      pv.created_at
    FROM analytics_pageviews pv
    LEFT JOIN fatwas f ON f.id = pv.fatwa_id
    ORDER BY pv.created_at DESC
    LIMIT 30
  `).all() as Array<{
    id: string;
    visitor_id: string;
    user_type: string;
    user_name: string | null;
    user_email: string | null;
    path: string;
    page_title: string;
    fatwa_id: string | null;
    device_type: string;
    browser: string;
    os: string;
    created_at: string;
  }>;

  return {
    timeframe,
    summary: {
      todayVisitors,
      todayPageviews,
      loggedInVisitorsToday,
      guestVisitorsToday,
      activeUsers15m,
      periodVisitors,
      periodPageviews,
      totalVisitorsAllTime,
      totalPageviewsAllTime,
    },
    trends: trendRows,
    topFatwas: topFatwaRows,
    topPages: topPageRows,
    topSearches: topSearchRows,
    userBreakdown: {
      loggedIn: periodLoggedInCount,
      guest: periodGuestCount,
      total: periodLoggedInCount + periodGuestCount,
    },
    deviceBreakdown: deviceRows,
    browserBreakdown: browserRows,
    recentLogs,
  };
}
