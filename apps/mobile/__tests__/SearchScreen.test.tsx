import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchScreen from '../app/(tabs)/index';
import { ThemeProvider } from '../src/context/ThemeContext';
import { SettingsProvider } from '../src/context/SettingsContext';
import { SyncProvider } from '../src/context/SyncContext';

// Mock getDatabase
jest.mock('../src/db/database', () => ({
  getDatabase: jest.fn(async () => ({
    getFirstAsync: jest.fn(async () => null),
    getAllAsync: jest.fn(async () => []),
    runAsync: jest.fn(async () => ({ changes: 0 })),
  })),
}));

// Mock executeSearch
jest.mock('../src/services/api', () => ({
  executeSearch: jest.fn(async (q: string) => ({
    results: [
      {
        id: 'fatwa_test_1',
        source: 'at-tahreek',
        source_url: 'https://example.com/1',
        title: 'নামাযে মনোযোগ রাখার উপায়',
        question: 'নামাযে খুশু-খুযু কীভাবে অর্জন করব?',
        answer: 'সালাতে মনোযোগ বজায় রাখার জন্য অর্থের দিকে খেয়াল রাখতে হবে।',
        category: 'সালাত',
        tags: ['সালাত', 'খুশু'],
        scholar: 'ড. আসাদুল্লাহ আল-গালিব',
        published_date: '2024-01-01',
        scraped_at: '2024-01-01',
        sha256_hash: 'abc123',
      },
    ],
    total: 1,
    isOfflineResult: false,
  })),
}));

describe('SearchScreen Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SettingsProvider>
            <SyncProvider>
              <SearchScreen />
            </SyncProvider>
          </SettingsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

  it('renders search bar and filter chips', async () => {
    const { getByPlaceholderText, getByText } = renderComponent();

    // Verify search bar is present
    const input = getByPlaceholderText('প্রশ্ন বা বিষয় লিখুন (যেমন: ওযু, নামাজ, রোজা)...');
    expect(input).toBeTruthy();

    // Verify filter chips exist
    expect(getByText('সব উৎস')).toBeTruthy();
    expect(getByText('আত-তাহরীক')).toBeTruthy();
    expect(getByText('আল-কাউসার')).toBeTruthy();
    expect(getByText('আল-ইতিসাম')).toBeTruthy();
  });

  it('allows user to enter search query', async () => {
    const { getByPlaceholderText } = renderComponent();
    const input = getByPlaceholderText('প্রশ্ন বা বিষয় লিখুন (যেমন: ওযু, নামাজ, রোজা)...');

    fireEvent.changeText(input, 'নামায');
    expect(input.props.value).toBe('নামায');
  });
});
