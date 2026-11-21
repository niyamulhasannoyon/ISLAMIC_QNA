import { describe, it, expect } from 'vitest';
import {
  isSafePublicUrl,
  serializeJsonLd,
  sanitizeString,
  stripAllHtml,
  sanitizeFatwaInput,
} from '@/lib/sanitizer';

describe('Security & SSRF Mitigation', () => {
  describe('isSafePublicUrl', () => {
    it('accepts legitimate public HTTP/HTTPS URLs', () => {
      expect(isSafePublicUrl('https://at-tahreek.com/fatwa/123')).toBe(true);
      expect(isSafePublicUrl('http://alkawsar.com/article/456')).toBe(true);
      expect(isSafePublicUrl('https://deenqna.org')).toBe(true);
    });

    it('blocks localhost, loopback, and undefined IP addresses', () => {
      expect(isSafePublicUrl('http://localhost:3000')).toBe(false);
      expect(isSafePublicUrl('http://127.0.0.1:8080/admin')).toBe(false);
      expect(isSafePublicUrl('http://127.0.0.2')).toBe(false);
      expect(isSafePublicUrl('http://0.0.0.0')).toBe(false);
      expect(isSafePublicUrl('http://[::1]')).toBe(false);
    });

    it('blocks cloud instance metadata endpoints (AWS, GCP, Azure)', () => {
      expect(isSafePublicUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
      expect(isSafePublicUrl('http://metadata.google.internal/computeMetadata/v1/')).toBe(false);
    });

    it('blocks RFC 1918 private IPv4 subnets', () => {
      // 10.0.0.0/8
      expect(isSafePublicUrl('http://10.0.0.1/internal')).toBe(false);
      expect(isSafePublicUrl('http://10.254.0.1')).toBe(false);
      // 172.16.0.0/12
      expect(isSafePublicUrl('http://172.16.0.1')).toBe(false);
      expect(isSafePublicUrl('http://172.31.255.255')).toBe(false);
      // 192.168.0.0/16
      expect(isSafePublicUrl('http://192.168.1.1/router')).toBe(false);
      expect(isSafePublicUrl('http://192.168.0.254')).toBe(false);
    });

    it('blocks non-HTTP/HTTPS protocols', () => {
      expect(isSafePublicUrl('file:///etc/passwd')).toBe(false);
      expect(isSafePublicUrl('ftp://ftp.example.com/file.txt')).toBe(false);
      expect(isSafePublicUrl('gopher://gopher.example.com')).toBe(false);
      expect(isSafePublicUrl('javascript:alert(1)')).toBe(false);
    });

    it('handles malformed and empty URLs gracefully', () => {
      expect(isSafePublicUrl('')).toBe(false);
      expect(isSafePublicUrl('not-a-valid-url')).toBe(false);
      expect(isSafePublicUrl(null as any)).toBe(false);
      expect(isSafePublicUrl(undefined as any)).toBe(false);
    });
  });

  describe('serializeJsonLd', () => {
    it('escapes HTML tags to prevent script-breakout XSS in structured data', () => {
      const maliciousData = {
        name: '</script><script>alert("XSS")</script>',
        note: '<b>Test</b> & "quote"',
      };
      const serialized = serializeJsonLd(maliciousData);
      expect(serialized).not.toContain('</script>');
      expect(serialized).not.toContain('<script>');
      expect(serialized).toContain('\\u003c/script\\u003e');
      expect(serialized).toContain('\\u0026');
    });

    it('handles unicode line and paragraph separators', () => {
      const data = { text: 'line\u2028break\u2029paragraph' };
      const serialized = serializeJsonLd(data);
      expect(serialized).toContain('\\u2028');
      expect(serialized).toContain('\\u2029');
    });
  });

  describe('sanitizeString & stripAllHtml', () => {
    it('strips dangerous HTML tags and multi-pass nested evasion', () => {
      const payload = 'Hello <scr<script>ipt>alert(1)</script> world';
      expect(sanitizeString(payload)).not.toContain('<script>');
      expect(sanitizeString(payload)).toContain('Hello');
    });

    it('strips inline event handlers', () => {
      const payload = '<img src="x" onerror="alert(1)"> ওযুর বিধান';
      const sanitized = sanitizeString(payload);
      expect(sanitized).not.toContain('onerror=');
      expect(sanitized).toContain('ওযুর বিধান');
    });

    it('strips javascript: pseudo-protocols', () => {
      const payload = '<a href="javascript:alert(1)">ক্লিক করুন</a>';
      expect(sanitizeString(payload)).not.toContain('javascript:');
    });

    it('completely strips all HTML markup to clean text', () => {
      const html = '<div class="fatwa"><p>ওযুর <strong>ফরজ</strong> ৪টি।</p></div>';
      expect(stripAllHtml(html)).toBe('ওযুর ফরজ ৪টি।');
    });

    it('sanitizes nested fatwa input objects', () => {
      const input = {
        title: 'ফতোয়া <script>alert(1)</script>',
        question: 'প্রশ্ন <b>বোল্ড</b>',
        answer: 'উত্তর <iframe src="evil.com"></iframe> পরিষ্কার',
        tags: ['ওযু <script>', 'সালাত'],
        scholar: 'মুফতী <em>সাহেব</em>',
      };
      const clean = sanitizeFatwaInput(input);
      expect(clean.title).not.toContain('<script>');
      expect(clean.answer).not.toContain('<iframe');
      expect(clean.scholar).toBe('মুফতী সাহেব');
      expect(clean.tags).toEqual(['ওযু', 'সালাত']);
    });
  });
});
