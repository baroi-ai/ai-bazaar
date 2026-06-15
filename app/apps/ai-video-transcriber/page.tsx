"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  ScanText,
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileVideo,
  XCircle,
  Sparkles,
  Cpu,
  UploadCloud,
  Monitor,
  Smartphone,
  HardDrive,
  Globe,
  Zap,
  Music
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

// Add your Navbar and Footer imports (adjust path if needed)
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// --- SAFETY LIMITS ---
const MAX_FILE_SIZE_MB = 200;
const MAX_DURATION_SEC = 60;

export default function MediaToTextPage() {
  // --- STATE ---
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"video" | "audio" | null>(null);

  const [transcript, setTranscript] = useState<{
    text: string;
    chunks?: any[];
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [downloadProgress, setDownloadProgress] = useState<number>(0); // NEW: Progress bar state

  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- WORKER LIFECYCLE ---
  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    return () => {
      if (mediaSrc) URL.revokeObjectURL(mediaSrc);
    };
  }, [mediaSrc]);

  const resetResults = () => {
    setTranscript(null);
    setProgress("");
    setDownloadProgress(0);
    setIsProcessing(false);
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaType(null);
    if (mediaSrc) URL.revokeObjectURL(mediaSrc);
    setMediaSrc(null);
    resetResults();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- HANDLERS ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/");

    if (!isAudio && !isVideo) {
      toast.error("Please upload a valid audio or video file.");
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      toast.error(`File too large (${fileSizeMB.toFixed(1)}MB). Limit is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    if (mediaSrc) URL.revokeObjectURL(mediaSrc);

    resetResults();
    const url = URL.createObjectURL(file);

    const mediaElement = isAudio
      ? document.createElement("audio")
      : document.createElement("video");

    mediaElement.preload = "metadata";

    mediaElement.onloadedmetadata = () => {
      if (mediaElement.duration > MAX_DURATION_SEC) {
        toast.error(`Media too long (${mediaElement.duration.toFixed(0)}s). Limit is ${MAX_DURATION_SEC}s.`);
        URL.revokeObjectURL(url);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setMediaFile(file);
        setMediaSrc(url);
        setMediaType(isAudio ? "audio" : "video");
      }
    };

    mediaElement.onerror = () => {
      toast.error("Invalid media file.");
      URL.revokeObjectURL(url);
    };

    mediaElement.src = url;
  };

  const handleTranscribe = async () => {
    if (!mediaFile) return;

    setIsProcessing(true);
    setProgress("Initializing...");
    setDownloadProgress(0);

    try {
      // 1. YIELD THREAD: Give React a millisecond to paint the UI before the heavy decoding freezes the browser
      await new Promise((resolve) => setTimeout(resolve, 50));

      setProgress("Extracting audio...");
      
      // 2. YIELD THREAD: Ensure "Extracting audio..." renders
      await new Promise((resolve) => setTimeout(resolve, 50));

      const audioContext = new AudioContext({ sampleRate: 16000 });
      const arrayBuffer = await mediaFile.arrayBuffer();
      
      // This step is extremely heavy and blocks the UI on large videos
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const rawAudio = audioBuffer.getChannelData(0);

      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL("./transcribe.worker.ts", import.meta.url),
          { type: "module" },
        );

        workerRef.current.onmessage = (e) => {
          const { status, result, error, message, percent } = e.data;

          if (status === "downloading") {
            setProgress(message || "Downloading AI Model...");
            if (percent !== undefined) {
              setDownloadProgress(percent);
            }
          }

          if (status === "processing") {
            setProgress("Transcribing Audio...");
            setDownloadProgress(0); // Hide progress bar once complete
          }

          if (status === "success") {
            setTranscript(result);
            setIsProcessing(false);
            setProgress("Done!");
            toast.success("Transcription complete!");
          }

          if (status === "error") {
            console.error(error);
            setIsProcessing(false);
            toast.error("AI Error: " + error);
          }
        };
      }

      workerRef.current.postMessage({ audio: rawAudio });
    } catch (err) {
      console.error(err);
      toast.error("Failed to process media file. The format may be unsupported.");
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!transcript?.text) return;
    const textToCopy = transcript.text;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => toast.success("Copied to clipboard!"))
        .catch(() => fallbackCopy(textToCopy));
    } else {
      fallbackCopy(textToCopy);
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      toast.success("Copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy text.");
    }
    document.body.removeChild(textArea);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans flex flex-col">
      <Navbar />

      {/* --- SECTION 1: THE TOOL (Above the Fold) --- */}
      <div className="flex flex-col min-h-[calc(100vh-80px)] w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
        
        {/* MAIN PREVIEW AREA */}
        <div className="flex-1 bg-[#0e0e0e] border border-zinc-800/80 md:rounded-[2rem] rounded-2xl relative flex flex-col shadow-2xl overflow-hidden mb-6">
          
          <div className="flex-1 w-full h-full overflow-hidden relative flex flex-col p-4 md:p-8">
            
            {/* STATE 1: Empty */}
            {!mediaSrc && (
              <div className="flex flex-col items-center justify-center text-center p-6 md:p-12 w-full h-full animate-in fade-in zoom-in-95 duration-500">
                <ScanText className="h-16 w-16 mb-6 text-zinc-700" />
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">Media to Text AI</h1>
                <p className="text-zinc-400 max-w-md mb-8 text-sm md:text-base leading-relaxed">
                  Extract highly accurate text from video or audio files directly in your browser. Powered by OpenAI's Whisper model.
                </p>
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-medium uppercase tracking-wider">
                  <Cpu className="w-4 h-4" /> 100% Private Local Inference
                </div>
              </div>
            )}

            {/* STATE 2: Processing Overlay */}
            {isProcessing && !transcript && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0e0e0e]/90 backdrop-blur-sm animate-in fade-in rounded-[2rem]">
                
                {/* Visual indicator (Spinning loader OR Percentage Circle) */}
                {downloadProgress > 0 && downloadProgress < 100 ? (
                  <div className="w-16 h-16 relative flex items-center justify-center mb-4">
                    <svg className="animate-spin text-indigo-500/20 w-full h-full absolute" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75 text-indigo-500" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-xs font-bold text-indigo-400 absolute">{downloadProgress}%</span>
                  </div>
                ) : (
                  <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mb-4" />
                )}

                <p className="text-white font-bold text-lg animate-pulse">{progress}</p>
                
                {/* Dynamic Subtext / Progress Bar */}
                {downloadProgress > 0 && downloadProgress < 100 ? (
                  <>
                    <div className="w-64 bg-zinc-800 rounded-full h-2 mt-4 overflow-hidden border border-zinc-700">
                      <div className="bg-indigo-500 h-full transition-all duration-300 ease-out" style={{ width: `${downloadProgress}%` }}></div>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2 font-mono">Whisper-Tiny Model (75MB)</p>
                  </>
                ) : (
                  <p className="text-xs text-zinc-400 mt-2 font-mono">
                    {progress === "Extracting audio..." ? "Decompressing media file (this takes a moment)..." : "Running AI Inference..."}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-6 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-medium text-yellow-400">Keep tab open while processing</span>
                </div>
              </div>
            )}

            {/* STATE 3: Media Preview & Transcript View */}
            {mediaSrc && (
              <div className={`relative flex flex-col w-full max-w-4xl mx-auto flex-1 gap-6 animate-in fade-in duration-500 ${transcript ? 'justify-start' : 'justify-center items-center h-full'}`}>
                
                {/* Media Player Box */}
                <div className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-2 relative group flex-shrink-0 shadow-xl flex flex-col items-center justify-center">
                  {mediaType === "video" ? (
                    <video src={mediaSrc} controls className="w-full max-h-[30vh] object-contain rounded-xl" />
                  ) : (
                    <div className="w-full py-12 px-6 flex flex-col items-center gap-6">
                      <Music className="h-12 w-12 text-indigo-500 opacity-50" />
                      <audio src={mediaSrc} controls className="w-full max-w-md" />
                    </div>
                  )}
                  
                  {/* File Details Bar */}
                  <div className="w-full flex items-center justify-between px-3 py-2 mt-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {mediaType === "video" ? <FileVideo className="h-4 w-4 text-indigo-400 shrink-0" /> : <Music className="h-4 w-4 text-indigo-400 shrink-0" />}
                      <span className="text-xs text-zinc-400 truncate max-w-[150px] md:max-w-[300px]">{mediaFile?.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono font-medium shrink-0">
                      {((mediaFile?.size || 0) / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>

                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={clearMedia}
                    disabled={isProcessing}
                    className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-500 z-40"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>

                {/* Transcript Output Box */}
                {transcript && (
                  <div className="flex-1 w-full bg-[#0a0a0a] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-500 min-h-[250px] max-h-[50vh]">
                    
                    {/* Header */}
                    <div className="bg-zinc-900/80 px-4 py-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-bold text-white">Transcription Result</span>
                      </div>
                      <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/20 uppercase tracking-wider font-bold">
                        Whisper-Tiny
                      </span>
                    </div>

                    {/* Scrollable Text Area */}
                    <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-4">
                      {transcript.chunks && transcript.chunks.length > 0 ? (
                        transcript.chunks.map((chunk: any, i: number) => (
                          <div key={i} className="flex gap-4 group">
                            <span className="text-xs text-indigo-500/70 font-mono pt-1 select-none shrink-0 w-12 text-right">
                              {chunk.timestamp[0].toFixed(1)}s
                            </span>
                            <p className="text-zinc-300 text-sm leading-relaxed group-hover:text-white transition-colors">
                              {chunk.text}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {transcript.text}
                        </p>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

        {/* BOTTOM UPLOAD / GENERATE SECTION */}
        <div className="shrink-0 w-full flex flex-col items-center justify-center max-w-4xl mx-auto gap-3 mb-24 md:mb-0">
          
          {/* Status Pill */}
          {!mediaSrc && (
            <div className="flex items-center bg-[#0e0e0e] p-1.5 px-4 rounded-full border border-zinc-800 shadow-xl w-fit">
              <Sparkles className="w-3.5 h-3.5 mr-2 text-indigo-400" />
              <span className="text-[10px] md:text-xs text-zinc-400 font-medium">
                Supports MP4, MP3, WAV, WEBM (Max 60s)
              </span>
            </div>
          )}

          {/* Input Bar */}
          <div className="flex items-center gap-2 md:gap-3 w-full">
            <div className="shrink-0 relative">
              <Input
                ref={fileInputRef}
                id="media-upload-input"
                type="file"
                accept="video/*,audio/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isProcessing}
              />
              <Label
                htmlFor="media-upload-input"
                className={`cursor-pointer h-12 md:h-14 w-12 md:w-14 flex items-center justify-center rounded-xl md:rounded-2xl transition-all shadow-lg ${
                  mediaSrc 
                    ? "bg-indigo-500/10 border border-indigo-500/50 text-indigo-400" 
                    : "bg-[#0e0e0e] border border-zinc-800 text-zinc-400 hover:text-indigo-400 hover:border-zinc-600"
                }`}
              >
                <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
              </Label>
            </div>

            <div className="relative flex-grow h-12 md:h-14 bg-[#0e0e0e] border border-zinc-800 rounded-xl md:rounded-2xl flex items-center px-3 md:px-4 shadow-lg transition-colors focus-within:border-indigo-500/50 overflow-hidden">
              <span className="text-xs md:text-sm text-zinc-500 truncate pr-32 md:pr-40 select-none w-full">
                {isProcessing ? progress : transcript ? "Transcription Ready." : mediaSrc ? "Media loaded. Ready to transcribe." : "Upload media..."}
              </span>

              <div className="absolute right-1.5 md:right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                
                {/* Transcribe or Copy Button */}
                {transcript ? (
                  <Button
                    onClick={handleCopy}
                    className="h-9 md:h-10 px-4 md:px-6 rounded-lg md:rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-gray-900 text-xs md:text-sm font-bold shadow-lg shrink-0"
                  >
                    <Copy className="w-4 h-4 md:mr-1.5" /> <span className="hidden md:inline">Copy Text</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleTranscribe}
                    disabled={!mediaFile || isProcessing}
                    className={`h-9 md:h-10 px-4 md:px-6 rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm font-bold transition-all shadow-lg shrink-0 ${
                      !mediaFile || isProcessing
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-indigo-600 to-violet-500 hover:from-indigo-500 hover:to-violet-400 text-white hover:scale-105 active:scale-95"
                    }`}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ScanText className="w-4 h-4 md:mr-1.5" /> <span className="hidden md:inline">Transcribe</span>
                      </>
                    )}
                  </Button>
                )}

              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* --- SECTION 2: SEO & APP EXPLANATION GRID (Below the Fold) --- */}
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-20 flex flex-col gap-8 md:gap-12">
        
        {/* Features Grid */}
        <section className="p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden shadow-2xl border border-zinc-800/50 bg-[#0e0e0e]/50 backdrop-blur-xl max-w-4xl mx-auto w-full">
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/5 blur-[100px] pointer-events-none z-0"></div>

          <div className="text-center mb-10 relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Seamless <span className="text-indigo-400">Media Transcription</span>
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
              Transform spoken words from video and audio files into highly accurate text using advanced machine learning models running natively within your browser environment.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
            {/* Model Card 1 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-indigo-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">🧠</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Whisper-Tiny Architecture
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Powered by a highly compressed 75MB WASM port of OpenAI's Whisper model. This ensures incredible accuracy for speech recognition while remaining small enough to download instantly.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-violet-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">⏱️</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Timestamped Outputs
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Automatically breaks down long monologues into easily readable text chunks, attaching exact second-level timestamps to help you synchronize subtitles perfectly with your video.
              </p>
            </div>

            {/* Privacy Card 3 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-emerald-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">🔒</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                100% Local Privacy
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Your private meetings, interviews, or voice notes are never uploaded to the cloud. The AI weights are downloaded to your RAM, processing your media locally and securely.
              </p>
            </div>

            {/* Audio Processing Card 4 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-cyan-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">🎵</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Native Audio Extraction
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Upload massive video files (up to 200MB) directly. The tool utilizes the Web Audio API to extract only the necessary audio waves, preventing heavy memory consumption.
              </p>
            </div>
          </div>
        </section>

        {/* System Requirements & Browser Compatibility */}
        <section className="p-6 md:p-10 rounded-[2rem] border border-zinc-800/50 bg-[#0e0e0e]/50 backdrop-blur-xl max-w-4xl mx-auto w-full">
          <div className="text-center md:text-left mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
              System Requirements & Compatibility
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm">
              Because this neural network processes audio data locally, your system must meet minimum specifications to load the model into memory.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Minimum Specs */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-400" /> Hardware Specs
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm text-white font-medium">Memory (RAM)</span>
                    <span className="block text-xs text-zinc-500">Minimum 4GB required. The Whisper model requires available system RAM to store neural weights during inference.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm text-white font-medium">Processor</span>
                    <span className="block text-xs text-zinc-500">Modern dual-core processor minimum. Transcription speed is directly tied to CPU performance.</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Browser Support */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-violet-400" /> Supported Browsers
              </h3>
              <div className="grid grid-cols-2 gap-3">
                
                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Monitor className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Chrome Desktop</span>
                    <span className="block text-[10px] text-zinc-500">Full Support (Fastest)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Smartphone className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Chrome Android</span>
                    <span className="block text-[10px] text-zinc-500">Supported (Memory heavy)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Monitor className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Firefox Desktop</span>
                    <span className="block text-[10px] text-zinc-500">Full Support</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Monitor className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Microsoft Edge</span>
                    <span className="block text-[10px] text-zinc-500">Full Support</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

      </div>

      <Footer />
      
      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  );
}