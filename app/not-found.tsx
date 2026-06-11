import { Metadata } from "next";
import Link from "next/link";
import React from "react";

export const metadata: Metadata = {
  // Clears the yellow warning in your terminal
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "404 - Page Not Found | AI Bazaars",
  description: "The page you are looking for does not exist.",
  // Explicitly tell Google NOT to index this page
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-gray-100 px-4">
      <div className="text-center max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
        
        <h1 className="text-8xl md:text-9xl font-extrabold text-sky-500 mb-6 drop-shadow-[0_0_20px_rgba(14,165,233,0.3)]">
          404
        </h1>

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Oops! Page Not Found
        </h2>
        
        <p className="text-sm md:text-base text-zinc-500 mb-10 leading-relaxed">
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </p>

        <Link href="/">
          <button className="bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300  text-white font-semibold h-12 px-8 rounded-xl border border-zinc-700 inline-flex items-center transition-colors duration-200 gap-2">
            {/* Home SVG */}
            <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            Return to Home
          </button>
        </Link>
      </div>
    </div>
  );
}