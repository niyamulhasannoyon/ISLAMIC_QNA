'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleGoogleAdminLogin = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      let googleCredential = '';

      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        const google = (window as any).google;
        await new Promise<void>((resolve) => {
          google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'demo-google-client-id.apps.googleusercontent.com',
            callback: (response: any) => {
              if (response.credential) {
                googleCredential = response.credential;
              }
              resolve();
            },
          });
          google.accounts.id.prompt();
          setTimeout(resolve, 3000);
        });
      }

      const res = await fetch('/api/v1/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialToken: googleCredential || undefined,
          isAdminLogin: true,
          mockUser: !googleCredential
            ? {
                email: 'niyamulhasanbd@gmail.com',
                name: 'নিয়ামুল হাসান (Admin)',
                picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
              }
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'গুগল সাইন-ইন সম্পন্ন করা যায়নি।');
      }

      // If user is authorized admin, redirect to /admin; otherwise redirect to home page /
      if (data.user && data.user.role === 'admin') {
        router.push('/admin');
        router.refresh();
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'গুগল সাইন-ইন সম্পন্ন করা যায়নি।');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfc] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-bengali">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 mb-3.5 shadow-inner">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              এডমিন সিস্টেম লগইন
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
              ইসলামিক ফতোয়া ও গবেষণা প্ল্যাটফর্ম কন্ট্রোল প্যানেল
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleAdminLogin}
            disabled={googleLoading}
            className="w-full py-3 px-4 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{googleLoading ? 'গুগলে এডমিন লগইন হচ্ছে...' : 'Google দিয়ে এডমিন লগইন করুন'}</span>
          </button>

          {/* Footer Navigation Link */}
          <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800/80 text-center">
            <Link
              href="/"
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors inline-flex items-center gap-1.5 font-medium"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>পাবলিক ফতোয়া সার্চ ইঞ্জিনে ফিরে যান</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
