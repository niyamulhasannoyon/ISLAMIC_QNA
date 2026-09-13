"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import { UserSession } from "@/types/user";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserSession) => void;
  isAdminMode?: boolean;
}

export function AuthModal({ isOpen, onClose, onSuccess, isAdminMode = false }: AuthModalProps) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setError("");
      setName("");
      setEmail("");
      setPassword("");
    }
  }, [isOpen]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen && mounted) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, mounted]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: tab,
          email,
          password,
          name: tab === "register" ? name : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "প্রমাণীকরণ ব্যর্থ হয়েছে");
      }

      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || "লগইন করার সময় ত্রুটি ঘটেছে।");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      let googleCredential = "";

      if (typeof window !== "undefined" && (window as any).google?.accounts?.id) {
        const google = (window as any).google;
        await new Promise<void>((resolve) => {
          google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "demo-google-client-id.apps.googleusercontent.com",
            callback: (response: any) => {
              if (response.credential) {
                googleCredential = response.credential;
              }
              resolve();
            },
          });
          google.accounts.id.prompt();
          setTimeout(resolve, 1500);
        });
      }

      const res = await fetch("/api/v1/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialToken: googleCredential || undefined,
          isAdminLogin: isAdminMode,
          mockUser: !googleCredential
            ? {
                email: isAdminMode ? "niyamulhasanbd@gmail.com" : "user@gmail.com",
                name: isAdminMode ? "নিয়ামুল হাসান (Admin)" : "গুগল ইউজার",
                picture: "https://lh3.googleusercontent.com/a/default-user=s96-c",
              }
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "গুগল সাইন-ইন ব্যর্থ হয়েছে");
      }

      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || "গুগল সাইন-ইন সম্পন্ন করা যায়নি।");
    } finally {
      setGoogleLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-bengali">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xl p-6 sm:p-8 z-10 animate-in fade-in zoom-in-95 duration-200 my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="বন্ধ করুন"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {isAdminMode ? "এডমিন একাউন্ট প্রবেশ" : tab === "login" ? "সিস্টেমে লগইন করুন" : "নতুন একাউন্ট তৈরি করুন"}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            ইসলামিক ফতোয়া ও গবেষণা প্ল্যাটফর্মে আপনাকে স্বাগতম
          </p>
        </div>

        {/* Auth Mode Tabs */}
        {!isAdminMode && (
          <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 mb-6 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError("");
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                tab === "login"
                  ? "bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              লগইন
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setError("");
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                tab === "register"
                  ? "bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              রেজিস্ট্রেশন
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full mb-4 py-2.5 px-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2.5 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          <span>{googleLoading ? "গুগলে লগইন হচ্ছে..." : "Google দিয়ে সাইন ইন করুন"}</span>
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
            <span className="bg-white dark:bg-[#121215] px-2 text-zinc-400">অথবা ইমেইল দিয়ে</span>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === "register" && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                আপনার নাম (Full Name)
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="মুহাম্মাদ আব্দুল্লাহ"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              ইমেইল অ্যাড্রেস (Email)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              পাসওয়ার্ড (Password)
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>প্রসেসিং হচ্ছে...</span>
            ) : (
              <>
                <span>{tab === "login" ? "লগইন করুন" : "একাউন্ট তৈরি করুন"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

