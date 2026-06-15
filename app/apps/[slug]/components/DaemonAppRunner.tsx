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
  Download,
  Smartphone,
  Trash2
} from "lucide-react";

type DaemonAppRunnerProps = {
  appName: string;
  appSlug: string;
  scriptUrl: string; 
};

export default function DaemonAppRunner({ appName, appSlug, scriptUrl }: DaemonAppRunnerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [status, setStatus] = useState<"idle" | "installing" | "running" | "stopping" | "error">("idle");
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
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

    if (scriptUrl) {
      fetch("http://127.0.0.1:4500/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: scriptUrl })
      })
      .then(res => res.json())
      .then(data => setIsInstalled(data.installed))
      .catch(() => { /* Daemon is likely offline, ignore silently */ });
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [scriptUrl]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, showTerminalModal]);

  const handleInstallClick = () => {
    if (isMobile) {
      setShowMobileModal(true);
      return;
    }
    if (!scriptUrl) {
      alert("Error: Docker Image URL is missing from the database.");
      return;
    }

    setShowTerminalModal(true);
    setStatus("installing");
    setLogs([]);
    appendLog(`SYSTEM: Connecting to AI Bazaar Local Daemon...`);

    const ws = new WebSocket('ws://127.0.0.1:4500/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      appendLog(`SYSTEM: Connected! Sending launch command for ${appName}...`);
      ws.send(JSON.stringify({ 
        action: 'RUN', 
        image: scriptUrl, 
        port: '8899',      
        slug: appSlug
      }));
    };

    ws.onmessage = (event) => {
      const msg = event.data;
      appendLog(msg);

      if (msg.includes("App already installed!") || msg.includes("Booting up AI Engine")) {
        setStatus("running");
        setIsInstalled(true); 
        setAppUrl("http://127.0.0.1:8899");
      }

      if (msg.includes("❌ Download failed") || msg.includes("❌ Download Cancelled")) {
        setStatus("error");
      }
    };

    ws.onerror = () => {
      setStatus("error");
      setShowDaemonModal(true);
      if (wsRef.current) wsRef.current.close();
    };

    ws.onclose = () => {
      setStatus((prev) => {
        if (prev !== "stopping" && !isDeleting) {
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
    appendLog(`SYSTEM: Sending termination signal...`);

    try {
      await fetch("http://127.0.0.1:4500/stop", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: appSlug }) 
      });
    } catch (e) {
      console.warn("Failed to reach daemon for stopping.", e);
    }

    if (wsRef.current) {
      wsRef.current.close();
      appendLog(`SYSTEM: Disconnected and safely terminated process.`);
    }
    
    setStatus("idle");
    setAppUrl(null);
  };

  const handleDeleteClick = async () => {
    setIsDeleting(true);
    appendLog(`SYSTEM: Initiating complete uninstallation...`);

    try {
      await fetch("http://127.0.0.1:4500/stop", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: appSlug }) 
      });
      appendLog(`SYSTEM: App container safely stopped.`);
    } catch (e) {
      console.warn("Stop failed during deletion", e);
    }

    try {
      const res = await fetch("http://127.0.0.1:4500/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: scriptUrl })
      });
      
      if (res.ok) {
        appendLog(`✅ SYSTEM: AI models securely deleted from local storage.`);
        setIsInstalled(false);
      } else {
        appendLog(`❌ ERROR: Failed to delete app files.`);
      }
    } catch (e) {
      appendLog(`❌ ERROR: Failed to communicate with Daemon for deletion.`);
    }

    if (wsRef.current) {
      wsRef.current.close();
    }
    
    setIsDeleting(false);
    setStatus("idle");
    setAppUrl(null);
  };

  return (
    <>
      <div className="w-full flex flex-col gap-3 mt-2">
        {status === "idle" && (
          <div className="flex gap-2 w-full">
            <button 
              onClick={handleInstallClick}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-extrabold text-lg shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" /> {isInstalled ? "Launch App" : "Install & Run Locally"}
            </button>
            {isInstalled && (
              <button
                onClick={() => {
                  setShowTerminalModal(true);
                  handleDeleteClick();
                }}
                className="flex items-center justify-center px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 transition-colors"
                title="Uninstall App"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {(status === "installing" || status === "error") && !isDeleting && (
          <div className="flex gap-2 w-full">
            <button 
              onClick={() => setShowTerminalModal(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border font-bold text-lg transition-all ${
                status === "error" 
                ? "bg-red-500/10 border-red-500/30 text-red-500" 
                : "bg-zinc-800 border-zinc-700 text-amber-400 animate-pulse"
              }`}
            >
              <Terminal className="w-5 h-5" /> 
              {status === "error" ? "Installation Failed" : "Downloading AI Engine..."}
            </button>
            
            {/* Quick Cancel Button on Main Page during Download */}
            {status === "installing" && (
              <button
                onClick={handleStopClick}
                className="flex items-center justify-center px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 transition-colors"
                title="Cancel Download"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {(status === "running" || status === "stopping" || isDeleting) && appUrl && (
          <div className="flex flex-col gap-2 w-full">
            <a 
              href={appUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95"
            >
              <ExternalLink className="w-5 h-5" /> Open App Interface
            </a>
            <div className="flex gap-2 w-full">
              <button onClick={() => setShowTerminalModal(true)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-bold transition-colors">
                <Terminal className="w-4 h-4" /> View Logs
              </button>
              <button 
                onClick={handleStopClick} 
                disabled={status === "stopping" || isDeleting}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-bold transition-colors ${
                  status === "stopping" || isDeleting
                  ? "bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed" 
                  : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-500"
                }`}
              >
                {status === "stopping" ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Stopping...
                  </>
                ) : (
                  <>
                    <StopCircle className="w-4 h-4" /> Disconnect
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {mounted && createPortal(
        <>
          {showMobileModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative">
                <button onClick={() => setShowMobileModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
                    <Smartphone className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Desktop Required</h3>
                  <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                    Local AI daemon apps require a desktop operating system (Windows, Mac, or Linux) to run native processes. Please revisit this page on your computer.
                  </p>
                  <button onClick={() => setShowMobileModal(false)} className="w-full py-3 px-4 bg-zinc-100 hover:bg-white text-black font-bold rounded-xl transition-colors">
                    Got it
                  </button>
                </div>
              </div>
            </div>
          )}

          {showDaemonModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
                <button onClick={() => setShowDaemonModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 border border-rose-500/20">
                    <AlertTriangle className="w-8 h-8 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Daemon Not Found</h3>
                  <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                    To run {appName} securely on your hardware, you need to start the AI Bazaar Local Bridge. 
                  </p>
                  <div className="w-full bg-black border border-zinc-800 rounded-lg p-4 mb-6 font-mono text-sm text-zinc-300 flex items-center justify-center">
                    ./ai-bazaar-daemon
                  </div>
                  <a href="#" className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-black font-bold rounded-xl transition-colors">
                    <Download className="w-4 h-4" /> Download Daemon Setup
                  </a>
                </div>
              </div>
            </div>
          )}

          {showTerminalModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10 bg-black/90 backdrop-blur-md animate-in fade-in">
              <div className="bg-[#050505] border border-zinc-800 rounded-2xl w-full max-w-4xl h-[70vh] flex flex-col shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between bg-zinc-950 px-4 py-3 border-b border-zinc-900">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs font-mono font-bold text-zinc-400">daemon_execution :: {appSlug}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {(status === "running" || status === "stopping" || isDeleting) && (
                      <span className={`flex items-center gap-2 text-xs font-bold ${(status === "stopping" || isDeleting) ? "text-amber-500" : "text-emerald-500"}`}>
                        <span className="relative flex h-2 w-2">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${(status === "stopping" || isDeleting) ? "bg-amber-400" : "bg-emerald-400"}`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${(status === "stopping" || isDeleting) ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                        </span>
                        {(status === "stopping" || isDeleting) ? "Processing..." : "Online"}
                      </span>
                    )}
                    <button onClick={() => setShowTerminalModal(false)} className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 rounded p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div ref={logContainerRef} className="flex-1 p-5 font-mono text-[13px] overflow-y-auto text-zinc-400 space-y-2 scroll-smooth">
                  {logs.length === 0 && <span className="text-zinc-600">Waiting for output...</span>}
                  {logs.map((log, i) => {
                    let textClass = "text-zinc-400";
                    if (log.includes("ERROR") || log.includes("FATAL") || log.includes("❌")) textClass = "text-red-400 font-bold";
                    if (log.includes("SUCCESS") || log.includes("✅") || log.includes("⚡")) textClass = "text-emerald-400 font-semibold";
                    if (log.includes("DAEMON:") || log.includes("SYSTEM:") || log.includes("📥")) textClass = "text-amber-400/90";
                    return <div key={i} className={`border-l-2 border-transparent pl-2 ${textClass}`}>{log}</div>;
                  })}
                </div>

                {(status === "running" || status === "stopping" || status === "installing" || isDeleting || (status === "idle" && logs.length > 0)) && (
                  <div className="bg-zinc-950 p-4 border-t border-zinc-900 flex justify-end gap-3">
                    
                    {appUrl && status === "running" && (
                      <a 
                        href={appUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 py-2 px-4 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-sm font-bold transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" /> Open Interface
                      </a>
                    )}
                    
                    {/* Disconnect / Cancel Button inside Modal */}
                    {status !== "idle" && (
                      <button 
                        onClick={handleStopClick} 
                        // UNLOCKED during "installing" so the user can abort!
                        disabled={status === "stopping" || isDeleting}
                        className={`flex items-center gap-2 py-2 px-4 rounded-lg border text-sm font-bold transition-colors ${
                          status === "stopping" || isDeleting
                          ? "bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed" 
                          : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-500"
                        }`}
                      >
                        {status === "stopping" ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Stopping...
                          </>
                        ) : status === "installing" ? (
                          <>
                            <X className="w-4 h-4" /> Cancel Download
                          </>
                        ) : (
                          <>
                            <StopCircle className="w-4 h-4" /> Disconnect
                          </>
                        )}
                      </button>
                    )}

                    {/* Uninstall Button */}
                    <button 
                      onClick={handleDeleteClick} 
                      disabled={status === "installing" || status === "stopping" || isDeleting || !isInstalled}
                      className={`flex items-center gap-2 py-2 px-4 rounded-lg border text-sm font-bold transition-colors ${
                        status === "installing" || status === "stopping" || isDeleting || !isInstalled
                        ? "bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed" 
                        : "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-500"
                      }`}
                    >
                      {isDeleting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Uninstalling...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" /> Uninstall
                        </>
                      )}
                    </button>

                  </div>
                )}
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </>
  );
}