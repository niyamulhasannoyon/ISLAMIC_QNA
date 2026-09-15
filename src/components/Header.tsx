"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Moon, Sun, User as UserIcon, LogOut, Shield, ChevronDown, Lock } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { AuthModal } from "./AuthModal";
import { UserSession } from "@/types/user";
import { cn } from "@/lib/utils";

export function Header() {
  const [isDark, setIsDark] = useState(true);
  const { t, lang } = useLanguage();
  const [user, setUser] = useState<UserSession | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (root.classList.contains("dark")) {
      setIsDark(true);
    } else {
      setIsDark(false);
    }

    // Check user auth status on mount
    fetch("/api/v1/auth/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check" }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch((e) => console.error("Could not check user auth:", e));
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      setIsDark(true);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      setUser(null);
      setIsDropdownOpen(false);
      window.location.reload();
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return (
    <header className="border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/75 dark:bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-30 transition-colors">
      <div className="max-w-5xl mx-auto px-3.5 sm:px-6 h-13 sm:h-14 flex items-center justify-between gap-2">
        {/* Brand & Editorial Archive Masthead */}
        <Link href="/" className="flex items-center gap-2.5 min-w-0 shrink group transition-opacity">
          <Logo size="sm" />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors font-sans">
              Deen<span className="text-emerald-600 dark:text-emerald-400">QnA</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bengali">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              দ্বীন গবেষণা
            </span>
          </div>
        </Link>

        {/* Right Action: Language Switcher, Theme Toggle & User Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Multi-language Selector */}
          <LanguageSwitcher />

          {/* Theme Toggle with Glassmorphism */}
          <button
            onClick={toggleTheme}
            aria-label={t.header.toggleTheme}
            title={t.header.toggleTheme}
            className="h-8 w-8 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/60 dark:bg-zinc-900/60 backdrop-blur-md flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors shrink-0"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          {/* User Auth Section */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-medium text-zinc-800 dark:text-zinc-200"
              >
                {user.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.picture} alt={user.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="truncate max-w-[90px] sm:max-w-[120px] font-bengali">{user.name}</span>
                <ChevronDown className="h-3 w-3 text-zinc-400 shrink-0" />
              </button>

              {/* User Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 py-1.5 text-xs font-bengali animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{user.name}</div>
                    <div className="text-[11px] text-zinc-400 font-mono truncate">{user.email}</div>
                  </div>

                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-emerald-600 dark:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 font-semibold"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      <span>এডমিন প্যানেল</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>লগআউট করুন</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm shadow-emerald-600/20 transition-all font-bengali shrink-0"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>লগইন</span>
            </button>
          )}

          {/* Direct Admin Login Link if not logged in */}
          {!user && (
            <Link
              href="/admin/login"
              title="এডমিন লগইন"
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800/80 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors hidden sm:flex items-center justify-center shrink-0"
            >
              <Lock className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Auth Modal Component */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(u) => setUser(u)}
      />
    </header>
  );
}
