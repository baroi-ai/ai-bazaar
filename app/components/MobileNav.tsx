'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // --- 1. HOOKS RUN FIRST ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- 2. CONDITIONAL REDIRECT / HIDE CHECK ---
  const hiddenRoutes = ['/login', '/soon', '/not-found'];
  if (hiddenRoutes.includes(pathname)) {
    return null;
  }

  // Helper to determine active link color
  const getLinkClass = (path: string) => {
    return pathname === path
      ? "text-sky-400"
      : "text-zinc-500 hover:text-zinc-300 transition-colors";
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">

      {/* --- POPUP MENU --- */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 w-40 bg-[#12141d] border border-zinc-800 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-4 duration-200 z-50"
        >
          <button className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition-colors w-full text-left">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            Image
          </button>
          <button className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition-colors w-full text-left">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
            Layer
          </button>
          <button className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition-colors w-full text-left">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
            Edit
          </button>
          <button className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition-colors w-full text-left">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></svg>
            More
          </button>
        </div>
      )}

      {/* --- BOTTOM NAVBAR --- */}
      <div className="bg-[#050508] border-t border-zinc-800/80 flex items-center justify-between px-2 h-16 pb-safe relative">

        {/* Home */}
        <Link href="/" onClick={() => setIsMenuOpen(false)} className={`flex-1 flex flex-col items-center justify-center gap-1 mt-1 ${getLinkClass('/')}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* pricing */}
        <Link href="/pricing" onClick={() => setIsMenuOpen(false)} className={`flex-1 flex flex-col items-center justify-center gap-1 mt-1 ${getLinkClass('/pricing')}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="5" width="20" height="14" rx="2.5" />
            <path d="M2 10h20" />
          </svg>
          <span className="text-[10px] font-medium">Billings</span>
        </Link>

        {/* Central FAB (Plus Button) */}
        <div className="flex-1 flex justify-center items-center relative -top-3">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-14 h-14 bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.4)] text-[#0a0a0a] transition-transform active:scale-95"
            aria-label="Create Menu"
          >
            <svg
              className={`w-7 h-7 transition-transform duration-300 ${isMenuOpen ? 'rotate-45' : 'rotate-0'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </button>
        </div>

        {/* Assets */}
        <Link href="/assets" onClick={() => setIsMenuOpen(false)} className={`flex-1 flex flex-col items-center justify-center gap-1 mt-1 ${getLinkClass('/assets')}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            <path d="M9 14l2 2 4-4" />
          </svg>
          <span className="text-[10px] font-medium">Assets</span>
        </Link>

        {/* Download / Engine (Swapped out Profile and added the download layout icon) */}
        <Link href="/download" onClick={() => setIsMenuOpen(false)} className={`flex-1 flex flex-col items-center justify-center gap-1 mt-1 ${getLinkClass('/download')}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span className="text-[10px] font-medium">Download</span>
        </Link>

      </div>
    </div>
  );
}