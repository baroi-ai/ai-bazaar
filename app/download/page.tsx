import React from "react";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Image from "next/image";
import {
  Download,
  Monitor,
  TerminalSquare,
  Smartphone,
  XCircle,
  Zap,
  Shield,
  Cpu,
  Box,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Download AI Bazaar Engine v1.0.0 | Run Local AI Models",
  description:
    "One-click install and run local AI models and open-source apps on your own hardware. Download the AI Bazaar Engine for Windows and Linux.",
  keywords:
    "download AI Bazaar, local AI engine, run AI offline, Windows AI daemon, Linux AI daemon, Podman AI, private AI models",
  openGraph: {
    title: "Download AI Bazaar Engine v1.0.0",
    description:
      "One-click launcher for local AI models and open-source apps. Powered by Podman.",
    type: "website",
  },
};

const VERSION = "1.0.0";

const WINDOWS_URL =
  "https://github.com/baroi-ai/ai-bazaar/releases/download/Engine_4.0/AI-Bazaar-Windows-Installer-Setup.exe";
const LINUX_URL =
  "https://github.com/baroi-ai/ai-bazaar/releases/download/Engine_5.0/ai-bazaar-engine-linux-podman.zip";

export default function DownloadEnginePage() {
  return (
    <main className="min-h-screen bg-[#050507] text-zinc-100 font-sans overflow-x-hidden flex flex-col">
      <Navbar />

      {/* ── HERO ── */}
      <section className="pt-16 md:pt-24 pb-12 md:pb-16 px-4 md:px-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">

        {/* Left */}
        <div className="text-center lg:text-left">
          <p className="text-[11px] font-bold tracking-[0.2em] text-cyan-500 uppercase mb-4">
            AI Bazaar Engine · v{VERSION}
          </p>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.05] tracking-tight text-white mb-5">
            One‑Click<br />
            Install Local<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              AI &amp; Open Source Apps
            </span>
          </h1>

          <p className="text-zinc-400 text-base leading-relaxed max-w-md mb-8 mx-auto lg:mx-0">
            Run AI models and GitHub apps directly on your hardware.
            No cloud. No subscriptions. No terminal.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 mb-8">
            <a
              href={WINDOWS_URL}
              className="flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-black font-bold px-6 py-3.5 rounded-xl transition-colors text-sm"
            >
              <Monitor className="w-4 h-4" />
              Download for Windows
            </a>
            <a
              href={LINUX_URL}
              className="flex items-center justify-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm"
            >
              <TerminalSquare className="w-4 h-4" />
              Download for Linux
            </a>
          </div>

          {/* OS row */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-zinc-500">
            <span className="text-zinc-600">Available for</span>
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Monitor className="w-3.5 h-3.5" /> Windows
            </span>
            <span className="flex items-center gap-1.5 text-zinc-300">
              <TerminalSquare className="w-3.5 h-3.5" /> Linux
            </span>
            <span className="flex items-center gap-1.5 text-zinc-600 line-through">
              macOS (soon)
            </span>
          </div>
        </div>

        {/* Right — demo video, hidden on mobile */}
        <div className="relative hidden lg:block">
          <div className="rounded-2xl border border-white/10 overflow-hidden shadow-[0_0_80px_rgba(6,182,212,0.07)]">
            <video
              src="/download/demo.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto"
            />
          </div>
          <div className="absolute -inset-10 bg-cyan-500/5 blur-3xl rounded-full -z-10 pointer-events-none" />
        </div>
      </section>

      {/* ── FEATURE STRIP ── */}
      <section className="border-y border-white/5 py-5 px-4">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs sm:text-sm text-zinc-400">
          {[
            { icon: <Zap className="w-4 h-4 text-amber-400" />, text: "GPU Accelerated" },
            { icon: <Shield className="w-4 h-4 text-emerald-400" />, text: "100% Private" },
            { icon: <Box className="w-4 h-4 text-blue-400" />, text: "Container Isolated" },
            { icon: <Cpu className="w-4 h-4 text-cyan-400" />, text: "NVIDIA + AMD Support" },
          ].map((f) => (
            <span key={f.text} className="flex items-center gap-2">
              {f.icon} {f.text}
            </span>
          ))}
        </div>
      </section>

      {/* ── DOWNLOAD CARDS ── */}
      <section className="py-16 md:py-20 px-4 md:px-10 max-w-5xl mx-auto w-full">
        <p className="text-[11px] font-bold tracking-[0.2em] text-cyan-500 uppercase mb-3">
          Download
        </p>
        <h2 className="text-2xl md:text-4xl font-black text-white mb-2">
          Get the Engine
        </h2>
        <p className="text-zinc-500 text-sm mb-10">
          Version{" "}
          <span className="text-zinc-300 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
            v{VERSION}
          </span>{" "}
          · Free &amp; open source
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Windows */}
          <div className="group relative bg-[#0c0c0f] border border-white/8 hover:border-blue-500/40 rounded-2xl p-6 flex flex-col transition-all duration-200">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl" />
            <Monitor className="w-7 h-7 text-zinc-400 group-hover:text-blue-400 transition-colors mb-4" />
            <h3 className="text-base font-bold text-white mb-1">Windows</h3>
            <p className="text-zinc-600 text-xs mb-4">Windows 10 &amp; 11 · 64-bit</p>
            <div className="flex flex-col gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full text-[10px] font-semibold w-fit">
                <Box className="w-3 h-3" /> Podman Desktop required
              </span>
              <span className="inline-flex items-center gap-1.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2.5 py-1 rounded-full text-[10px] font-semibold w-fit">
                WSL2 required
              </span>
              <span className="inline-flex items-center gap-1.5 bg-zinc-700/40 text-zinc-400 border border-zinc-700/40 px-2.5 py-1 rounded-full text-[10px] font-semibold w-fit">
                Virtualization enabled
              </span>
            </div>
            <a
              href={WINDOWS_URL}
              className="mt-auto flex items-center justify-center gap-2 py-3 rounded-xl bg-white hover:bg-zinc-100 text-black font-bold text-sm transition-colors active:scale-95"
            >
              <Download className="w-4 h-4" /> Download .exe
            </a>
          </div>

          {/* macOS — disabled */}
          <div className="relative bg-[#0c0c0f] border border-white/5 rounded-2xl p-6 flex flex-col opacity-50">
            <svg viewBox="0 0 384 512" className="w-7 h-7 fill-zinc-600 mb-4" xmlns="http://www.w3.org/2000/svg">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
            <h3 className="text-base font-bold text-zinc-400 mb-1">macOS</h3>
            <p className="text-zinc-600 text-xs mb-4">Apple Silicon &amp; Intel</p>
            <div className="flex-1" />
            <button disabled className="mt-auto flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 text-zinc-600 font-bold text-sm cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          {/* Linux */}
          <div className="group relative bg-[#0c0c0f] border border-white/8 hover:border-amber-500/40 rounded-2xl p-6 flex flex-col transition-all duration-200">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl" />
            <TerminalSquare className="w-7 h-7 text-zinc-400 group-hover:text-amber-400 transition-colors mb-4" />
            <h3 className="text-base font-bold text-white mb-1">Linux</h3>
            <p className="text-zinc-600 text-xs mb-4">Ubuntu · Debian · Fedora · x64</p>
            <div className="flex flex-col gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-[10px] font-semibold w-fit">
                <Box className="w-3 h-3" /> Podman required
              </span>
              <span className="inline-flex items-center gap-1.5 bg-zinc-700/40 text-zinc-400 border border-zinc-700/40 px-2.5 py-1 rounded-full text-[10px] font-semibold w-fit">
                Bundled in .zip
              </span>
            </div>
            <a
              href={LINUX_URL}
              className="mt-auto flex items-center justify-center gap-2 py-3 rounded-xl bg-white hover:bg-zinc-100 text-black font-bold text-sm transition-colors active:scale-95"
            >
              <Download className="w-4 h-4" /> Download .zip
            </a>
          </div>

        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 md:py-20 px-4 md:px-10 max-w-5xl mx-auto w-full">
        <p className="text-[11px] font-bold tracking-[0.2em] text-cyan-500 uppercase mb-3">
          How it works
        </p>
        <h2 className="text-2xl md:text-4xl font-black text-white mb-2">Simple as 1‑2‑3</h2>
        <p className="text-zinc-500 text-sm mb-12">
          Three steps from zero to running AI on your own hardware.
        </p>

        <div className="space-y-16 md:space-y-24">

          {/* Step 1 */}
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            <div className="flex-1 lg:order-1 text-center lg:text-left">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-black text-base mb-4">
                1
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white mb-3">
                Install &amp; Start the Engine
              </h3>
              <p className="text-zinc-400 leading-relaxed text-sm max-w-sm mx-auto lg:mx-0">
                Download and run the installer. The engine starts Podman, detects your GPU, and connects automatically. No terminal needed.
              </p>
            </div>
            <div className="flex-1 w-full lg:order-2">
              <div className="rounded-xl border border-white/8 overflow-hidden shadow-xl">
                <Image
                  src="/download/logs.png"
                  alt="AI Bazaar Engine logs showing Podman starting successfully"
                  width={1010}
                  height={728}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-16">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-black text-base mb-4">
                2
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white mb-3">
                Browse &amp; Install Apps
              </h3>
              <p className="text-zinc-400 leading-relaxed text-sm max-w-sm mx-auto lg:mx-0">
                Find any AI model or open-source GitHub app and click Install. The engine pulls and sets up everything for you automatically.
              </p>
            </div>
            <div className="flex-1 w-full">
              <div className="rounded-xl border border-white/8 overflow-hidden shadow-xl">
                <Image
                  src="/download/main.png"
                  alt="AI Bazaar Engine explore tab showing available AI apps"
                  width={1010}
                  height={728}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            <div className="flex-1 lg:order-1 text-center lg:text-left">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-black text-base mb-4">
                3
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white mb-3">
                Run &amp; Open in Browser
              </h3>
              <p className="text-zinc-400 leading-relaxed text-sm max-w-sm mx-auto lg:mx-0">
                The app starts in an isolated container and opens its web UI in your browser. Your data never leaves your machine.
              </p>
            </div>
            <div className="flex-1 lg:order-2 w-full grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/8 overflow-hidden shadow-xl">
                <Image
                  src="/download/running.png"
                  alt="AI Bazaar Engine showing app running on port 8899"
                  width={1010}
                  height={728}
                  className="w-full h-auto"
                />
              </div>
              <div className="rounded-xl border border-white/8 overflow-hidden shadow-xl">
                <Image
                  src="/download/apps.png"
                  alt="App web UI running in browser"
                  width={1010}
                  height={728}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── MOBILE NOT SUPPORTED ── */}
      <section className="px-4 md:px-10 pb-16 max-w-5xl mx-auto w-full">
        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start gap-4">
          <div className="relative shrink-0 mt-0.5">
            <Smartphone className="w-6 h-6 text-red-400" />
            <XCircle className="w-4 h-4 text-red-500 absolute -bottom-1 -right-1 bg-[#050507] rounded-full" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200 mb-1">
              Mobile devices not supported
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              The AI Bazaar Engine needs desktop hardware and OS-level container support via Podman. iOS and Android cannot run local AI containers. Use the free browser-based tools on mobile instead.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}