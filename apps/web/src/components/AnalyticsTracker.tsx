'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedRef = useRef<string>('');

  useEffect(() => {
    // Avoid tracking admin API routes
    if (!pathname || pathname.startsWith('/api/')) {
      return;
    }

    const searchString = searchParams?.toString() || '';
    const fullPath = searchString ? `${pathname}?${searchString}` : pathname;

    if (lastTrackedRef.current === fullPath) {
      return;
    }

    lastTrackedRef.current = fullPath;

    // Retrieve or generate persistent Visitor ID
    let visitorId = '';
    try {
      visitorId = localStorage.getItem('fatwa_visitor_id') || '';
      if (!visitorId) {
        visitorId = 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('fatwa_visitor_id', visitorId);
      }
    } catch (e) {
      visitorId = 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    const payload = {
      visitorId,
      path: fullPath,
      pageTitle: typeof document !== 'undefined' ? document.title : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      searchQuery: searchParams?.get('q') || searchParams?.get('query') || null,
    };

    // Non-blocking fire-and-forget pageview tracking
    fetch('/api/v1/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Ignore network errors silently
    });
  }, [pathname, searchParams]);

  return null; // Silent tracker component
}
