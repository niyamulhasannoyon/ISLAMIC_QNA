"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showDot?: boolean;
}

const sizeMap = {
  sm: "h-7 w-7 text-xs rounded-md",
  md: "h-9 w-9 text-sm rounded-lg",
  lg: "h-12 w-12 text-lg rounded-xl",
  xl: "h-16 w-16 text-2xl rounded-2xl",
};

export function Logo({ className, size = "sm", showDot = true }: LogoProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0 font-serif font-bold select-none transition-all duration-200",
        "bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-[#09090b]",
        "border border-zinc-300 dark:border-zinc-700/80 shadow-sm",
        "text-zinc-900 dark:text-zinc-100 hover:border-emerald-500/50 dark:hover:border-emerald-500/40",
        sizeMap[size],
        className
      )}
      aria-label="فتوى Logo"
    >
      <span className="font-serif leading-none tracking-tight">فت</span>
      {showDot && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-zinc-950" />
      )}
    </div>
  );
}
