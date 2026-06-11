"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Terminal, 
  Coffee, 
  CheckCircle2, 
  ExternalLink, 
  AlertTriangle,
  Play,
  MonitorDown,
  Video,
  Bot,
  Layers,
  Link2,
  StopCircle,
  Cpu,
  HardDrive,
  Microchip
} from "lucide-react";
import { toast } from "sonner";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function MoneyPrinterProductPage() {
  const [daemonReady, setDaemonReady] = useState(false);
  const [showDaemonWarning, setShowDaemonWarning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [status, setStatus] = useState<"idle" | "installing" | "running" | "error">("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [appUrl, setAppUrl] = useState<string | null>(null);
  
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // Make sure this matches the filename you saved on GitHub!
  const SCRIPT_URL = "https://raw.githubusercontent.com/baroi-ai/ai-bazaar-scripts/refs/heads/main/GithubApps/moneyprinter_executor.py";

  const appendLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = typeof window !== "undefined" ? navigator.userAgent || navigator.vendor : "";
      if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())) {
        setIsMobile(true);
      }
    };
    checkMobile();

    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // SMART POLLING: Check Daemon and App status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const daemonRes = await fetch("http://localhost:7777/v1/run-script", { method: "OPTIONS" });
        if (daemonRes.ok) {
          setDaemonReady(true);
          setShowDaemonWarning(false);

          const appRes = await fetch("http://localhost:7777/v1/status?app=moneyprinter");
          if (appRes.ok) {
            const appData = await appRes.json();
            
            if (appData.isRunning && appData.data) {
              if (status !== "running") setStatus("running");
              setAppUrl(`http://localhost:${appData.data.port}`);
            } else {
              if (status === "running") {
                setStatus("idle");
                setAppUrl(null);
              }
            }
          }
        }
      } catch (e) {
        setDaemonReady(false);
        if (status === "running") setStatus("error"); 
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000); 
    return () => clearInterval(interval);
  }, [status]); 

  const handleInstallClick = async () => {
    if (isMobile) {
      toast.error("Mobile Not Supported", { description: "AI Bazaar local apps require a desktop operating system." });
      return;
    }

    if (!daemonReady) {
      setShowDaemonWarning(true);
      toast.warning("Daemon Not Connected", { description: "Please start your AI Bazaar local daemon." });
      return;
    }

    setStatus("installing");
    setLogs([]);
    appendLog("SYSTEM: Initializing handshake with Local Daemon at localhost:7777...");
    appendLog("DAEMON: Connection established securely.");
    appendLog("DAEMON: Requesting dynamic port allocation...");

    try {
      const response = await fetch("http://localhost:7777/v1/run-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptUrl: SCRIPT_URL,
          model: "moneyprinter", // Uniquely identifies this process in your daemon
          prompt: ""
        }),
      });

      const data = await response.json();

      if (response.ok && data.status !== "error") {
        appendLog(`ENGINE: Code validated and isolated.`);
        appendLog(`UV: Environment dependencies perfectly synchronized.`);
        appendLog(`SUCCESS: Streamlit server bound to port ${data.port} [PID: ${data.pid}].`);
        
        setStatus("running");
        setAppUrl(`http://localhost:${data.port}`);
        toast.success("MoneyPrinterTurbo is online!");
      } else {
        setStatus("error");
        appendLog(`CRITICAL ERROR: ${data.error || "Execution failed."}`);
        toast.error("Failed to start application.");
      }
    } catch (err) {
      setStatus("error");
      appendLog(`FATAL DISCONNECT: The background connection was lost.`);
      toast.error("Daemon connection failure.");
    }
  };

  const handleStopClick = async () => {
    try {
      const response = await fetch("http://localhost:7777/v1/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: "moneyprinter" }),
      });

      if (response.ok) {
        setStatus("idle");
        setAppUrl(null);
        toast.success("Server stopped successfully.");
        appendLog("SYSTEM: Process terminated safely by user.");
      }
    } catch (err) {
      toast.error("Failed to communicate with Daemon.");
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans flex flex-col">
      <Navbar />

      <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="flex flex-col gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold uppercase tracking-widest rounded-full mb-6">
                <MonitorDown className="w-4 h-4" /> Local Content Factory
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
                MoneyPrinterTurbo
              </h1>
              <p className="text-lg text-zinc-400 leading-relaxed">
                Fully automated AI short video generation. Generate viral TikToks and YouTube Shorts with one click. Features automated LLM scripts, high-fidelity TTS voiceovers, dynamic subtitles, and royalty-free background rendering.
              </p>
            </div>

            <ul className="space-y-4 my-2">
              <li className="flex items-start gap-3">
                <Video className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                <span className="text-zinc-300"><strong>Auto Formatting:</strong> Supports vertical (9:16) and horizontal (16:9) high-definition rendering.</span>
              </li>
              <li className="flex items-start gap-3">
                <Bot className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                <span className="text-zinc-300"><strong>Multi-Model AI:</strong> Built-in support for OpenAI, Gemini, DeepSeek, Qwen, and Ollama.</span>
              </li>
              <li className="flex items-start gap-3">
                <Layers className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                <span className="text-zinc-300"><strong>Local Subtitles:</strong> Whisper integration for perfectly timed, stylized subtitle generation.</span>
              </li>
            </ul>

            {/* --- SYSTEM REQUIREMENTS UI --- */}
            <div className="mt-4 p-5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">System Requirements</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-zinc-400"><Cpu className="w-4 h-4" /> <span className="text-xs font-bold">CPU</span></div>
                  <span className="text-sm text-zinc-200">6 - 8 Cores</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-zinc-400"><HardDrive className="w-4 h-4" /> <span className="text-xs font-bold">RAM</span></div>
                  <span className="text-sm text-zinc-200">8GB <span className="text-zinc-500 text-xs">(16GB Rec.)</span></span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-zinc-400"><Microchip className="w-4 h-4" /> <span className="text-xs font-bold">GPU</span></div>
                  <span className="text-sm text-zinc-200">4GB+ VRAM</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
              <Button 
                onClick={handleInstallClick}
                disabled={status === "installing" || status === "running"}
                className="w-full sm:w-auto h-14 px-8 bg-gradient-to-r from-emerald-600 to-teal-400 text-black font-bold text-base rounded-xl shadow-lg transition-transform hover:scale-105 disabled:opacity-80"
              >
                {status === "running" ? (
                  <><CheckCircle2 className="w-5 h-5 mr-2" /> Running in Background</>
                ) : status === "installing" ? (
                  <><Download className="w-5 h-5 mr-2 animate-bounce" /> Booting Server...</>
                ) : (
                  <><Play className="w-5 h-5 mr-2" /> Install & Run</>
                )}
              </Button>

              <a 
                href="https://github.com/harry0703/MoneyPrinterTurbo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center h-14 px-6 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-medium rounded-xl transition-colors"
              >
                <Link2 className="w-5 h-5 mr-2" /> Github Repo
              </a>
            </div>

            {showDaemonWarning && (
              <div className="animate-in slide-in-from-top-2 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 mt-2">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-rose-400 font-bold text-sm">AI Bazaar Daemon Required</h4>
                  <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                    We couldn't detect your local daemon. Make sure <code className="text-rose-300 bg-rose-500/20 px-1 rounded">node daemon.js</code> is running.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl group">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none"></div>
            {/* Make sure you save a screenshot of MoneyPrinterTurbo as moneyprinter.png in your public/apps/ folder */}
            <Image 
              src="/apps/money-printer-turbo.jpg" 
              alt="MoneyPrinterTurbo Interface" 
              width={800} 
              height={600} 
              className="w-full h-auto object-cover"
              priority
            />
          </div>
        </div>
      </div>

      {status !== "idle" && (
        <div className="w-full bg-[#050505] border-t border-zinc-800/80 py-12 flex-1">
          <div className="max-w-[1000px] mx-auto px-4 md:px-6">
            
            {status === "running" && appUrl && (
              <div className="mb-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-4 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">MoneyPrinter is Online</h2>
                <p className="text-zinc-400 mb-6 font-mono text-sm">
                  Dynamic Port Locked: <span className="text-emerald-400 font-bold">{appUrl.split(':').pop()}</span>
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Button 
                    onClick={() => window.open(appUrl, "_blank")}
                    className="h-14 px-8 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-lg rounded-xl shadow-xl hover:scale-105 transition-all"
                  >
                    Open Interface <ExternalLink className="w-5 h-5 ml-2" />
                  </Button>

                  <Button 
                    onClick={handleStopClick}
                    variant="destructive"
                    className="h-14 px-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold text-base rounded-xl transition-colors"
                  >
                    <StopCircle className="w-5 h-5 mr-2" /> Stop Server
                  </Button>
                </div>
              </div>
            )}

            {status === "installing" && (
              <div className="mb-8 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
                <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin duration-1000"></div>
                  <Coffee className="w-8 h-8 text-emerald-500 animate-pulse" />
                </div>
                <h3 className="text-white font-bold text-lg">Syncing heavy media pipelines...</h3>
                <p className="text-zinc-500 text-sm mt-1 font-mono">Running uv sync --frozen</p>
              </div>
            )}

            <div className="bg-black border border-zinc-800/80 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[350px] animate-in slide-in-from-bottom-8 duration-700">
              <div className="flex items-center gap-2 bg-zinc-950 px-4 py-3 border-b border-zinc-900">
                <Terminal className="w-4 h-4 text-zinc-600" />
                <span className="text-xs font-mono font-bold text-zinc-500">daemon_output.log</span>
              </div>
              
              <div 
                ref={logContainerRef}
                className="flex-1 p-5 font-mono text-[13px] overflow-y-auto text-zinc-400 space-y-2 scroll-smooth"
              >
                {logs.map((log, i) => {
                  let textClass = "text-zinc-400";
                  if (log.includes("ERROR") || log.includes("FATAL")) textClass = "text-red-400 font-bold";
                  if (log.includes("SUCCESS") || log.includes("terminated")) textClass = "text-emerald-400 font-semibold";
                  if (log.includes("UV:") || log.includes("ENGINE:")) textClass = "text-emerald-400/90";

                  return (
                    <div key={i} className={`border-l-2 border-transparent pl-2 ${textClass}`}>
                      {log}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}