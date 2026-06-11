'use client';

import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Support() {
  const [copied, setCopied] = useState(false);
  const emailAddress = "support@aibazaars.store";

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(emailAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset confirmation after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans flex flex-col relative overflow-hidden">
      
      {/* Subtle Premium Background Gradient Effects */}
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full bg-sky-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-25%] w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />
      
      <Navbar />
      
      <div className="flex-grow max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Support & Contact</h1>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Have a model request, a bug report, or a business inquiry regarding AI Bazaars? Reach out directly through any of our channels below.
          </p>
        </div>

        {/* Centralized Channels Container with a subtle inner gradient border */}
        <div className="bg-gradient-to-b from-zinc-900/40 to-zinc-950/60 border border-zinc-900 p-6 md:p-8 rounded-3xl max-w-2xl mx-auto shadow-2xl backdrop-blur-md">
          <div className="space-y-4">
            
            {/* 1. Official Support Email (Copy to Clipboard Setup) */}
            <button 
              onClick={handleCopyEmail}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900/30 hover:bg-zinc-900/70 border border-zinc-800/50 hover:border-sky-500/50 text-left transition-all duration-300 group focus:outline-none"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#0a0a0a] border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-sky-400 group-hover:scale-105 transition-all duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Email Support</p>
                  <p className="text-xs text-zinc-500">{emailAddress}</p>
                </div>
              </div>
              
              {/* Dynamic Action Label */}
              <span className={`text-xs font-medium px-2.5 py-1 rounded-md transition-all duration-300 ${copied ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800/40 text-zinc-400 group-hover:text-zinc-200'}`}>
                {copied ? 'Copied!' : 'Click to copy'}
              </span>
            </button>

            {/* 2. Brand Instagram: @aibazaar.store */}
            <a 
              href="https://instagram.com/aibazaar.store" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center space-x-4 p-4 rounded-xl bg-zinc-900/30 hover:bg-zinc-900/70 border border-zinc-800/50 hover:border-sky-500/50 transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-[#0a0a0a] border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-sky-400 group-hover:scale-105 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Platform Instagram</p>
                <p className="text-xs text-zinc-400">@aibazaar.store</p>
              </div>
            </a>

            {/* 3. Personal Instagram: @baroi.ai */}
            <a 
              href="https://instagram.com/baroi.ai" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center space-x-4 p-4 rounded-xl bg-zinc-900/30 hover:bg-zinc-900/70 border border-zinc-800/50 hover:border-sky-500/50 transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-[#0a0a0a] border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-sky-400 group-hover:scale-105 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Founder Instagram</p>
                <p className="text-xs text-zinc-400">@baroi.ai</p>
              </div>
            </a>

            {/* 4. X / Twitter Connection Handle */}
            <a 
              href="https://x.com/baroi_ai" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center space-x-4 p-4 rounded-xl bg-zinc-900/30 hover:bg-zinc-900/70 border border-zinc-800/50 hover:border-sky-500/50 transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-[#0a0a0a] border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-sky-400 group-hover:scale-105 transition-all duration-300">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.6.75zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">X / Twitter</p>
                <p className="text-xs text-zinc-500">@baroi_ai</p>
              </div>
            </a>

          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}