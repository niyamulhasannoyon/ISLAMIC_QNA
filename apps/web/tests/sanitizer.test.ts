import { describe, it, expect } from 'vitest';
import React from 'react';
import { SafeHighlight } from '@/components/SafeHighlight';

describe('SafeHighlight Component Sanitization', () => {
  it('returns null for empty or null text', () => {
    expect(SafeHighlight({ text: null })).toBeNull();
    expect(SafeHighlight({ text: '' })).toBeNull();
  });

  it('renders plain text without mark tags safely', () => {
    const el = SafeHighlight({ text: 'সাধারণ ইসলামিক প্রশ্ন' });
    expect(el).not.toBeNull();
    expect(el?.props.children).toBe('সাধারণ ইসলামিক প্রশ্ন');
  });

  it('parses valid <mark> tokens as highlighted React elements', () => {
    const el = SafeHighlight({ text: 'ওযুর <mark>ফরজ</mark> কয়টি?' });
    expect(el).not.toBeNull();
    const children = React.Children.toArray(el?.props.children);
    expect(children.length).toBe(3);

    // First part: plain text fragment
    expect((children[0] as any).props.children).toBe('ওযুর ');

    // Second part: <mark> element
    const markEl = children[1] as React.ReactElement;
    expect(markEl.type).toBe('mark');
    expect(markEl.props.children).toBe('ফরজ');

    // Third part: plain text fragment
    expect((children[2] as any).props.children).toBe(' কয়টি?');
  });

  it('neutralizes malicious XSS script tags and renders safe children', () => {
    const malicious = '<script>alert("pwned")</script>নামাজের <mark>রুকন</mark>';
    const el = SafeHighlight({ text: malicious });
    expect(el).not.toBeNull();

    // Check that script tags are stripped and no dangerous element is created
    const jsonStr = JSON.stringify(el);
    expect(jsonStr).not.toContain('<script>');
    expect(jsonStr).not.toContain('</script>');
  });

  it('neutralizes nested tags inside <mark> tags', () => {
    const nested = '<mark><img src=x onerror=alert(1)>সালাত</mark>';
    const el = SafeHighlight({ text: nested });
    expect(el).not.toBeNull();

    const children = React.Children.toArray(el?.props.children);
    const markEl = children[0] as React.ReactElement;
    expect(markEl.type).toBe('mark');
    expect(markEl.props.children).toBe('সালাত');
  });
});
