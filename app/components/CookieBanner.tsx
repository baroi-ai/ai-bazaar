'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if the user has already consented
    const consent = localStorage.getItem('ai-bazaars-cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('ai-bazaars-cookie-consent', 'true');
    setShowBanner(false);
  };

  const declineCookies = () => {
    // Even if declined, we set a flag so we don't bother them every page load
    localStorage.setItem('ai-bazaars-cookie-consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 md:p-6 animate-in slide-in-from-bottom-10 duration-500 pb-24 md:pb-6 pointer-events-none">
      <div className="max-w-5xl mx-auto bg-[#0e0e0e]/95 backdrop-blur-xl border border-zinc-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-5 md:p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 pointer-events-auto">
        
        {/* Text Section */}
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-white font-bold mb-1 flex items-center justify-center md:justify-start gap-2">
            <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            We Value Your Privacy
          </h3>
          <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">
            We use essential cookies to make our site work. With your consent, we may also use non-essential cookies to improve user experience and analyze website traffic. By clicking "Accept All", you agree to our website's cookie use as described in our{" "}
            <Link href="/privacy" className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors">
              Privacy Policy
            </Link>.
          </p>
        </div>

        {/* Buttons Section */}
        <div className="flex flex-row gap-3 w-full md:w-auto shrink-0">
          <button 
            onClick={declineCookies}
            className="flex-1 md:flex-none px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-sm font-medium transition-colors"
          >
            Decline
          </button>
          <button 
            onClick={acceptCookies}
            className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300  text-[#0a0a0a] text-sm font-bold shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-colors"
          >
            Accept All
          </button>
        </div>

      </div>
    </div>
  );
}