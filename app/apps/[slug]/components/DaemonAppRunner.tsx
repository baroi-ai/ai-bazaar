"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Play,
  AlertTriangle,
  X,
  Download
} from "lucide-react";

type DaemonAppRunnerProps = {
  appName: string;
  appSlug: string;
  appIcon?: string;
  appId?: string;
  downloadLinks: {
    image_link: string;
    internal_port?: string | number;
    is_gpu?: boolean;
    is_fallback?: boolean;
  };
};

export default function DaemonAppRunner({ appName, appSlug, appIcon = "", appId = "", downloadLinks }: DaemonAppRunnerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [showDaemonModal, setShowDaemonModal] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    const userAgent = typeof window !== "undefined" ? navigator.userAgent || navigator.vendor : "";
    if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())) {
      setIsMobile(true);
    }
  }, []);

  const handleInstallClick = () => {
    if (isMobile) {
      setShowMobileModal(true);
      return;
    }
    setShowDaemonModal(true);
  };

  return (
    <>
      <div className="w-full flex flex-col gap-3 mt-2">
        <div className="flex gap-2 w-full">
          <button
            onClick={handleInstallClick}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-extrabold text-lg shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" /> Install & Run Locally
          </button>
        </div>
      </div>

      {mounted && createPortal(
        <>
          {showMobileModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
              <div className="bg-[#0c0c0e] border border-zinc-800 p-6 rounded-2xl max-w-md w-full text-center shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button
                  onClick={() => setShowMobileModal(false)}
                  className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>

                <h3 className="text-xl font-black text-zinc-100 tracking-tight">Desktop Required</h3>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  AI models require desktop environments to run locally. Please visit this page on a desktop computer.
                </p>
                <button
                  onClick={() => setShowMobileModal(false)}
                  className="mt-5 w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-sm transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {showDaemonModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
              <div className="bg-[#0c0c0e] border border-zinc-800 p-6 rounded-2xl max-w-md w-full text-center shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button
                  onClick={() => setShowDaemonModal(false)}
                  className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
                  <Download className="w-6 h-6 text-blue-400" />
                </div>

                <h3 className="text-xl font-black text-zinc-100 tracking-tight">Desktop App Required</h3>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  Download the AI Bazaar desktop app, then search for and install <strong>{appName}</strong>.
                </p>

                <div className="mt-5 flex flex-col gap-2">
                  <a
                    href="/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-black font-bold text-sm transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                  >
                    <Download className="w-4 h-4" /> Download Desktop App
                  </a>
                  <button
                    onClick={() => setShowDaemonModal(false)}
                    className="w-full py-2.5 text-zinc-500 hover:text-zinc-300 font-medium text-xs transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </>
  );
}