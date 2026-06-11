"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Loader2,
  Download,
  UploadCloud,
  XCircle,
  Eraser,
  Undo,
  Cpu,
  Sparkles,
  Monitor,
  Smartphone,
  HardDrive,
  Globe,
  CheckCircle2,
  Brush
} from "lucide-react";

// Add your Navbar and Footer imports (adjust path if needed)
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

interface VideoInfo {
  name: string;
  duration: number;
  width: number;
  height: number;
  size: number;
}

const MAX_FILE_SIZE_MB = 100;
const MAX_DURATION_SEC = 60;

export default function VideoWatermarkRemoverPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [outputVideoUrl, setOutputVideoUrl] = useState<string | null>(null);

  const [status, setStatus] = useState<
    "idle" | "processing" | "completed" | "failed"
  >("idle");
  const [progressText, setProgressText] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);

  const [brushSize, setBrushSize] = useState(30);
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  const revokeUrl = (url: string | null) => {
    if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
  };

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File size cannot exceed ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    revokeUrl(videoPreviewUrl);
    revokeUrl(outputVideoUrl);

    const url = URL.createObjectURL(file);
    const tempVideo = document.createElement("video");
    tempVideo.src = url;

    tempVideo.onloadedmetadata = () => {
      if (tempVideo.duration > MAX_DURATION_SEC) {
        toast.error(
          `Video is too long! Max allowed duration is ${MAX_DURATION_SEC} seconds.`,
        );
        URL.revokeObjectURL(url);
        return;
      }

      setVideoFile(file);
      setVideoPreviewUrl(url);
      setOutputVideoUrl(null);
      setStatus("idle");
      setProgressPercent(0);
      setHistory([]);
      setVideoInfo({
        name: file.name,
        duration: tempVideo.duration,
        width: tempVideo.videoWidth,
        height: tempVideo.videoHeight,
        size: file.size,
      });

      if (canvasRef.current) {
        canvasRef.current.width = tempVideo.videoWidth;
        canvasRef.current.height = tempVideo.videoHeight;
      }
    };
  };

  const clearVideo = () => {
    revokeUrl(videoPreviewUrl);
    revokeUrl(outputVideoUrl);
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setOutputVideoUrl(null);
    setVideoInfo(null);
    setStatus("idle");
    setHistory([]);
    workerRef.current?.terminate();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- DRAWING LOGIC ---
  const getPointerPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // With the new CSS, the bounding client rect exactly matches the scaled video.
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current || status === "processing") return;
    setIsDragging(true);
    const pos = getPointerPos(e);
    lastPosRef.current = pos;

    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(239, 68, 68, 0.6)"; // Red-500 with opacity
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !canvasRef.current || !lastPosRef.current) return;
    const currentPos = getPointerPos(e);
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(239, 68, 68, 0.6)"; // Red-500 with opacity

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    lastPosRef.current = currentPos;
  };

  const stopDrawing = () => {
    if (isDragging && canvasRef.current) {
      setIsDragging(false);
      lastPosRef.current = null;
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        const snapshot = ctx.getImageData(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height,
        );
        setHistory((prev) => [...prev, snapshot].slice(-15)); // Keep last 15 actions
      }
    }
  };

  const handleUndo = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || history.length === 0) return;

    const newHistory = [...history];
    newHistory.pop();
    setHistory(newHistory);

    if (newHistory.length > 0) {
      ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    } else {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  };

  // --- PROCESS VIDEO ---
  const handleProcess = async () => {
    if (!videoFile || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    const imgData = ctx?.getImageData(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height,
    );
    const hasDrawn = imgData?.data.some(
      (alpha, index) => index % 4 === 3 && alpha > 0,
    );

    if (!hasDrawn) return toast.error("Please draw over the watermark first!");

    setStatus("processing");
    setProgressPercent(0);
    setProgressText("Extracting mask...");

    const maskBitmap = await createImageBitmap(canvasRef.current);

    workerRef.current?.terminate();
    workerRef.current = new Worker(
      new URL("./video-eraser.worker.ts", import.meta.url),
    );

    workerRef.current.onmessage = (e) => {
      const { cmd, data, percent, text } = e.data;

      if (cmd === "progress") {
        setProgressPercent(data?.percent ?? percent ?? 0);
        setProgressText(data?.text ?? text ?? "Processing...");
      } else if (cmd === "success") {
        const blob = new Blob([data], { type: "video/mp4" });
        setOutputVideoUrl(URL.createObjectURL(blob));
        setStatus("completed");
        toast.success("Watermark Erased!");
        workerRef.current?.terminate();
      } else if (cmd === "error") {
        setStatus("failed");
        toast.error("Error: " + data);
        workerRef.current?.terminate();
      }
    };

    workerRef.current.postMessage({ file: videoFile, maskBitmap }, [
      maskBitmap,
    ]);
  };

  const handleDownload = () => {
    if (!outputVideoUrl) return;
    const link = document.createElement("a");
    link.href = outputVideoUrl;
    link.download = `Erased_${videoInfo?.name || "Video"}.mp4`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans flex flex-col">
      <Navbar />

      {/* --- SECTION 1: THE TOOL (Above the Fold) --- */}
      <div className="flex flex-col min-h-[calc(100vh-80px)] w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
        
        {/* MAIN PREVIEW AREA */}
        <div className="flex-1 bg-[#0e0e0e] border border-zinc-800/80 md:rounded-[2rem] rounded-2xl relative flex flex-col shadow-2xl overflow-hidden mb-6">
          
          <div className="flex-1 w-full h-full overflow-hidden relative flex flex-col items-center justify-center p-4 md:p-8">
            
            {/* STATE 1: Empty */}
            {status === "idle" && !videoPreviewUrl && (
              <div className="flex flex-col items-center justify-center text-center p-6 md:p-12 w-full animate-in fade-in zoom-in-95 duration-500">
                <Eraser className="h-16 w-16 mb-6 text-zinc-700" />
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">Video Watermark Remover</h1>
                <p className="text-zinc-400 max-w-md mb-8 text-sm md:text-base leading-relaxed">
                  Upload a video and seamlessly paint over watermarks, logos, or objects to erase them. Processing runs natively in your browser.
                </p>
                <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full text-xs font-medium uppercase tracking-wider">
                  <Cpu className="w-4 h-4" /> 100% Private Local Inference
                </div>
              </div>
            )}

            {/* STATE 2: Processing Overlay */}
            {status === "processing" && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0e0e0e]/90 backdrop-blur-sm animate-in fade-in rounded-[2rem]">
                <Loader2 className="h-12 w-12 animate-spin text-rose-500 mb-4" />
                <p className="text-white font-bold text-lg animate-pulse mb-2">Erasing Watermark...</p>
                <p className="text-xs text-zinc-400 font-mono mb-6">{progressText}</p>
                
                {/* Progress Bar */}
                <div className="w-64 bg-zinc-800 rounded-full h-2 overflow-hidden border border-zinc-700">
                  <div className="bg-rose-500 h-full transition-all duration-300 ease-out" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>
            )}

            {/* STATE 3: Editor / Interactive Canvas */}
            {(status === "idle" || status === "failed") && videoPreviewUrl && videoInfo && (
              <div className="animate-in fade-in duration-500 relative flex flex-col items-center justify-center w-full h-full max-h-full">
                
                {/* Responsive container linking the canvas perfectly to the video dimensions */}
                <div className="relative shadow-2xl rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-2 flex items-center justify-center w-fit h-fit max-h-[60vh] max-w-full">
                  
                  {/* The inline-flex container hugs the exact dimensions of the video */}
                  <div className="relative inline-flex items-center justify-center max-w-full max-h-[calc(60vh-16px)]">
                    
                    {/* Video pushes container boundaries naturally */}
                    <video
                      ref={videoRef}
                      src={videoPreviewUrl}
                      className="block max-h-[calc(60vh-16px)] max-w-full w-auto h-auto rounded-xl pointer-events-none"
                      loop
                      muted
                      autoPlay
                      playsInline
                    />
                    
                    {/* Canvas overlays precisely on top of the exact same CSS bounds! w-full & h-full perfectly matches the video box. */}
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="absolute top-0 left-0 w-full h-full rounded-xl z-10 opacity-70 touch-none cursor-crosshair"
                    />
                  </div>

                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={clearVideo}
                    className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-lg transition-opacity bg-red-600 hover:bg-red-500 z-40"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STATE 4: Completed Output Video */}
            {status === "completed" && outputVideoUrl && (
              <div className="animate-in zoom-in duration-500 flex flex-col items-center justify-center w-full h-full">
                <div className="flex items-center gap-2 mb-4 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Erase Complete</span>
                </div>
                <div className="relative shadow-2xl rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-2">
                  <video
                    src={outputVideoUrl}
                    className="max-h-[50vh] max-w-full rounded-xl block"
                    controls
                    autoPlay
                    loop
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={clearVideo}
                    className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-lg transition-opacity bg-red-600 hover:bg-red-500 z-40"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Editor Toolbar */}
          {(status === "idle" || status === "failed") && videoPreviewUrl && (
            <div className="w-full bg-[#0a0a0a]/80 backdrop-blur-md border-t border-zinc-800 p-3 md:px-6 md:py-4 flex justify-center z-10">
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full md:w-auto justify-start md:justify-center px-1">
                
                <div className="flex items-center gap-2 px-3 shrink-0 bg-zinc-900 border border-zinc-800 rounded-xl h-9">
                  <Brush className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">Brush Size</span>
                </div>

                <div className="flex items-center gap-2 w-32 md:w-48 px-2 shrink-0">
                  <Slider
                    defaultValue={[30]}
                    max={100}
                    min={5}
                    step={1}
                    value={[brushSize]}
                    onValueChange={(vals: number[]) => setBrushSize(vals[0])}
                    className="h-4 [&_.bg-primary]:!bg-rose-500"
                  />
                </div>

                <div className="w-px h-5 bg-zinc-800 mx-2 shrink-0"></div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={handleUndo} disabled={history.length <= 0}>
                    <Undo className="w-4 h-4" />
                  </Button>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* BOTTOM UPLOAD / GENERATE SECTION */}
        <div className="shrink-0 w-full flex flex-col items-center justify-center max-w-4xl mx-auto gap-3 mb-24 md:mb-0">

          {/* Input Bar */}
          <div className="flex items-center gap-2 md:gap-3 w-full">
            <div className="shrink-0 relative">
              <Input
                ref={fileInputRef}
                id="source-video-upload"
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mkv,.mov"
                onChange={handleFileChange}
                className="hidden"
                disabled={status === "processing"}
              />
              <Label
                htmlFor="source-video-upload"
                className={`cursor-pointer h-12 md:h-14 w-12 md:w-14 flex items-center justify-center rounded-xl md:rounded-2xl transition-all shadow-lg ${
                  videoPreviewUrl 
                    ? "bg-rose-500/10 border border-rose-500/50 text-rose-400" 
                    : "bg-[#0e0e0e] border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-zinc-600"
                }`}
              >
                <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
              </Label>
            </div>

            <div className="relative flex-grow h-12 md:h-14 bg-[#0e0e0e] border border-zinc-800 rounded-xl md:rounded-2xl flex items-center px-3 md:px-4 shadow-lg transition-colors focus-within:border-rose-500/50 overflow-hidden">
              <span className="text-xs md:text-sm text-zinc-500 truncate pr-40 select-none w-full">
                {status === "processing" ? progressText : status === "completed" ? "✓ Watermark erased successfully." : videoPreviewUrl ? "Draw over the watermark to erase" : "Upload a video (Max 60s)"}
              </span>

              {status === "processing" && (
                <div
                  className="absolute bottom-0 left-0 h-0.5 bg-rose-500 rounded-xl transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              )}

              <div className="absolute right-1.5 md:right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                
                {status === "completed" && (
                   <Button
                    onClick={handleDownload}
                    className="h-9 md:h-10 px-4 md:px-6 rounded-lg md:rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-gray-900 text-xs md:text-sm font-bold shadow-lg shrink-0 animate-in zoom-in"
                  >
                    <Download className="w-4 h-4 md:mr-1.5" /> <span className="hidden md:inline">Save Video</span>
                  </Button>
                )}

                {(status === "idle" || status === "failed") && (
                  <Button
                    onClick={handleProcess}
                    disabled={!videoFile} 
                    className={`h-9 md:h-10 px-4 md:px-6 rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm font-bold transition-all shadow-lg shrink-0 ${
                      !videoFile
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white hover:scale-105 active:scale-95"
                    }`}
                  >
                    <Eraser className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Erase Watermark</span><span className="inline md:hidden">Erase</span>
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
          <div className="absolute top-0 right-0 w-72 h-72 bg-rose-500/5 blur-[100px] pointer-events-none z-0"></div>

          <div className="text-center mb-10 relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Flawless <span className="text-rose-400">Video Watermark Removal</span>
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
              Leverage advanced OpenCV inpainting and client-side demuxing to scrub logos, timestamps, and watermarks from your videos frame-by-frame, without ever leaving your browser.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
            {/* Feature Card 1 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-rose-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">🧠</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                OpenCV Inpainting
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Utilizes the powerful INPAINT_TELEA algorithm natively ported to WebAssembly. The engine automatically analyzes neighboring pixels to realistically fill the masked area frame by frame.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-pink-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">⚡</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Client-Side Processing
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Uses the HTML5 WebCodecs API to demux, decode, and remux MP4 files directly in your RAM. Enjoy zero upload waiting times and instantaneous processing starts.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-orange-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">🔒</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                100% Local Privacy
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Your videos are never transmitted to a cloud server. Because the entire pipeline executes within your local environment, absolute data privacy is guaranteed.
              </p>
            </div>

            {/* Feature Card 4 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-red-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">🎨</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Precision Masking
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                A custom dynamic canvas layer allows you to scrub the timeline and paint the exact boundaries of the watermark with a non-destructive brush, ensuring high-fidelity outputs.
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
              Video decoding and WebAssembly execution are CPU-intensive operations. Please ensure your device meets the minimum hardware specifications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Minimum Specs */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-rose-400" /> Hardware Specs
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm text-white font-medium">Memory (RAM)</span>
                    <span className="block text-xs text-zinc-500">Minimum 4GB required. WebCodecs stores massive frame arrays in memory during the demuxing phase.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm text-white font-medium">Processor</span>
                    <span className="block text-xs text-zinc-500">Multi-core desktop CPU highly recommended. Frame-by-frame OpenCV analysis will drain laptop batteries quickly.</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Browser Support */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-pink-400" /> Supported Browsers
              </h3>
              <div className="grid grid-cols-2 gap-3">
                
                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Monitor className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Chrome Desktop</span>
                    <span className="block text-[10px] text-zinc-500">Full Support (WebCodecs)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Smartphone className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Chrome Android</span>
                    <span className="block text-[10px] text-zinc-500">Supported (May overheat)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Monitor className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Microsoft Edge</span>
                    <span className="block text-[10px] text-zinc-500">Full Support (WebCodecs)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Monitor className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Safari / WebKit</span>
                    <span className="block text-[10px] text-zinc-500">Partial Support</span>
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