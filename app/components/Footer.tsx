"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // Helper function to apply the active color dynamically for bottom links
  const getLinkStyle = (path: string) => {
    return pathname === path
      ? "text-sky-400 font-medium transition"
      : "text-zinc-400 hover:text-sky-400 transition";
  };

  return (
    // Added pb-16 for mobile to ensure the links aren't hidden behind the browser's bottom navigation bar
    <footer className="pt-12 pb-20 md:pb-8 mt-12 w-full">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* TOP SECTION: Brand & Socials */}
        <div className="mb-8 flex flex-col items-center md:items-start text-center md:text-left">
          <Link href="/" className="inline-block mb-5 group focus:outline-none">
            <h2 className="text-xl font-bold tracking-wide text-sky-500 group-hover:text-sky-400 transition-colors">
              AI Bazaar
            </h2>
          </Link>

          {/* Social Media Icons */}
          <div className="flex items-center space-x-3">
            {/* Instagram 1 */}
            <a
              href="https://instagram.com/aibazaar.store"
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-sky-400 hover:bg-zinc-800/80 transition-all shadow-sm focus:outline-none"
              aria-label="Instagram"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>

            {/* Instagram 2 */}
            <a
              href="https://instagram.com/baroi.ai"
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-sky-400 hover:bg-zinc-800/80 transition-all shadow-sm focus:outline-none"
              aria-label="Instagram"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>

            {/* Chat / Message */}
            <a
              href="mailto:support@aibazaars.store"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-sky-400 hover:bg-zinc-800/80 transition-all shadow-sm focus:outline-none"
              aria-label="Contact"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
            </a>

            {/* X (Twitter) */}
            <a
              href="https://x.com/baroi_ai"
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-sky-400 hover:bg-zinc-800/80 transition-all shadow-sm focus:outline-none"
              aria-label="X (Twitter)"
            >
              <svg
                className="w-[14px] h-[14px]"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.6.75zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Subtle Divider Line */}
        <div className="w-full border-t border-zinc-800/60 my-6"></div>

        {/* BOTTOM SECTION: Copyright, Status Badges & Links */}
        {/* Added w-full and increased gap on mobile to ensure stacking doesn't squish elements */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-0 w-full">
          {/* Left Side: Copyright & Badges */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 w-full md:w-auto">
            <span className="text-xs text-zinc-400 font-medium">
              © {new Date().getFullYear()} Baroi AI. All rights reserved.
            </span>

            {/* Version Badge */}
            <span className="text-[10px] md:text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full font-mono">
              v1.0.0
            </span>

            {/* Systems Operational Indicator */}
            <Link
              href="https://status.aibazaars.store/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full cursor-pointer group hover:bg-emerald-500/20 transition-colors"
              title="All systems are running normally"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] md:text-xs font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
                Systems Operational
              </span>
            </Link>
          </div>

          {/* Right Side: Links */}
          {/* Added w-full on mobile, explicitly centered them, and spaced out gap-y for easier tapping */}
          <nav className="flex flex-wrap justify-center md:justify-end items-center gap-x-6 gap-y-4 text-xs w-full md:w-auto mt-2 md:mt-0">
            <Link href="/about" className={getLinkStyle("/about")}>
              About
            </Link>
            <Link href="/apps" className={getLinkStyle("/apps")}>
              Apps
            </Link>
            <Link href="/pricing" className={getLinkStyle("/pricing")}>
              Pricing
            </Link>
            <Link href="/terms" className={getLinkStyle("/terms")}>
              Terms
            </Link>
            <Link href="/refund" className={getLinkStyle("/refund")}>
              Refund
            </Link>
            <Link href="/privacy" className={getLinkStyle("/privacy")}>
              Privacy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
