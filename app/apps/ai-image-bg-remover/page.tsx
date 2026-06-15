"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Download,
  UploadCloud,
  ImageOff,
  XCircle,
  Eraser,
  Brush,
  Undo,
  Redo,
  Cpu,
  Sparkles,
  Zap,
  Monitor,
  Smartphone,
  HardDrive,
  Globe,
  CheckCircle2
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

// Add your Navbar and Footer imports (adjust path if needed)
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// --- Types ---
type ToolType = "none" | "erase" | "restore";

interface GenerationJob {
  id: string;
  status: "processing" | "completed" | "failed";
  urls: string[];
  originalUrl: string;
}

export default function ImageBgRemoverPage() {
  // --- State ---
  const [statusText, setStatusText] = useState("Upload an image to begin...");

  // File & Preview
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Job & AI State
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressText, setProgressText] = useState("Initializing Engine...");

  // Model Selector State
  const [aiModel, setAiModel] = useState<"briaai/RMBG-1.4" | "Xenova/modnet">("briaai/RMBG-1.4");

  // Editor / Canvas State
  const [tool, setTool] = useState<ToolType>("none");
  const [brushSize, setBrushSize] = useState(30);
  const [isDragging, setIsDragging] = useState(false);
  
  // History State for Undo/Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(0);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const progressRef = useRef<string>("Initializing...");

  // --- MEMORY MANAGEMENT HELPER ---
  const revokeUrl = (url: string | null) => {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  // --- Effects ---
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./bg-remover.worker.ts", import.meta.url),
      { type: "module" }
    );

    workerRef.current.onmessage = (event) => {
      const { status, blob, error, percent, key } = event.data;

      if (status === "progress") {
        progressRef.current = `${key || "Processing..."} ${percent}%`;
        setProgressText(`${key || "Processing..."} ${percent}%`);
      } else if (status === "success") {
        const generatedUrl = URL.createObjectURL(blob);

        setActiveJob((prev) => {
          if (prev && prev.urls[0]) revokeUrl(prev.urls[0]);
          return { ...prev!, status: "completed", urls: [generatedUrl] };
        });

        setIsLoading(false);
        toast.success("Background Removed Successfully!");
      } else if (status === "error") {
        console.error(error);
        setActiveJob((prev) => (prev ? { ...prev, status: "failed" } : null));
        setIsLoading(false);
        toast.error("Failed to process image.");
      }
    };

    return () => {
      workerRef.current?.terminate();
      if (imagePreviewUrl) revokeUrl(imagePreviewUrl);
      if (activeJob?.urls[0]) revokeUrl(activeJob?.urls[0]);
    };
  }, []);

  useEffect(() => {
    if (activeJob?.status === "completed" && activeJob.urls[0]) {
      const timer = setTimeout(() => {
        initializeCanvas(activeJob.urls[0]);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeJob]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setProgressText((prev) => {
          if (prev !== progressRef.current) return progressRef.current;
          return prev;
        });
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // --- Toggle Logic ---
  const toggleTool = (selectedTool: ToolType) => {
    setTool((currentTool) => (currentTool === selectedTool ? "none" : selectedTool));
  };

  // --- Logic ---
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error("File size cannot exceed 15MB for browser processing.");
        return;
      }

      revokeUrl(imagePreviewUrl);
      if (activeJob?.urls[0]) revokeUrl(activeJob.urls[0]);

      setSourceImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      setStatusText(file.name);

      const img = new Image();
      img.src = url;
      originalImageRef.current = img;

      setActiveJob(null);
      setHistory([]);
      setHistoryStep(0);
      setTool("none");
      e.target.value = "";
    }
  };

  const clearImage = () => {
    revokeUrl(imagePreviewUrl);
    if (activeJob?.urls[0]) revokeUrl(activeJob.urls[0]);

    setSourceImageFile(null);
    setImagePreviewUrl(null);
    setStatusText("Upload an image to begin...");
    setActiveJob(null);
    setHistory([]);
    setHistoryStep(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!sourceImageFile || !imagePreviewUrl) {
      toast.error("Please upload an image first.");
      return;
    }

    if (!workerRef.current) {
      toast.error("AI Engine not initialized. Please refresh the page.");
      return;
    }

    setIsLoading(true);
    progressRef.current = "Starting Engine...";

    const newJobId = `job-${Date.now()}`;
    setActiveJob({
      id: newJobId,
      status: "processing",
      urls: [],
      originalUrl: imagePreviewUrl,
    });

    workerRef.current.postMessage({
      imageBlob: sourceImageFile,
      modelName: aiModel,
    });
  };

  // --- Canvas Drawing & Undo/Redo Logic ---
  const initializeCanvas = (url: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.src = url;
    img.onload = () => {
      // Keep canvas absolute resolution perfectly matching the image
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
      setHistoryStep(0);
    };
  };

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (newHistory.length > 15) newHistory.shift(); // Keep last 15 actions to save memory
    
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d", { willReadFrequently: true });
      if (ctx && canvas) {
        ctx.putImageData(history[newStep], 0, 0);
        setHistoryStep(newStep);
      }
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d", { willReadFrequently: true });
      if (ctx && canvas) {
        ctx.putImageData(history[newStep], 0, 0);
        setHistoryStep(newStep);
      }
    }
  };

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Dynamically calculates scale based on how CSS resized the canvas
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

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || tool === "none" || !canvasRef.current || !lastPosRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const currentPos = getPointerPos(e);

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (tool === "restore" && originalImageRef.current) {
      ctx.globalCompositeOperation = "source-over";
      const pattern = ctx.createPattern(originalImageRef.current, "no-repeat");
      if (pattern) ctx.strokeStyle = pattern;
    }

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    lastPosRef.current = currentPos;
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === "none") return;
    setIsDragging(true);
    const pos = getPointerPos(e);
    lastPosRef.current = pos;

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && lastPosRef.current) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDragging) {
      setIsDragging(false);
      lastPosRef.current = null;
      saveHistory();
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `bg-removed-${Date.now()}.png`);
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
        <div className="flex-1 md:rounded-[2rem] rounded-2xl relative flex flex-col shadow-2xl overflow-hidden mb-6">
          
          <div ref={containerRef} className="flex-1 w-full h-full overflow-hidden relative flex items-center justify-center p-4 md:p-8">
            
            {/* STATE 1: Empty */}
            {!activeJob && !imagePreviewUrl && (
              <div className="flex flex-col items-center justify-center text-center p-6 md:p-12 w-full animate-in fade-in zoom-in-95 duration-500">
                <ImageOff className="h-16 w-16 mb-6 text-zinc-700" />
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">AI Background Remover</h1>
                <p className="text-zinc-400 max-w-md mb-8 text-sm md:text-base leading-relaxed">
                  Upload any image to magically strip away the background. Everything runs entirely within your browser for absolute privacy.
                </p>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium uppercase tracking-wider">
                  <Cpu className="w-4 h-4" /> 100% Private Local Inference
                </div>
              </div>
            )}

            {/* STATE 2: Image Preview */}
            {!activeJob && imagePreviewUrl && (
              <div className="animate-in fade-in duration-500 relative group w-fit h-auto shadow-2xl rounded-2xl border border-zinc-800 bg-[#0e0e0e] p-2 flex-shrink-0">
                <img src={imagePreviewUrl} alt="Source" className="max-h-[60vh] max-w-full w-auto object-contain rounded-xl" />
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={clearImage}
                  className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-500"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* STATE 3: Processing */}
            {activeJob && activeJob.status === "processing" && (
              <div className="flex flex-col items-center justify-center p-8 md:p-12 bg-[#0e0e0e] rounded-[2rem] border border-zinc-800 shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95">
                <Loader2 className="h-10 w-10 animate-spin text-sky-500 mb-6" />
                <p className="text-lg md:text-xl font-bold text-white mb-2">AI is working...</p>
                <p className="text-xs md:text-sm font-mono text-zinc-500 bg-zinc-900 px-3 py-1 rounded-md border border-zinc-800">{progressText}</p>
              </div>
            )}

            {/* STATE 4: Interactive Canvas (Result) */}
            {activeJob && activeJob.status === "completed" && (
              <div
                className="relative shadow-2xl overflow-hidden rounded-xl border border-zinc-800 bg-[#0e0e0e] transition-transform duration-75 ease-out shrink-0 flex items-center justify-center"
                style={{
                  backgroundImage: "repeating-conic-gradient(#18181b 0% 25%, #0a0a0a 0% 50%)", 
                  backgroundSize: "24px 24px",
                }}
              >
                {/* CSS controls the sizing here so it perfectly fits the screen */}
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="max-w-full max-h-[60vh] w-auto h-auto object-contain touch-none cursor-crosshair block rounded-lg"
                />
              </div>
            )}

            {/* STATE 5: Failed */}
            {activeJob && activeJob.status === "failed" && (
              <div className="p-8 bg-red-950/20 border border-red-900/50 rounded-[2rem] text-center max-w-sm w-full">
                <XCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-red-200 mb-6">Processing Failed</p>
                <Button onClick={clearImage} className="bg-red-600 hover:bg-red-500 text-white rounded-xl px-6">
                  Try Another Image
                </Button>
              </div>
            )}
          </div>
          
          {/* Editor Toolbar */}
          {activeJob?.status === "completed" && (
            <div className="w-full bg-[#0a0a0a]/80 backdrop-blur-md border-t border-zinc-800 p-3 md:px-6 md:py-4 flex justify-center z-10">
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar w-full md:w-auto justify-start md:justify-center px-1">
                
                <Button
                  variant={tool === "restore" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => toggleTool("restore")}
                  className={`h-9 text-xs rounded-xl transition-all shrink-0 ${
                    tool === "restore"
                      ? "bg-gradient-to-r from-blue-600 to-cyan-400 text-gray-900 font-bold shadow-md"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <Brush className="w-3.5 h-3.5 mr-2" /> Restore
                </Button>

                <Button
                  variant={tool === "erase" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => toggleTool("erase")}
                  className={`h-9 text-xs rounded-xl transition-all shrink-0 ${
                    tool === "erase"
                      ? "bg-rose-600 text-white font-bold shadow-md hover:bg-rose-500"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5 mr-2" /> Erase
                </Button>

                <div className="hidden md:flex items-center gap-2 w-28 px-3 shrink-0">
                  <Slider
                    defaultValue={[30]}
                    max={100}
                    min={5}
                    step={1}
                    value={[brushSize]}
                    onValueChange={(vals: number[]) => setBrushSize(vals[0])}
                    className="h-4 [&_.bg-primary]:!bg-sky-400"
                  />
                </div>

                <div className="w-px h-5 bg-zinc-800 mx-2 shrink-0"></div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={handleUndo} disabled={historyStep <= 0}>
                    <Undo className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={handleRedo} disabled={historyStep >= history.length - 1}>
                    <Redo className="w-4 h-4" />
                  </Button>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* BOTTOM UPLOAD / GENERATE SECTION */}
        <div className="shrink-0 w-full flex flex-col items-center justify-center max-w-4xl mx-auto gap-3 mb-24 md:mb-0">
          
          {/* Model Selector */}
          {(!activeJob || activeJob.status === "failed") && (
            <div className="flex items-center bg-[#0e0e0e] p-1 rounded-full border border-zinc-800 shadow-xl w-fit">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAiModel("briaai/RMBG-1.4")}
                className={`h-8 text-[10px] md:text-xs px-3 md:px-4 rounded-full transition-all duration-300 ${
                  aiModel === "briaai/RMBG-1.4"
                    ? "bg-zinc-800 text-sky-400 font-semibold shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
                }`}
              >
                <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1.5" /> HD (150 MB)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAiModel("Xenova/modnet")}
                className={`h-8 text-[10px] md:text-xs px-3 md:px-4 rounded-full transition-all duration-300 ${
                  aiModel === "Xenova/modnet"
                    ? "bg-zinc-800 text-cyan-400 font-semibold shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
                }`}
              >
                <Zap className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1.5" /> Fast (25 MB)
              </Button>
            </div>
          )}

          {/* Input Bar */}
          <div className="flex items-center gap-2 md:gap-3 w-full">
            <div className="shrink-0 relative">
              <Input
                ref={fileInputRef}
                id="source-image-upload"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageFileChange}
                className="hidden"
                disabled={isLoading}
              />
              <Label
                htmlFor="source-image-upload"
                className={`cursor-pointer h-12 md:h-14 w-12 md:w-14 flex items-center justify-center rounded-xl md:rounded-2xl transition-all shadow-lg ${
                  imagePreviewUrl 
                    ? "bg-sky-500/10 border border-sky-500/50 text-sky-400" 
                    : "bg-[#0e0e0e] border border-zinc-800 text-zinc-400 hover:text-sky-400 hover:border-zinc-600"
                }`}
              >
                <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
              </Label>
            </div>

            <div className="relative flex-grow h-12 md:h-14 bg-[#0e0e0e] border border-zinc-800 rounded-xl md:rounded-2xl flex items-center px-3 md:px-4 shadow-lg transition-colors focus-within:border-sky-500/50 overflow-hidden">
              <span className="text-xs md:text-sm text-zinc-500 truncate pr-28 md:pr-32 select-none w-full">
                {statusText}
              </span>

              <div className="absolute right-1.5 md:right-2 top-1/2 transform -translate-y-1/2">
                {activeJob?.status === "completed" ? (
                  <Button
                    onClick={handleDownload}
                    className="h-9 md:h-10 px-3 md:px-5 rounded-lg md:rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-gray-900 text-xs md:text-sm font-bold shadow-lg shrink-0"
                  >
                    <Download className="w-4 h-4 md:mr-1.5" /> <span className="hidden md:inline">Save Image</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerate}
                    disabled={!sourceImageFile || isLoading}
                    className={`h-9 md:h-10 px-3 md:px-5 rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm font-bold transition-all shadow-lg shrink-0 ${
                      !sourceImageFile || isLoading
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-gray-900 hover:scale-105 active:scale-95"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Remove BG"
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
        
        {/* Features & Models Grid */}
        <section className="p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden shadow-2xl border border-zinc-800/50 bg-[#0e0e0e]/50 backdrop-blur-xl max-w-4xl mx-auto w-full">
          <div className="absolute top-0 right-0 w-72 h-72 bg-sky-500/5 blur-[100px] pointer-events-none z-0"></div>

          <div className="text-center mb-10 relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Professional <span className="text-sky-400">Background Isolation</span>
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
              An advanced, client-side utility engineered for fine-grained alpha matting, absolute layout consistency, and seamless transparent image production.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
            {/* Model Card 1 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-sky-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">💎</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                BRIA RMBG-1.4 Studio Model
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Utilizes the state-of-the-art 150MB Bria AI algorithm to target intricate subjects like hair gradients, clothing textures, and compound edges at crisp, high-definition resolutions.
              </p>
            </div>

            {/* Model Card 2 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-cyan-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">⚡</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Xenova MODNet Engine
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                A highly compact 25MB architectural layer tuned explicitly for instantaneous performance metrics, keeping processing lightweight on multi-device systems.
              </p>
            </div>

            {/* Privacy Card 3 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-emerald-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">🔒</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Zero Cloud Latency
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Leverages local ONNX Web WebAssembly instances. Your digital source assets never travel across server infrastructures, unlocking instant compute execution cycles.
              </p>
            </div>

            {/* Manual Edit Card 4 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-violet-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">🎨</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Alpha Mask Correction
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Equipped with non-destructive native canvas brush controllers allowing micro-level surface corrections, restore actions, and complete masking customizability.
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
              Because this tool runs locally on your own hardware, minimum specifications are required to process the neural networks inside your browser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Minimum Specs */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-sky-400" /> Hardware Specs
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm text-white font-medium">Memory (RAM)</span>
                    <span className="block text-xs text-zinc-500">Minimum 4GB required. 8GB+ recommended for HD Bria model.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm text-white font-medium">Processor</span>
                    <span className="block text-xs text-zinc-500">Dual-core CPU or higher. WebGPU or WebGL 2.0 supported graphics card.</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Browser Support */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" /> Supported Browsers
              </h3>
              <div className="grid grid-cols-2 gap-3">
                
                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Monitor className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Chrome Desktop</span>
                    <span className="block text-[10px] text-zinc-500">Version 113+</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Smartphone className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Chrome Android</span>
                    <span className="block text-[10px] text-zinc-500">Version 113+</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Monitor className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Firefox Desktop</span>
                    <span className="block text-[10px] text-zinc-500">Latest Version</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Monitor className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Microsoft Edge</span>
                    <span className="block text-[10px] text-zinc-500">Version 113+</span>
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