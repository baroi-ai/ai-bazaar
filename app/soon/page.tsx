import React from "react";
import Link from "next/link";

export default function ComingSoonPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center text-zinc-400 animate-in fade-in duration-500 bg-[#0a0a0a]">
      <div className="relative mb-8 mt-10">
        {/* Glow effect */}
        <div className="absolute -inset-4 bg-sky-500/20 rounded-full blur-xl opacity-50" />

        <div className="relative bg-[#0e0e0e] p-6 rounded-3xl border border-zinc-800 shadow-2xl">
          {/* Construction / Tools SVG */}
          <svg className="h-16 w-16 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.83M11.42 15.17l-4.996-4.996m4.996 4.996l-4.996 4.996m4.996-4.996L6.424 10.174m0 0L2.25 6m4.174 4.174l4.996-4.996M6.424 10.174L2.25 14.348m4.174-4.174A5.969 5.969 0 0112 6c1.657 0 3.159.671 4.25 1.75l-4.83 4.828" />
          </svg>
        </div>

        {/* Decorative sparkle SVG */}
        <svg className="absolute -top-3 -right-3 h-8 w-8 text-sky-400 animate-pulse drop-shadow-[0_0_8px_rgba(14,165,233,0.8)]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.646 3.011c.214-.645 1.134-.645 1.348 0l1.378 4.153a2.25 2.25 0 001.442 1.442l4.153 1.378c.645.214.645 1.134 0 1.348l-4.153 1.378a2.25 2.25 0 00-1.442 1.442l-1.378 4.153c-.214.645-1.134.645-1.348 0l-1.378-4.153a2.25 2.25 0 00-1.442-1.442L3.011 12.652c-.645-.214-.645-1.134 0-1.348l4.153-1.378a2.25 2.25 0 001.442-1.442l1.378-4.153z" />
        </svg>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Coming Soon</h1>

      <p className="max-w-md text-base text-zinc-500 leading-relaxed mb-10">
        We are currently building this feature.
        <br />
        It will be available on AI Bazaars shortly.
      </p>

      {/* Return Button */}
      <Link href="/">
        <button className="bg-sky-500 hover:bg-sky-400 text-[#0a0a0a] font-bold h-12 px-6 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all hover:scale-105 gap-2">
          {/* Arrow Left SVG */}
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 10.5L3 15m0 0l6 4.5M3 15h18" />
          </svg>
          Return to Dashboard
        </button>
      </Link>
    </div>
  );
}