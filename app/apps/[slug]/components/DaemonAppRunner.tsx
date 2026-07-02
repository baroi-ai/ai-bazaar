"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Play,
  Terminal,
  AlertTriangle,
  ExternalLink,
  StopCircle,
  X,
  Download
} from "lucide-react";

type DaemonAppRunnerProps = {
  appName: string;
  appSlug: string;
  appIcon?: string;
  appId?: string;
  downloadLinks: {
    image_link: string; // <-- Updated to match PocketBase and Go Daemon
    internal_port?: string | number;
    is_gpu?: boolean;
    is_fallback?: boolean;
  };
};

export default function DaemonAppRunner({ appName, appSlug, appIcon = "", appId = "", downloadLinks }: DaemonAppRunnerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [status, setStatus] = useState<"idle" | "installing" | "running" | "stopping" | "error">("idle");
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDaemonOffline, setIsDaemonOffline] = useState(false);

  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [progressLogs, setProgressLogs] = useState<Record<string, string>>({});

  const [showDaemonModal, setShowDaemonModal] = useState(false);
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const appendLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    setMounted(true);
    const userAgent = typeof window !== "undefined" ? navigator.userAgent || navigator.vendor : "";
    if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())) {
      setIsMobile(true);
    }

    // <-- Updated to check image_link
    if (downloadLinks?.image_link) {
      try {
        fetch("http://127.0.0.1:4500/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_link: downloadLinks.image_link, slug: appSlug })
        })
          .then(res => res.json())
          .then(data => {
            setIsInstalled(data.installed);
            setIsDaemonOffline(false);
          })
          .catch(() => {
            setIsDaemonOffline(true);
          });
      } catch (err) {
        setIsDaemonOffline(true);
      }
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [downloadLinks, appSlug]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, progressLogs, showTerminalModal]);

  const handleInstallClick = async () => {
    if (isMobile) {
      setShowMobileModal(true);
      return;
    }

    // <-- Updated error check
    if (!downloadLinks?.image_link) {
      alert("Error: Docker Image config details missing from PocketBase.");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:4500/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_link: downloadLinks.image_link, slug: appSlug }),
        signal: AbortSignal.timeout(1500)
      }).catch(() => { throw new Error("Offline"); });

      if (!res.ok) throw new Error("Offline");

      const data = await res.json();
      setIsInstalled(data.installed);
      setIsDaemonOffline(false);
    } catch (err) {
      setIsDaemonOffline(true);
      setShowDaemonModal(true);
      return;
    }

    setShowTerminalModal(true);
    setStatus("installing");
    setLogs([]);
    setProgressLogs({});
    appendLog(`SYSTEM: Connecting to AI Bazaar Local Daemon...`);

    const ws = new WebSocket('ws://127.0.0.1:4500/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      appendLog(`SYSTEM: Connected! Requesting Docker Image pull...`);
      // <-- Updated payload to match Go Struct
      ws.send(JSON.stringify({
        action: 'RUN',
        slug: appSlug,
        app_name: appName,
        app_icon: appIcon,
        app_id: appId,
        image_link: downloadLinks.image_link,
        port: '8899',
        internal_port: downloadLinks.internal_port ? String(downloadLinks.internal_port) : undefined,
        is_gpu: downloadLinks.is_gpu ?? false,
        is_fallback: downloadLinks.is_fallback ?? false
      }));
    };

    ws.onmessage = (event) => {
      const msg = event.data;

      // Handle Docker progress bars if needed, or standard logs
      if (msg.startsWith("PROGRESS|")) {
        const parts = msg.split("|");
        if (parts.length >= 3) {
          const id = parts[1];
          const text = parts.slice(2).join("|");
          if (text.trim() === "") {
            setProgressLogs(prev => {
              const updated = { ...prev };
              delete updated[id];
              return updated;
            });
          } else {
            setProgressLogs(prev => ({ ...prev, [id]: text }));
          }
        }
        return;
      }

      appendLog(msg);

      if (msg.includes("🚀 ONLINE:")) {
        setStatus("running");
        setIsInstalled(true);
        // Extract port dynamically if possible, or fallback to 8899
        let matchedUrl = "http://127.0.0.1:8899";
        const urlMatch = msg.match(/https?:\/\/[a-zA-Z0-9.-]+:\d+/);
        if (urlMatch) {
          matchedUrl = urlMatch[0];
        }
        setAppUrl(matchedUrl);
        setProgressLogs({});
      }

      if (msg.includes("❌ ERROR:") || msg.includes("❌ Download Cancelled")) {
        setStatus("error");
        setProgressLogs({});
      }
    };

    ws.onerror = () => {
      setStatus("error");
      setIsDaemonOffline(true);
      if (wsRef.current) wsRef.current.close();
    };

    ws.onclose = () => {
      setStatus((prev) => {
        if (prev !== "stopping") {
          appendLog(`SYSTEM: Daemon connection closed.`);
          setAppUrl(null);
          return "idle";
        }
        return prev;
      });
    };
  };

  const handleStopClick = async () => {
    setStatus("stopping");
    setProgressLogs({});
    appendLog(`SYSTEM: Sending termination signal to Docker container...`);

    try {
      await fetch("http://127.0.0.1:4500/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: appSlug })
      });
    } catch (e) {
      console.warn(e);
    }

    // Wait 5 seconds to let the container stop cleanly in the background
    await new Promise((resolve) => setTimeout(resolve, 4000));

    if (wsRef.current) wsRef.current.close();
    setStatus("idle");
    setAppUrl(null);
  };

  return (
    <>
      <div className="w-full flex flex-col gap-3 mt-2">

        {/* --- ADDED CONNECTION INDICATOR HERE --- */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="relative flex h-2.5 w-2.5">
            {!isDaemonOffline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isDaemonOffline ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            {isDaemonOffline ? 'Engine Offline' : 'Engine Connected'}
          </span>
        </div>
        {/* --------------------------------------- */}

        {status === "idle" && (
          <div className="flex gap-2 w-full">
            <button
              onClick={handleInstallClick}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-extrabold text-lg shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" /> {isInstalled && !isDaemonOffline ? "Launch App" : "Install & Run Locally"}
            </button>
          </div>
        )}

        {(status === "installing" || status === "error") && (
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setShowTerminalModal(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border font-bold text-lg transition-all ${status === "error"
                  ? "bg-red-500/10 border-red-500/30 text-red-500"
                  : "bg-zinc-800 border-zinc-700 text-amber-400 animate-pulse"
                }`}
            >
              <Terminal className="w-5 h-5" />
              {status === "error" ? "Installation Failed" : "Downloading AI Engine..."}
            </button>
          </div>
        )}

        {(status === "running" || status === "stopping") && appUrl && (
          <div className="flex flex-col gap-2 w-full">
            <a href={appUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95">
              <ExternalLink className="w-5 h-5" /> Open App Interface
            </a>
            <div className="flex gap-2 w-full">
              <button onClick={() => setShowTerminalModal(true)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-bold transition-colors">
                <Terminal className="w-4 h-4" /> View Logs
              </button>
              <button onClick={handleStopClick} disabled={status === "stopping"} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-bold transition-colors bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-500">
                Stop Run
              </button>
            </div>
          </div>
        )}
      </div>

      {mounted && createPortal(
        <>
          {showMobileModal && (<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">...</div>)}

          {showDaemonModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
              <div className="bg-[#0c0c0e] border border-zinc-800 p-6 rounded-2xl max-w-md w-full text-center shadow-2xl relative">
                <button
                  onClick={() => setShowDaemonModal(false)}
                  className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4 border border-amber-500/20">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>

                <h3 className="text-xl font-black text-zinc-100 tracking-tight">AI Bazaar Engine Offline</h3>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  The local backend daemon isn't running. Kindly download and open the engine daemon app to host local models directly from your web interface.
                </p>

                <div className="mt-5 flex flex-col gap-2">
                  <a
                    href="/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-black font-bold text-sm transition-all"
                  >
                    <Download className="w-4 h-4" /> Download AI Bazaar Daemon
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

          {showTerminalModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10 bg-black/90 backdrop-blur-md">
              <div className="bg-[#050505] border border-zinc-800 rounded-2xl w-full max-w-4xl h-[70vh] flex flex-col shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between bg-zinc-950 px-4 py-3 border-b border-zinc-900 gap-4">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Terminal className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span className="text-xs font-mono font-bold text-zinc-400 truncate">daemon :: {appSlug}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {status === "running" && appUrl && (
                      <a
                        href={appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold transition-colors shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open App
                      </a>
                    )}

                    {status !== "idle" && status !== "error" && (
                      <button
                        onClick={handleStopClick}
                        disabled={status === "stopping"}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-500 disabled:opacity-50"
                      >
                        <StopCircle className="w-3.5 h-3.5" /> Stop Run
                      </button>
                    )}

                    <button onClick={() => setShowTerminalModal(false)} className="ml-2 text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 rounded p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div ref={logContainerRef} className="flex-1 p-5 font-mono text-[13px] overflow-y-auto text-zinc-400 space-y-2 scroll-smooth">
                  {logs.length === 0 && <span className="text-zinc-600">Waiting for output...</span>}

                  {logs.map((log, i) => {
                    let textClass = "text-zinc-400";
                    if (log.includes("ERROR") || log.includes("❌")) textClass = "text-red-400 font-bold";
                    if (log.includes("✅") || log.includes("🚀")) textClass = "text-emerald-400 font-semibold";
                    if (log.includes("SYSTEM:") || log.includes("📥")) textClass = "text-amber-400/90";
                    if (log.includes("⚙️") || log.includes("🐳")) textClass = "text-blue-300";
                    return <div key={i} className={`pl-2 ${textClass}`}>{log}</div>;
                  })}

                  {Object.values(progressLogs).map((text, i) => (
                    <div key={`prog-${i}`} className="pl-2 pt-2 text-cyan-400 font-bold animate-pulse">
                      {text}
                    </div>
                  ))}
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