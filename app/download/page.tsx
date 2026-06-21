import React from "react";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  Download,
  Monitor,
  TerminalSquare,
  Smartphone,
  XCircle,
  Cpu,
  Zap,
  Box
} from "lucide-react";

// Massive SEO Boost: This native metadata tells Google exactly how to rank your page.
// It will also generate beautiful preview cards when people share your link on Twitter/Discord.
export const metadata: Metadata = {
  title: "Download AI Bazaar Engine | Run Local AI Models",
  description: "Turn your computer into a private AI powerhouse. Download the AI Bazaar Engine for Windows, macOS, and Linux to run AI models locally with zero setup.",
  keywords: "download AI Bazaar, local AI engine, run AI offline, Windows AI daemon, Mac AI daemon, private AI models, Pixi runtime",
  openGraph: {
    title: "Download AI Bazaar Engine",
    description: "Turn your computer into a private AI powerhouse. Run AI models locally with zero setup.",
    type: "website",
  },
};

export default function DownloadEnginePage() {
  return (
    <main className="min-h-screen text-zinc-100 selection:bg-cyan-500/30 font-sans flex flex-col overflow-x-hidden">
      <Navbar />

      {/* Main Content Wrapper - Adjusted padding for mobile screens */}
      <div className="flex-1 flex flex-col items-center w-full px-4 py-10 md:py-16 lg:py-24">

        {/* Semantic HTML: Using <section> for SEO structure */}
        <section className="max-w-3xl text-center space-y-5 md:space-y-6 mb-12 md:mb-16 mt-4 md:mt-8">
          <div className="inline-flex items-center justify-center p-3 bg-zinc-900 border border-zinc-800 rounded-2xl mb-2 md:mb-4 shadow-2xl">
            <Cpu className="w-6 h-6 md:w-8 md:h-8 text-cyan-400" />
          </div>
          {/* Scaled H1 for mobile vs desktop */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500 pb-1">
            AI Bazaar Engine
          </h1>
          {/* Fixed the missing "T" and adjusted mobile text sizes */}
          <p className="text-base sm:text-lg md:text-xl text-zinc-400 leading-relaxed max-w-2xl mx-auto px-2">
            Turn your computer into a private AI powerhouse. This tiny background app links your browser to your hardware, letting you download and run AI models & Apps instantly.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-4 text-xs sm:text-sm font-medium text-zinc-500">
            <span className="flex items-center gap-1.5 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800/50"><Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400" /> Fast Execution</span>
            <span className="flex items-center gap-1.5 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800/50"><Box className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" /> Isolated Sandbox</span>
            <span className="flex items-center gap-1.5 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800/50">Listening on Port 4500</span>
          </div>
        </section>

        {/* Desktop Downloads Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-5xl mb-12 px-2">

          {/* Windows Card */}
          <div className="bg-[#0c0c0e] border border-zinc-800 hover:border-blue-500/50 transition-all rounded-3xl p-6 md:p-8 flex flex-col items-center text-center group relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Monitor className="w-10 h-10 md:w-12 md:h-12 text-zinc-300 mb-4 md:mb-6 group-hover:text-blue-400 transition-colors" />
            <h2 className="text-xl md:text-2xl font-bold mb-2">Windows</h2>
            <p className="text-zinc-500 text-xs md:text-sm mb-6 md:mb-8 flex-1">Windows 10 & 11 (64-bit)</p>
            <a
              href="/downloads/ai-bazaar-daemon-windows.zip"
              className="w-full flex items-center justify-center gap-2 py-3 md:py-3.5 rounded-xl bg-zinc-100 hover:bg-white text-black font-bold transition-colors active:scale-95"
            >
              <Download className="w-4 h-4 md:w-5 md:h-5" /> Download
            </a>
          </div>

          {/* macOS Card */}
          <div className="bg-[#0c0c0e] border border-zinc-800 hover:border-zinc-500 transition-all rounded-3xl p-6 md:p-8 flex flex-col items-center text-center group relative overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.02)]">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-zinc-300 to-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <svg viewBox="0 0 384 512" className="w-10 h-10 md:w-11 md:h-11 fill-zinc-300 mb-4 md:mb-6 group-hover:fill-zinc-100 transition-colors" xmlns="http://www.w3.org/2000/svg">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
            <h2 className="text-xl md:text-2xl font-bold mb-2">macOS</h2>
            <p className="text-zinc-500 text-xs md:text-sm mb-6 md:mb-8 flex-1">Universal (Apple Silicon & Intel)</p>
            <a
              href="/downloads/ai-bazaar-daemon-macos.zip"
              className="w-full flex items-center justify-center gap-2 py-3 md:py-3.5 rounded-xl bg-zinc-100 hover:bg-white text-black font-bold transition-colors active:scale-95"
            >
              <Download className="w-4 h-4 md:w-5 md:h-5" /> Download
            </a>
          </div>

          {/* Linux Card */}
          <div className="bg-[#0c0c0e] border border-zinc-800 hover:border-amber-500/50 transition-all rounded-3xl p-6 md:p-8 flex flex-col items-center text-center group relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <TerminalSquare className="w-10 h-10 md:w-12 md:h-12 text-zinc-300 mb-4 md:mb-6 group-hover:text-amber-400 transition-colors" />
            <h2 className="text-xl md:text-2xl font-bold mb-2">Linux</h2>
            <p className="text-zinc-500 text-xs md:text-sm mb-6 md:mb-8 flex-1">Ubuntu, Debian, Fedora (x64)</p>
            <a
              href="/downloads/ai-bazaar-daemon-linux.tar.gz"
              className="w-full flex items-center justify-center gap-2 py-3 md:py-3.5 rounded-xl bg-zinc-100 hover:bg-white text-black font-bold transition-colors active:scale-95"
            >
              <Download className="w-4 h-4 md:w-5 md:h-5" /> Download
            </a>
          </div>

        </section>

        {/* Mobile Not Supported Notice */}
        <section className="w-full max-w-2xl bg-red-500/5 border border-red-500/10 rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-6 text-center sm:text-left mb-8 mx-2">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 relative mt-1">
            <Smartphone className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
            <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500 absolute -bottom-1 -right-1 bg-[#050505] rounded-full" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-bold text-zinc-200 mb-1.5">Mobile Devices Not Supported</h3>
            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
              The AI Bazaar Engine requires desktop-class hardware and native operating system virtualization to execute heavy AI models. iOS and Android devices currently do not support the local Pixi runtimes required for offline generation.
            </p>
          </div>
        </section>
      </div>

      <Footer />

      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  );
}
