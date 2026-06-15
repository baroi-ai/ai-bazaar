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
  Cpu,
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

export default function MagicEraserPage() {
  // --- State ---
  const [statusText, setStatusText] = useState("Upload an image to begin...");
  const [ready, setReady] = useState(false);

  // File & Preview
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);

  // Editor State
  const [brushSize, setBrushSize] = useState(30);
  const [isDragging, setIsDragging] = useState(false);
  
  // History State for Undo
  const [history, setHistory] = useState<ImageData[]>([]);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // --- MEMORY CLEANUP ---
  const revokeUrl = (url: string | null) => {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  // --- WORKER SETUP ---
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./magic-eraser.worker.ts", import.meta.url),
      { type: "module" }
    );

    workerRef.current.onmessage = (e) => {
      const { status, result, error } = e.data;

      if (status === "ready") {
        setReady(true);
      }

      if (status === "done") {
        const c = document.createElement("canvas");
        c.width = result.width;
        c.height = result.height;
        c.getContext("2d")!.putImageData(result, 0, 0);

        c.toBlob((b) => {
          if (!b) return;
          const url = URL.createObjectURL(b);

          revokeUrl(imagePreviewUrl);
          setImagePreviewUrl(url);

          const img = new Image();
          img.src = url;
          img.onload = () => {
            originalImageRef.current = img;
          };

          const ctx = canvasRef.current?.getContext("2d");
          ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
          setHistory([]);

          setIsProcessing(false);
          toast.success("Object Removed Successfully!");
        }, "image/png");
      }

      if (status === "error") {
        console.error(error);
        toast.error("Error: " + error);
        setIsProcessing(false);
      }
    };

    workerRef.current.postMessage({ action: "preload" });

    return () => {
      workerRef.current?.terminate();
      if (imagePreviewUrl) revokeUrl(imagePreviewUrl);
    };
  }, []);

  // --- IMAGE UPLOAD ---
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error("File size cannot exceed 15MB.");
        return;
      }

      revokeUrl(imagePreviewUrl);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      setStatusText(file.name);

      const img = new Image();
      img.src = url;
      img.onload = () => {
        originalImageRef.current = img;
        // Map canvas true size to image immediately
        if (canvasRef.current) {
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
        }
      };

      setHistory([]);
      e.target.value = "";
    }
  };

  const clearImage = () => {
    revokeUrl(imagePreviewUrl);
    setImagePreviewUrl(null);
    setStatusText("Upload an image to begin...");
    setHistory([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- DRAWING LOGIC ---
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

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current || isProcessing) return;
    
    setIsDragging(true);
    const pos = getPointerPos(e);
    lastPosRef.current = pos;

    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(239, 68, 68, 0.6)"; // Red-500
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !canvasRef.current || !lastPosRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const currentPos = getPointerPos(e);

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(239, 68, 68, 0.6)"; // Red-500

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    lastPosRef.current = currentPos;
  };

  const stopDrawing = () => {
    if (isDragging) {
      setIsDragging(false);
      lastPosRef.current = null;

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && canvasRef.current) {
        const snapshot = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        setHistory((prev) => [...prev, snapshot].slice(-15)); // Keep last 15 actions
      }
    }
  };

  const handleUndo = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || history.length === 0) return;

    const newHistory = [...history];
    newHistory.pop(); // Remove current state
    setHistory(newHistory);

    if (newHistory.length > 0) {
      ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    } else {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  };

  const handleGenerate = async () => {
    if (!originalImageRef.current || !canvasRef.current || !imagePreviewUrl) return;

    setIsProcessing(true);

    try {
      const imageRes = await fetch(imagePreviewUrl);
      const imageBlob = await imageRes.blob();
      const imageBitmap = await createImageBitmap(imageBlob);
      const maskBitmap = await createImageBitmap(canvasRef.current);

      workerRef.current?.postMessage(
        { action: "process", imageBitmap, maskBitmap },
        [imageBitmap, maskBitmap]
      );
    } catch (error: any) {
      console.error(error);
      toast.error("Failed: " + (error.message || "Unknown error"));
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!imagePreviewUrl) return;
    const link = document.createElement("a");
    link.href = imagePreviewUrl;
    link.setAttribute("download", `magic-erased-${Date.now()}.png`);
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
          
          <div className="flex-1 w-full h-full overflow-hidden relative flex items-center justify-center p-4 md:p-8">
            
            {/* STATE 1: Empty */}
            {!imagePreviewUrl && (
              <div className="flex flex-col items-center justify-center text-center p-6 md:p-12 w-full animate-in fade-in zoom-in-95 duration-500">
                <Eraser className="h-16 w-16 mb-6 text-zinc-700" />
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">AI Magic Eraser</h1>
                <p className="text-zinc-400 max-w-md mb-8 text-sm md:text-base leading-relaxed">
                  Upload an image and paint over any object, text, or blemish to instantly remove it. Processing runs entirely in your browser.
                </p>
                <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full text-xs font-medium uppercase tracking-wider">
                  <Cpu className="w-4 h-4" /> 100% Private Local Inference
                </div>
              </div>
            )}

            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0e0e0e]/80 backdrop-blur-sm animate-in fade-in">
                <Loader2 className="h-12 w-12 animate-spin text-rose-500 mb-4" />
                <p className="text-white font-bold text-lg animate-pulse">Removing Object...</p>
                <p className="text-xs text-zinc-400 mt-2 font-mono">Running OpenCV WASM</p>
              </div>
            )}

            {/* STATE 2 & 4: Interactive Canvas (Preview & Result) */}
            {imagePreviewUrl && (
              <div className="animate-in fade-in duration-500 relative shadow-2xl rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-2 flex items-center justify-center h-fit max-h-full max-w-full">
                
                {/* Responsive container that restricts the canvas to exactly match the image bounds */}
                <div className="relative flex items-center justify-center max-w-full max-h-[60vh] w-auto h-auto">
                  
                  {/* Base Image */}
                  <img src={imagePreviewUrl} alt="Source" className="max-h-[60vh] max-w-full w-auto object-contain rounded-xl block pointer-events-none" />
                  
                  {/* Drawing Canvas Overlaid Perfectly */}
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="absolute inset-0 max-h-[60vh] max-w-full w-auto h-auto object-contain touch-none cursor-crosshair rounded-xl opacity-70"
                  />
                </div>

                <Button
                  variant="destructive"
                  size="icon"
                  onClick={clearImage}
                  className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-lg transition-opacity bg-red-600 hover:bg-red-500 z-40"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Editor Toolbar */}
          {imagePreviewUrl && (
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
          
          {/* Engine Status Pill */}
          {!imagePreviewUrl && (
            <div className="flex items-center bg-[#0e0e0e] p-1.5 px-4 rounded-full border border-zinc-800 shadow-xl w-fit">
              <div className={`w-2 h-2 rounded-full mr-2 ${ready ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" : "bg-rose-500 animate-pulse"}`}></div>
              <span className="text-[10px] md:text-xs text-zinc-400 font-medium">
                {ready ? "OpenCV Navier-Stokes Engine Ready" : "Loading Engine..."}
              </span>
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
                disabled={isProcessing}
              />
              <Label
                htmlFor="source-image-upload"
                className={`cursor-pointer h-12 md:h-14 w-12 md:w-14 flex items-center justify-center rounded-xl md:rounded-2xl transition-all shadow-lg ${
                  imagePreviewUrl 
                    ? "bg-rose-500/10 border border-rose-500/50 text-rose-400" 
                    : "bg-[#0e0e0e] border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-zinc-600"
                }`}
              >
                <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
              </Label>
            </div>

            <div className="relative flex-grow h-12 md:h-14 bg-[#0e0e0e] border border-zinc-800 rounded-xl md:rounded-2xl flex items-center px-3 md:px-4 shadow-lg transition-colors focus-within:border-rose-500/50 overflow-hidden">
              <span className="text-xs md:text-sm text-zinc-500 truncate pr-40 select-none w-full">
                {statusText}
              </span>

              <div className="absolute right-1.5 md:right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                
                {/* Download Button (Only shows if image is uploaded) */}
                {imagePreviewUrl && (
                   <Button
                    onClick={handleDownload}
                    variant="ghost"
                    className="h-9 md:h-10 px-3 md:px-4 rounded-lg md:rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
                    title="Download current state"
                  >
                    <Download className="w-4 h-4" /> 
                  </Button>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={!imagePreviewUrl || isProcessing || !ready}
                  className={`h-9 md:h-10 px-4 md:px-6 rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm font-bold transition-all shadow-lg shrink-0 ${
                    !imagePreviewUrl || isProcessing || !ready
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-red-600 to-rose-400 hover:from-red-500 hover:to-rose-300 text-white hover:scale-105 active:scale-95"
                  }`}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : !ready ? (
                    "Loading Engine..."
                  ) : (
                    <>
                      <Eraser className="w-4 h-4 mr-2" /> Erase Selection
                    </>
                  )}
                </Button>

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
              Flawless <span className="text-rose-400">Object Deletion</span>
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
              An advanced, client-side inpainting utility engineered to reconstruct backgrounds, remove blemishes, and delete unwanted objects with microscopic accuracy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
            {/* Model Card 1 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-rose-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">🧠</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Navier-Stokes Algorithm
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Utilizes the powerful mathematical OpenCV INPAINT_NS engine to seamlessly match surrounding textures, lighting, and geometric structures in milliseconds.
              </p>
            </div>

            {/* Model Card 2 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-pink-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">⚡</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Ultra-Lightweight Engine
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Compiled directly into WebAssembly (WASM). At under 3MB, this logic layer initiates instantly across both desktop hardware and mobile devices without heavy network loads.
              </p>
            </div>

            {/* Privacy Card 3 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-orange-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">🔒</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                100% Local Privacy
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Your images are processed directly inside your browser. No data is ever transmitted, intercepted, or saved to cloud servers. Total security for sensitive photography.
              </p>
            </div>

            {/* Manual Edit Card 4 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-red-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">🎨</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Precision Brushing
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Dynamic, adjustable brush controls allow for targeting tiny skin blemishes, power lines, or massive background objects with absolute precision and undo-history.
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
              Because this tool executes computer vision logic locally, your browser must support modern WebAssembly standards.
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
                    <span className="block text-xs text-zinc-500">Minimum 2GB required. Can operate on entry-level mobile devices.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm text-white font-medium">Processor</span>
                    <span className="block text-xs text-zinc-500">WebAssembly supported CPU required. Hardware acceleration utilizes available GPU.</span>
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
                    <span className="block text-[10px] text-zinc-500">Version 90+</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Smartphone className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Chrome Android</span>
                    <span className="block text-[10px] text-zinc-500">Version 90+</span>
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
                    <span className="block text-xs font-semibold text-white">Safari / WebKit</span>
                    <span className="block text-[10px] text-zinc-500">Version 15+</span>
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