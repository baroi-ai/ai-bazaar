"use client";

import React, { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Sparkles,
  Loader2,
  Download,
  UploadCloud,
  XCircle,
  Frame,
  Film,
  Camera,
  Settings2,
  Cpu,
  Monitor,
  Smartphone,
  HardDrive,
  Globe,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Add your Navbar and Footer imports (adjust path if needed)
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// --- Types ---
interface ExtractedFrame {
  id: string;
  label: string;
  url: string;
}

export default function FrameExtractorPage() {
  // State
  const [sourceVideoFile, setSourceVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [extractedFrames, setExtractedFrames] = useState<ExtractedFrame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mode Switch State
  const [extractionMode, setExtractionMode] = useState<"auto" | "custom">("auto");
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const customVideoRef = useRef<HTMLVideoElement>(null);

  // --- Effect: Detect Mobile ---
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
      const mobile = Boolean(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || window.innerWidth < 768);
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Cleanup Object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      extractedFrames.forEach(f => URL.revokeObjectURL(f.url));
    };
  }, [videoPreviewUrl, extractedFrames]);

  // --- Handlers ---
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error("File size cannot exceed 100MB (Browser Limit).");
        return;
      }
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      
      setSourceVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      setExtractedFrames([]);
      e.target.value = "";
    }
  };

  const clearVideo = () => {
    setSourceVideoFile(null);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setExtractedFrames([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Zero-Cost Client-Side Capture
  const captureFrame = (video: HTMLVideoElement): string => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  };

  // --- Logic: Auto Extract ---
  const handleAutoExtract = async () => {
    if (!sourceVideoFile || !videoRef.current) return;

    setIsLoading(true);
    toast.info("Extracting frames on device...");

    const video = videoRef.current;

    if (isNaN(video.duration)) {
      toast.error("Video metadata not loaded yet. Please wait a moment.");
      setIsLoading(false);
      return;
    }

    try {
      const frames: ExtractedFrame[] = [];
      const duration = video.duration;

      // First Frame
      video.currentTime = 0.1;
      await new Promise((r) => (video.onseeked = r));
      frames.push({ id: "first", label: "First Frame", url: captureFrame(video) });

      // Mid Frame
      video.currentTime = duration / 2;
      await new Promise((r) => (video.onseeked = r));
      frames.push({ id: "mid", label: "Middle Frame", url: captureFrame(video) });

      // Last Frame
      video.currentTime = Math.max(0, duration - 0.1);
      await new Promise((r) => (video.onseeked = r));
      frames.push({ id: "last", label: "Last Frame", url: captureFrame(video) });

      setExtractedFrames(frames);
      toast.success("Frames extracted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to extract frames.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Logic: Custom Extract ---
  const openCustomExtractor = () => {
    if (!sourceVideoFile) {
      toast.error("Please upload a video first.");
      return;
    }
    setIsCustomModalOpen(true);
  };

  const handleCustomCapture = () => {
    if (!customVideoRef.current) return;
    const video = customVideoRef.current;
    const currentTime = video.currentTime;
    const frameUrl = captureFrame(video);
    const label = `Time: ${currentTime.toFixed(2)}s`;

    setExtractedFrames((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, label, url: frameUrl },
    ]);
    toast.success("Frame Captured!");
  };

  // Main Button Handler
  const handleGenerateClick = () => {
    if (extractionMode === "auto") {
      handleAutoExtract();
    } else {
      openCustomExtractor();
    }
  };

  const handleDownload = (imageUrl: string, label: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `frame-${label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.jpg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans flex flex-col">
      <Navbar />

      {/* Hidden Video for Auto-Logic & Validation */}
      {videoPreviewUrl && (
        <video
          ref={videoRef}
          src={videoPreviewUrl}
          className="hidden"
          crossOrigin="anonymous"
          preload="metadata"
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            const timeLimit = isMobile ? 300 : 600; // 5 mins Mobile, 10 mins Desktop
            if (video.duration > timeLimit) {
              const limitText = isMobile ? "5 minutes" : "10 minutes";
              toast.error(`Video exceeds ${limitText} limit on this device.`);
              clearVideo();
              return;
            }
            video.currentTime = 0;
          }}
          onError={() => {
            toast.error("Error loading video format.");
            clearVideo();
          }}
        />
      )}

      {/* --- SECTION 1: THE TOOL (Above the Fold) --- */}
      <div className="flex flex-col min-h-[calc(100vh-80px)] w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
        
        {/* MAIN PREVIEW AREA */}
        <div className="flex-1 bg-[#0e0e0e] border border-zinc-800/80 md:rounded-[2rem] rounded-2xl relative flex flex-col shadow-2xl overflow-hidden mb-6">
          
          <div className="flex-1 w-full h-full overflow-y-auto relative flex flex-col items-center justify-center p-4 md:p-8">
            
            {/* STATE 1: Empty */}
            {!videoPreviewUrl && (
              <div className="flex flex-col items-center justify-center text-center p-6 md:p-12 w-full animate-in fade-in zoom-in-95 duration-500">
                <Film className="h-16 w-16 mb-6 text-zinc-700" />
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">Video Frame Extractor</h1>
                <p className="text-zinc-400 max-w-md mb-8 text-sm md:text-base leading-relaxed">
                  Extract high-quality JPEG frames from any video. Scroll frame-by-frame or automatically pull the start, middle, and end shots.
                </p>
                <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full text-xs font-medium uppercase tracking-wider">
                  <Cpu className="w-4 h-4" /> 100% Private Local Extraction
                </div>
              </div>
            )}

            {/* STATE 2: Video Loaded (Before Extraction) */}
            {videoPreviewUrl && extractedFrames.length === 0 && (
              <div className="animate-in fade-in duration-500 relative flex flex-col items-center justify-center w-full h-full max-h-full">
                <div className="relative shadow-2xl rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-2 flex-shrink-0 flex items-center justify-center max-w-full max-h-full group">
                  <video
                    src={videoPreviewUrl}
                    controls
                    className="max-h-[60vh] max-w-full w-auto object-contain rounded-xl block"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={clearVideo}
                    className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-500 z-40"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STATE 3: Extracted Frames Grid */}
            {extractedFrames.length > 0 && (
              <div className="w-full h-full flex flex-col animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-6 shrink-0">
                  <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                    <Frame className="w-5 h-5 text-cyan-400" />
                    Extracted Frames ({extractedFrames.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExtractedFrames([])}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Clear All
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 overflow-y-auto pb-8">
                  {extractedFrames.map((frame) => (
                    <div key={frame.id} className="flex flex-col gap-3 group">
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-[#0a0a0a] shadow-xl flex items-center justify-center">
                        <img src={frame.url} alt={frame.label} className="max-h-full max-w-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            onClick={() => handleDownload(frame.url, frame.label)}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-full shadow-2xl"
                          >
                            <Download className="w-4 h-4 mr-2" /> Download
                          </Button>
                        </div>
                      </div>
                      <div className="text-center text-xs font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/30 border border-cyan-900/50 py-1.5 rounded-lg w-fit px-4 mx-auto">
                        {frame.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM UPLOAD / GENERATE SECTION */}
        <div className="shrink-0 w-full flex flex-col items-center justify-center max-w-4xl mx-auto gap-3 mb-24 md:mb-0">
          
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#0e0e0e] p-1.5 px-4 rounded-full border border-zinc-800 shadow-xl w-fit gap-3">
            <span className={`text-[10px] md:text-xs uppercase font-bold tracking-wider transition-colors ${extractionMode === "auto" ? "text-cyan-400" : "text-zinc-500"}`}>
              Auto Sample
            </span>
            <Switch
              checked={extractionMode === "custom"}
              onCheckedChange={(c: boolean) => setExtractionMode(c ? "custom" : "auto")}
              className="data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-zinc-700 border-2 border-transparent"
            />
            <span className={`text-[10px] md:text-xs uppercase font-bold tracking-wider transition-colors ${extractionMode === "custom" ? "text-cyan-400" : "text-zinc-500"}`}>
              Custom Select
            </span>
          </div>

          {/* Input Bar */}
          <div className="flex items-center gap-2 md:gap-3 w-full">
            <div className="shrink-0 relative">
              <Input
                ref={fileInputRef}
                id="source-video-upload"
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                className="hidden"
                disabled={isLoading}
              />
              <Label
                htmlFor="source-video-upload"
                className={`cursor-pointer h-12 md:h-14 w-12 md:w-14 flex items-center justify-center rounded-xl md:rounded-2xl transition-all shadow-lg ${
                  videoPreviewUrl 
                    ? "bg-cyan-500/10 border border-cyan-500/50 text-cyan-400" 
                    : "bg-[#0e0e0e] border border-zinc-800 text-zinc-400 hover:text-cyan-400 hover:border-zinc-600"
                }`}
              >
                <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
              </Label>
            </div>

            <div className="relative flex-grow h-12 md:h-14 bg-[#0e0e0e] border border-zinc-800 rounded-xl md:rounded-2xl flex items-center px-3 md:px-4 shadow-lg transition-colors focus-within:border-cyan-500/50 overflow-hidden">
              <span className="text-xs md:text-sm text-zinc-500 truncate pr-32 md:pr-40 select-none w-full">
                {!videoPreviewUrl ? "Upload a video..." : extractionMode === "auto" ? "Ready to auto-extract frames" : "Ready to custom select frames"}
              </span>

              <div className="absolute right-1.5 md:right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                
                <Button
                  onClick={handleGenerateClick}
                  disabled={isLoading || !videoPreviewUrl}
                  className={`h-9 md:h-10 px-4 md:px-6 rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm font-bold transition-all shadow-lg shrink-0 ${
                    isLoading || !videoPreviewUrl
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white hover:scale-105 active:scale-95"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : extractionMode === "auto" ? (
                    <>
                      <Sparkles className="w-4 h-4 md:mr-1.5" /> <span className="hidden md:inline">Extract All</span>
                    </>
                  ) : (
                    <>
                      <Settings2 className="w-4 h-4 md:mr-1.5" /> <span className="hidden md:inline">Open Editor</span>
                    </>
                  )}
                </Button>

              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* --- CUSTOM EXTRACTION MODAL --- */}
      <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
        <DialogContent className="border-zinc-800 bg-[#0e0e0e] text-gray-200 max-w-4xl w-[95vw] p-4 md:p-6 rounded-2xl md:rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-xl font-bold">
              <Settings2 className="w-5 h-5 text-cyan-400" />
              Custom Frame Selector
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Scrub through the video to find the exact moment, then click capture to save the frame.
            </DialogDescription>
          </DialogHeader>

          {/* Video Player in Modal */}
          <div className="relative w-full aspect-video bg-[#0a0a0a] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center mt-2 mb-4">
            {videoPreviewUrl && (
              <video
                ref={customVideoRef}
                src={videoPreviewUrl}
                controls
                className="w-full h-full object-contain"
              />
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800">
              <Frame className="w-4 h-4 text-cyan-500" />
              <span className="text-xs font-medium text-zinc-400">
                <strong className="text-white">{extractedFrames.length}</strong> frames captured
              </span>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 flex-1 sm:flex-none"
                onClick={() => setIsCustomModalOpen(false)}
              >
                Close
              </Button>
              <Button
                onClick={handleCustomCapture}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex-1 sm:flex-none"
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture Frame
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- SECTION 2: SEO & APP EXPLANATION GRID (Below the Fold) --- */}
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-20 flex flex-col gap-8 md:gap-12">
        
        {/* Features Grid */}
        <section className="p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden shadow-2xl border border-zinc-800/50 bg-[#0e0e0e]/50 backdrop-blur-xl max-w-4xl mx-auto w-full">
          <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/5 blur-[100px] pointer-events-none z-0"></div>

          <div className="text-center mb-10 relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Precision <span className="text-cyan-400">Frame Extraction</span>
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
              Capture high-quality still images from any video file instantly. Perfect for generating thumbnails, storyboards, or isolating specific moments from footage.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
            {/* Feature Card 1 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-cyan-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">⚙️</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Client-Side Processing
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Videos are processed directly inside your browser using the HTML5 Canvas API. This guarantees zero upload times and instantaneous frame grabbing.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-blue-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">🎯</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Custom Selection Editor
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Switch to Custom Mode to open an integrated video scrubber. Pause at the exact millisecond you need and capture the perfect high-resolution frame.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-sky-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">✨</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Auto-Sampling Mode
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Need a quick storyboard? Auto Mode mathematically scans the video timeline to automatically isolate and export the first, middle, and final frames.
              </p>
            </div>

            {/* Feature Card 4 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-indigo-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">📸</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                High Quality Output
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Frames are captured at the video's absolute native resolution and exported as 90% quality JPEGs to balance pristine visual fidelity with low file sizes.
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
              This tool utilizes standard HTML5 video decoding. Support depends on your device's native media codecs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Minimum Specs */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" /> Hardware Specs
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm text-white font-medium">Memory (RAM)</span>
                    <span className="block text-xs text-zinc-500">Minimum 2GB required. Devices with low memory may fail to load video metadata for files near the 100MB limit.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm text-white font-medium">Video Length Limits</span>
                    <span className="block text-xs text-zinc-500">Hard-capped at 5 minutes for mobile devices and 10 minutes for desktops to prevent Canvas API memory leaks.</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Browser Support */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" /> Supported Browsers
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
                    <span className="block text-[10px] text-zinc-500">Supported (Subject to RAM limits)</span>
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
                    <span className="block text-xs font-semibold text-white">Safari / WebKit</span>
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