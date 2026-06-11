"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function PlatformWarningModal({ platforms }: { platforms: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  useEffect(() => {
    // Only run on the client and if platforms exist
    if (typeof window === "undefined" || !platforms || platforms.length === 0) return;

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    // 1. Detect the user's OS
    const isAndroid = /android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isWindows = /Win/i.test(userAgent);
    const isMac = /Mac/i.test(userAgent) && !isIOS; // Ensure it doesn't trigger on iPhones
    const isLinux = /Linux/i.test(userAgent) && !isAndroid; // Ensure it doesn't trigger on Androids

    // 2. Normalize the DB platforms array to uppercase
    const normalizedPlatforms = platforms.map(p => p.toUpperCase());
    
    // 3. Check what the app supports
    const supportsAll = normalizedPlatforms.includes("ALL");
    const supportsAndroid = normalizedPlatforms.includes("ANDROID");
    const supportsIOS = normalizedPlatforms.includes("IOS") || normalizedPlatforms.includes("APPLE");
    const supportsWindows = normalizedPlatforms.includes("WINDOWS") || normalizedPlatforms.includes("PC");
    const supportsMac = normalizedPlatforms.includes("MAC") || normalizedPlatforms.includes("MACOS") || normalizedPlatforms.includes("APPLE");
    const supportsLinux = normalizedPlatforms.includes("LINUX");

    // 4. Trigger the warning if there is a mismatch
    if (!supportsAll) {
      if (isAndroid && !supportsAndroid) {
        setWarningMessage("This app is not supported on Android devices.");
        setIsOpen(true);
      } else if (isIOS && !supportsIOS) {
        setWarningMessage("This app is not supported on iOS devices.");
        setIsOpen(true);
      } else if (isWindows && !supportsWindows) {
        setWarningMessage("This app is not supported on Windows.");
        setIsOpen(true);
      } else if (isMac && !supportsMac) {
        setWarningMessage("This app is not supported on macOS.");
        setIsOpen(true);
      } else if (isLinux && !supportsLinux) {
        setWarningMessage("This app is not supported on Linux.");
        setIsOpen(true);
      }
    }
  }, [platforms]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
        
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 border border-amber-500/20">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">Unsupported Operating System</h3>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            {warningMessage} You can still view the details, but you will not be able to install or run the native binary on this machine.
          </p>
          
          <button 
            onClick={() => setIsOpen(false)}
            className="w-full py-3 px-4 bg-zinc-100 hover:bg-white text-black font-bold rounded-xl transition-colors"
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}