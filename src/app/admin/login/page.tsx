'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Lock, ShieldCheck, AlertCircle, AlertTriangle } from 'lucide-react';

export default function AdminLoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [blockedNotice, setBlockedNotice] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleCredentialResponse = async (response: any) => {
    if (!response?.credential) {
      setError('গুগল থেকে ক্রেডেনশিয়াল পাওয়া যায়নি।');
      return;
    }

    setGoogleLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialToken: response.credential,
          isAdminLogin: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'গুগল সাইন-ইন সম্পন্ন করা যায়নি।');
      }

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

  useEffect(() => {
    const clientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      '613533933761-4j489d46m3h3368uqkp7t98u33t9fjli.apps.googleusercontent.com';

    let isSubscribed = true;

    const initializeGoogleSignIn = () => {
      if (
        typeof window !== 'undefined' &&
        (window as any).google?.accounts?.id &&
        googleBtnRef.current
      ) {
        const google = (window as any).google;
        try {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
          });

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = '';
            google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'outline',
              size: 'large',
              width: 320,
              text: 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
            });
          }

          if (isSubscribed) {
            setScriptLoaded(true);
            setBlockedNotice(false);
          }
          return true;
        } catch (e) {
          console.error('Google accounts initialization error:', e);
        }
      }
      return false;
    };

    if (!initializeGoogleSignIn()) {
      const interval = setInterval(() => {
        if (initializeGoogleSignIn()) {
          clearInterval(interval);
        }
      }, 200);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (isSubscribed && !scriptLoaded) {
          setBlockedNotice(true);
        }
      }, 4000);

      return () => {
        isSubscribed = false;
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }

    return () => {
      isSubscribed = false;
    };
  }, []);

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

          {/* Adblocker / Script blocked notice */}
          {blockedNotice && !scriptLoaded && (
            <div className="mb-6 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span className="leading-relaxed">
                গুগল সাইন-ইন সার্ভিস লোড করা যায়নি। অনুগ্রহ করে আপনার ব্রাউজারের Adblocker বা ট্র্যাকিং প্রতিরোধ সাময়িকভাবে নিষ্ক্রিয় করে পেজটি রিফ্রেশ করুন।
              </span>
            </div>
          )}

          {/* Google Sign In Container */}
          <div className="flex flex-col items-center justify-center min-h-[50px]">
            <div ref={googleBtnRef} className="flex justify-center w-full min-h-[44px]" />
            {!scriptLoaded && !blockedNotice && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 animate-pulse py-2">
                গুগল সাইন-ইন সার্ভিস লোড হচ্ছে...
              </p>
            )}
            {googleLoading && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-pulse mt-3">
                এডমিন একাউন্ট যাচাই করা হচ্ছে...
              </p>
            )}
          </div>

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
