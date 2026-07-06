"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  Download,
  UploadCloud,
  XCircle,
  Settings2,
  Cpu,
  HardDrive,
  Globe,
  CheckCircle2,
  Crop,
  Layers,
  Sparkle,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

// Navbar and Footer relative imports
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// --- Types ---
type OutputFormat = "jpeg" | "png" | "webp" | "pdf";
type AspectRatioPreset = "free" | "1_1" | "16_9" | "9_16" | "4_3";
type BgColor = "white" | "black" | "transparent";

interface CropState {
  x: number; // in % of container (0-100)
  y: number; // in % of container (0-100)
  w: number; // in % of container (0-100)
  h: number; // in % of container (0-100)
}

export default function ImageCropperPage() {
  // --- States ---
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Crop Coordinates State
  const [crop, setCrop] = useState<CropState>({ x: 15, y: 15, w: 70, h: 70 });
  const [dragMode, setDragMode] = useState<"move" | "nw" | "ne" | "sw" | "se" | null>(null);
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; cropX: number; cropY: number; cropW: number; cropH: number }>({
    mouseX: 0,
    mouseY: 0,
    cropX: 0,
    cropY: 0,
    cropW: 0,
    cropH: 0,
  });

  // Settings
  const [aspectPreset, setAspectPreset] = useState<AspectRatioPreset>("free");
  const [cornerRadius, setCornerRadius] = useState<number>(10); // in percent (0-50%)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("png");
  const [quality, setQuality] = useState<number>(85);
  const [bgColor, setBgColor] = useState<BgColor>("transparent");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewImageRef = useRef<HTMLImageElement>(null);

  // --- Detect Mobile ---
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

  // --- Preset Aspect Ratio Enforcer ---
  useEffect(() => {
    if (aspectPreset === "free") return;

    let targetRatio = 1;
    if (aspectPreset === "1_1") targetRatio = 1;
    else if (aspectPreset === "16_9") targetRatio = 16 / 9;
    else if (aspectPreset === "9_16") targetRatio = 9 / 16;
    else if (aspectPreset === "4_3") targetRatio = 4 / 3;

    // Adjust crop height to fit the ratio based on current crop width
    let newH = crop.w / targetRatio;
    
    // Check if new height overflows container bounds, if so, shrink width instead
    if (crop.y + newH > 100) {
      newH = 100 - crop.y;
      const newW = newH * targetRatio;
      setCrop((prev) => ({ ...prev, w: Math.min(100 - prev.x, newW), h: newH }));
    } else {
      setCrop((prev) => ({ ...prev, h: newH }));
    }
  }, [aspectPreset]);

  // --- Cleanup Preview URL ---
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // --- Video Selection Handlers ---
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);

    setSourceFile(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);

    // Load metrics
    const img = document.createElement("img");
    img.src = url;
    img.onload = () => {
      setOriginalDimensions({ width: img.width, height: img.height });
      setImageElement(img);
      setCrop({ x: 15, y: 15, w: 70, h: 70 });
      setAspectPreset("free");
    };
    img.onerror = () => {
      toast.error("Failed to load image metadata.");
      clearImage();
    };
  };

  const clearImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setSourceFile(null);
    setImagePreviewUrl(null);
    setOriginalDimensions({ width: 0, height: 0 });
    setImageElement(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Drag and Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // --- Mouse / Touch Drag Crop Box Core Logic ---
  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent, mode: "move" | "nw" | "ne" | "sw" | "se") => {
    e.preventDefault();
    e.stopPropagation();

    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    setDragMode(mode);
    setDragStart({
      mouseX: clientX,
      mouseY: clientY,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.w,
      cropH: crop.h,
    });
  };

  const handleDrag = (e: MouseEvent | TouchEvent) => {
    if (!dragMode || !containerRef.current) return;

    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((clientX - dragStart.mouseX) / rect.width) * 100;
    const deltaY = ((clientY - dragStart.mouseY) / rect.height) * 100;

    let targetRatio = 1;
    if (aspectPreset === "1_1") targetRatio = 1;
    else if (aspectPreset === "16_9") targetRatio = 16 / 9;
    else if (aspectPreset === "9_16") targetRatio = 9 / 16;
    else if (aspectPreset === "4_3") targetRatio = 4 / 3;

    if (dragMode === "move") {
      // Clamped panning
      const newX = Math.max(0, Math.min(100 - dragStart.cropW, dragStart.cropX + deltaX));
      const newY = Math.max(0, Math.min(100 - dragStart.cropH, dragStart.cropY + deltaY));
      setCrop((prev) => ({ ...prev, x: newX, y: newY }));
    } else {
      // Resize modes
      let newX = crop.x;
      let newY = crop.y;
      let newW = crop.w;
      let newH = crop.h;

      if (dragMode === "se") {
        newW = Math.max(5, Math.min(100 - dragStart.cropX, dragStart.cropW + deltaX));
        newH = aspectPreset !== "free" ? newW / targetRatio : Math.max(5, Math.min(100 - dragStart.cropY, dragStart.cropH + deltaY));
        
        // Overflow check for ratio lock
        if (aspectPreset !== "free" && dragStart.cropY + newH > 100) {
          newH = 100 - dragStart.cropY;
          newW = newH * targetRatio;
        }
      } else if (dragMode === "sw") {
        newW = Math.max(5, Math.min(dragStart.cropX + dragStart.cropW, dragStart.cropW - deltaX));
        newX = dragStart.cropX + dragStart.cropW - newW;
        newH = aspectPreset !== "free" ? newW / targetRatio : Math.max(5, Math.min(100 - dragStart.cropY, dragStart.cropH + deltaY));

        if (aspectPreset !== "free" && dragStart.cropY + newH > 100) {
          newH = 100 - dragStart.cropY;
          newW = newH * targetRatio;
          newX = dragStart.cropX + dragStart.cropW - newW;
        }
      } else if (dragMode === "ne") {
        newW = Math.max(5, Math.min(100 - dragStart.cropX, dragStart.cropW + deltaX));
        newH = aspectPreset !== "free" ? newW / targetRatio : Math.max(5, Math.min(dragStart.cropY + dragStart.cropH, dragStart.cropH - deltaY));
        newY = dragStart.cropY + dragStart.cropH - newH;

        if (aspectPreset !== "free" && newY < 0) {
          newY = 0;
          newH = dragStart.cropY + dragStart.cropH;
          newW = newH * targetRatio;
        }
      } else if (dragMode === "nw") {
        newW = Math.max(5, Math.min(dragStart.cropX + dragStart.cropW, dragStart.cropW - deltaX));
        newX = dragStart.cropX + dragStart.cropW - newW;
        newH = aspectPreset !== "free" ? newW / targetRatio : Math.max(5, Math.min(dragStart.cropY + dragStart.cropH, dragStart.cropH - deltaY));
        newY = dragStart.cropY + dragStart.cropH - newH;

        if (aspectPreset !== "free" && newY < 0) {
          newY = 0;
          newH = dragStart.cropY + dragStart.cropH;
          newW = newH * targetRatio;
          newX = dragStart.cropX + dragStart.cropW - newW;
        }
      }

      setCrop({ x: newX, y: newY, w: newW, h: newH });
    }
  };

  const handleEndDrag = () => {
    setDragMode(null);
  };

  // --- Attach global drag handlers when active ---
  useEffect(() => {
    if (dragMode) {
      window.addEventListener("mousemove", handleDrag);
      window.addEventListener("mouseup", handleEndDrag);
      window.addEventListener("touchmove", handleDrag, { passive: false });
      window.addEventListener("touchend", handleEndDrag);
    }
    return () => {
      window.removeEventListener("mousemove", handleDrag);
      window.removeEventListener("mouseup", handleEndDrag);
      window.removeEventListener("touchmove", handleDrag);
      window.removeEventListener("touchend", handleEndDrag);
    };
  }, [dragMode, dragStart, crop]);

  // --- Render Crop Action ---
  const handleCropImage = async () => {
    if (!imageElement || !sourceFile) return;

    setIsProcessing(true);

    // Calculate dimensions
    const imgW = originalDimensions.width;
    const imgH = originalDimensions.height;

    const cropX = (crop.x / 100) * imgW;
    const cropY = (crop.y / 100) * imgH;
    const cropW = (crop.w / 100) * imgW;
    const cropH = (crop.h / 100) * imgH;

    // Create offscreen canvas matching cropped dimensions
    const canvas = document.createElement("canvas");
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Failed to initialize canvas contexts.");
      setIsProcessing(false);
      return;
    }

    // Border rounding math
    const radius = Math.min(cropW, cropH) * (cornerRadius / 100);

    // Background color flattening (for rounded transparent corners to JPG/PDF)
    if (outputFormat === "jpeg" || outputFormat === "pdf" || bgColor !== "transparent") {
      ctx.fillStyle = bgColor === "transparent" ? "#ffffff" : bgColor;
      ctx.fillRect(0, 0, cropW, cropH);
    }

    // Clip path for rounded borders
    if (radius > 0) {
      ctx.beginPath();
      ctx.roundRect(0, 0, cropW, cropH, radius);
      ctx.clip();
    }

    // Draw the cropped portion of original image
    ctx.drawImage(imageElement, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const baseName = sourceFile.name.substring(0, sourceFile.name.lastIndexOf("."));

    if (outputFormat === "pdf") {
      try {
        const imgData = canvas.toDataURL("image/jpeg", quality / 100);
        const pdf = new jsPDF({
          orientation: cropW > cropH ? "landscape" : "portrait",
          unit: "px",
          format: [cropW, cropH]
        });
        pdf.addImage(imgData, "JPEG", 0, 0, cropW, cropH);
        pdf.save(`cropped-${baseName}.pdf`);
        toast.success("PDF exported successfully!");
      } catch (err) {
        console.error("PDF generation failed:", err);
        toast.error("Failed to generate PDF document.");
      } finally {
        setIsProcessing(false);
      }
    } else {
      const mimeMap: Record<OutputFormat, string> = {
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        pdf: "image/jpeg"
      };

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Cropping failed.");
          setIsProcessing(false);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `cropped-${baseName}.${outputFormat === "jpeg" ? "jpg" : outputFormat}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        toast.success("Image cropped and saved!");
        setIsProcessing(false);
      }, mimeMap[outputFormat], quality / 100);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.log(bytes) / Math.log(k);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans flex flex-col">
      <Navbar />

      {/* Main Container */}
      <div
        className="flex flex-col w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6"
        style={{ minHeight: "calc(100vh - 80px)" }}
      >
        
        {/* Main Work Area */}
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12 min-h-[50vh] md:min-h-[65vh]">
          
          {/* LEFT: Cropper Preview Area (lg:col-span-8) */}
          <div className="lg:col-span-8 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] flex flex-col relative overflow-hidden shadow-2xl p-4 md:p-6 justify-center items-center">
            
            {/* Empty Upload State */}
            {!imagePreviewUrl ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-xl py-12 md:py-20 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                  isDragOver
                    ? "border-cyan-500 bg-cyan-500/5 scale-[1.02]"
                    : "border-zinc-800 bg-[#0a0a0a] hover:border-zinc-700 hover:bg-[#0c0c0f]"
                }`}
              >
                <UploadCloud className="h-16 w-16 mb-6 text-zinc-600 animate-pulse" />
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">Image Cropper & Corner Rounder</h1>
                <p className="text-zinc-400 max-w-md mb-6 text-sm leading-relaxed px-4">
                  Drag and drop your image here, or click to browse. Crop selections, round corners, and convert formats.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Private Local Processing
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Crop className="w-3.5 h-3.5 text-emerald-400" /> Lock Aspect Ratios
                  </div>
                </div>
              </div>
            ) : (
              /* Loaded Interactive Cropper State */
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                
                {/* Outer bounding container wrapper */}
                <div 
                  ref={containerRef}
                  className="relative max-h-[55vh] max-w-full rounded-xl overflow-hidden border border-zinc-800 shadow-2xl select-none"
                >
                  <img
                    ref={previewImageRef}
                    src={imagePreviewUrl}
                    alt="Interactive Preview"
                    className="max-h-[50vh] max-w-full pointer-events-none block object-contain"
                  />

                  {/* Dark shading mask overlays */}
                  {/* Top Mask */}
                  <div 
                    className="absolute top-0 left-0 right-0 bg-black/60 z-10 pointer-events-none"
                    style={{ height: `${crop.y}%` }}
                  />
                  {/* Bottom Mask */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-black/60 z-10 pointer-events-none"
                    style={{ height: `${100 - crop.y - crop.h}%` }}
                  />
                  {/* Left Mask */}
                  <div 
                    className="absolute top-0 bottom-0 left-0 bg-black/60 z-10 pointer-events-none"
                    style={{
                      top: `${crop.y}%`,
                      height: `${crop.h}%`,
                      width: `${crop.x}%`
                    }}
                  />
                  {/* Right Mask */}
                  <div 
                    className="absolute top-0 bottom-0 right-0 bg-black/60 z-10 pointer-events-none"
                    style={{
                      top: `${crop.y}%`,
                      height: `${crop.h}%`,
                      width: `${100 - crop.x - crop.w}%`
                    }}
                  />

                  {/* Interactive Crop Selection Window */}
                  <div
                    onMouseDown={(e) => handleStartDrag(e, "move")}
                    onTouchStart={(e) => handleStartDrag(e, "move")}
                    className="absolute z-20 cursor-move border-2 border-dashed border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:border-cyan-300 transition-colors"
                    style={{
                      left: `${crop.x}%`,
                      top: `${crop.y}%`,
                      width: `${crop.w}%`,
                      height: `${crop.h}%`,
                      borderRadius: `${cornerRadius}%`
                    }}
                  >
                    {/* Visual Crop Lines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                      <div className="border-r border-b border-white/40" />
                      <div className="border-r border-b border-white/40" />
                      <div className="border-b border-white/40" />
                      <div className="border-r border-b border-white/40" />
                      <div className="border-r border-b border-white/40" />
                      <div className="border-b border-white/40" />
                      <div className="border-r border-white/40" />
                      <div className="border-r border-white/40" />
                      <div />
                    </div>

                    {/* Resize Handles */}
                    {/* Top-Left */}
                    <div
                      onMouseDown={(e) => handleStartDrag(e, "nw")}
                      onTouchStart={(e) => handleStartDrag(e, "nw")}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-cyan-400 rounded-full border border-white cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                    />
                    {/* Top-Right */}
                    <div
                      onMouseDown={(e) => handleStartDrag(e, "ne")}
                      onTouchStart={(e) => handleStartDrag(e, "ne")}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-cyan-400 rounded-full border border-white cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                    />
                    {/* Bottom-Left */}
                    <div
                      onMouseDown={(e) => handleStartDrag(e, "sw")}
                      onTouchStart={(e) => handleStartDrag(e, "sw")}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-cyan-400 rounded-full border border-white cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                    />
                    {/* Bottom-Right */}
                    <div
                      onMouseDown={(e) => handleStartDrag(e, "se")}
                      onTouchStart={(e) => handleStartDrag(e, "se")}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-cyan-400 rounded-full border border-white cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                    />
                  </div>

                  {/* Absolute Delete overlay button */}
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={clearImage}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg bg-red-600 hover:bg-red-500 z-30 transition-transform active:scale-90"
                    title="Remove Image"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>

                {/* Crop coordinates metrics details info */}
                <div className="flex flex-wrap items-center justify-center gap-3 bg-[#0a0a0c] border border-zinc-800 p-2.5 rounded-xl mt-4 z-20 shadow-md">
                  <span className="text-zinc-400 font-mono text-xs select-none">
                    Image: <strong className="text-white">{originalDimensions.width}x{originalDimensions.height}</strong>
                  </span>
                  <span className="text-zinc-500 font-mono text-xs select-none px-2 border-l border-zinc-800">
                    Cropped size: <strong className="text-cyan-400">
                      {Math.round((crop.w / 100) * originalDimensions.width)}x{Math.round((crop.h / 100) * originalDimensions.height)}px
                    </strong>
                  </span>
                  <span className="text-zinc-500 font-mono text-xs select-none px-2 border-l border-zinc-800">
                    Aspect Ratio: {(crop.w / crop.h).toFixed(2)}:1
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Control Board (lg:col-span-4) */}
          <div className="lg:col-span-4 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] p-5 md:p-6 flex flex-col shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Settings2 className="w-5 h-5 text-cyan-400" /> Cropping Panel
            </h2>

            {/* Inputs & Actions */}
            <div className="space-y-6 flex-grow">
              
              {/* Aspect Ratio Lock Presets */}
              <div>
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-2.5">
                  1. Lock Aspect Ratio
                </Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: "free", name: "Free" },
                    { id: "1_1", name: "1:1" },
                    { id: "16_9", name: "16:9" },
                    { id: "9_16", name: "9:16" },
                    { id: "4_3", name: "4:3" },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setAspectPreset(preset.id as AspectRatioPreset)}
                      className={`py-2 rounded-lg border text-center text-xs font-medium transition-all ${
                        aspectPreset === preset.id
                          ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 font-semibold"
                          : "bg-[#060608] border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Corner radius rounding slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    2. Border Rounding (Corners)
                  </Label>
                  <span className="text-cyan-400 font-mono text-xs font-bold">
                    {cornerRadius === 0 ? "Square" : cornerRadius === 50 ? "Circle / Oval" : `${cornerRadius * 2}%`}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={50}
                  step={1}
                  value={[cornerRadius]}
                  onValueChange={(val) => setCornerRadius(val[0])}
                  className="py-2"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Adjust slider to round borders. Max value (50%) creates a circular/oval clip mask.
                </span>
              </div>

              {/* Export format select */}
              <div>
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-2">
                  3. Export Save Format
                </Label>
                <Select
                  value={outputFormat}
                  onValueChange={(val) => setOutputFormat(val as OutputFormat)}
                >
                  <SelectTrigger className="w-full bg-[#060608] border-zinc-800 text-zinc-300 rounded-xl focus:ring-cyan-500/50">
                    <SelectValue placeholder="Select save format" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-zinc-800 text-zinc-300">
                    <SelectItem value="png">PNG - Transparency Preserved</SelectItem>
                    <SelectItem value="webp">WebP - High Compression</SelectItem>
                    <SelectItem value="jpeg">JPEG (JPG) - Lossy Photo</SelectItem>
                    <SelectItem value="pdf">PDF - Document Package</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quality slider (hidden for png lossless) */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    4. Compression Quality
                  </Label>
                  <span className={`font-mono text-xs font-bold ${outputFormat === "png" ? "text-zinc-600" : "text-cyan-400"}`}>
                    {outputFormat === "png" ? "Lossless" : `${quality}%`}
                  </span>
                </div>
                <Slider
                  min={10}
                  max={100}
                  step={1}
                  value={[quality]}
                  onValueChange={(val) => setQuality(val[0])}
                  disabled={outputFormat === "png"}
                  className="py-2"
                />
              </div>

              {/* Background Color Flattener */}
              {(outputFormat === "jpeg" || outputFormat === "pdf" || (bgColor !== "transparent" && cornerRadius > 0)) && (
                <div className="animate-in fade-in duration-300">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-2">
                    5. Transparency Corner Fill
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "white", name: "White Background", code: "#ffffff" },
                      { id: "black", name: "Black Background", code: "#000000" },
                      { id: "transparent", name: "Transparent (PNG/WebP)", code: "#000000" },
                    ].map((col) => {
                      if (col.id === "transparent" && (outputFormat === "jpeg" || outputFormat === "pdf")) {
                        return null; // Transparent not supported for JPEG/PDF
                      }
                      return (
                        <button
                          key={col.id}
                          onClick={() => setBgColor(col.id as BgColor)}
                          className={`p-2 rounded-xl border text-xs transition-all flex items-center justify-center gap-1.5 ${
                            bgColor === col.id
                              ? "bg-cyan-500/10 border-cyan-500 text-white font-semibold"
                              : "bg-[#060608] border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                          }`}
                        >
                          <div
                            className="w-3.5 h-3.5 rounded border border-zinc-700 shrink-0"
                            style={{
                              backgroundColor: col.id === "transparent" ? "transparent" : col.code,
                              backgroundImage: col.id === "transparent" ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)" : "none",
                              backgroundSize: "6px 6px",
                              backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0px"
                            }}
                          />
                          <span className="text-[10px]">{col.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Generate Action Button */}
            <div className="mt-8 pt-4 border-t border-zinc-800 flex flex-col gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
              {!imagePreviewUrl ? (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95"
                >
                  <UploadCloud className="w-4 h-4 mr-2" /> Upload Image
                </Button>
              ) : (
                <Button
                  onClick={handleCropImage}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cropping...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> Crop & Save Image
                    </>
                  )}
                </Button>
              )}
            </div>

          </div>

        </div>

        {/* --- SECTION 2: SEO & EXPLANATIONS (Below the fold) --- */}
        <div className="w-full py-10 flex flex-col gap-8 md:gap-12 mt-24 md:mt-40 max-w-5xl mx-auto">
          
          {/* Features Grid */}
          <section className="p-6 md:p-10 rounded-[2rem] border border-zinc-800/50 bg-[#0e0e0e]/50 backdrop-blur-xl relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/5 blur-[100px] pointer-events-none z-0"></div>
            
            <div className="text-center mb-8 relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Local Image <span className="text-cyan-400">Cropper & Corner Rounder</span>
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                Crop pictures and round borders locally in your browser. Lock proportions to square or widescreen layout formats and transcode images without cloud uploads.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">✂️</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Interactive Cropper Overlay</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Drag the custom selection window and scale it from corners using mouse/touch gestures. Easily isolate the focal points of any photo.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">⭕</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Adjustable Corner Rounding</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Apply rounded borders with a custom corner radius slider. Maximize the setting to crop pictures into perfect circles or ovals.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔒</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">100% Client-Side Privacy</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Processing occurs completely within your local browser sandbox. Your images are never transmitted over the internet, safeguarding your personal folders.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">💾</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Preserve Audio & Multi-Format</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Convert cropped selections directly to PNG (lossless), WebP, JPEG, or create single-page PDF document packages on save.
                </p>
              </div>
            </div>
          </section>

          {/* System Requirements */}
          <section className="p-6 md:p-8 rounded-[2rem] border border-zinc-800/50 bg-[#0e0e0e]/50 backdrop-blur-xl">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Cpu className="text-cyan-400 w-5 h-5" /> Local System Requirements
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm mb-6 leading-relaxed">
              Standard browser capabilities enable fast processing for all hardware. Support depends on browser image file codecs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Size limits & transparency constraints */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" /> Image Size Limits
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold text-white">Recommended Size Limit</span>
                      <span className="block text-[11px] text-zinc-500">Supports images up to 50MB size. High resolution images (e.g. 8K+) require sufficient system RAM to draw on Canvas without running out of memory.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold text-white">Transparency Flattening</span>
                      <span className="block text-[11px] text-zinc-500">Transcoding PNGs/WebPs to JPEG/PDF flattens transparent layers. Select a background color parameter (default is white) to fill empty pixels cleanly.</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Supported Tech specs */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" /> Browser Compatibility
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Chrome Desktop</span>
                    <span className="block text-[10px] text-zinc-500">Full Support (WebP, JPG, PNG, PDF)</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Safari Mac / iOS</span>
                    <span className="block text-[10px] text-zinc-500">Full Support (PNG, JPG, WebP, PDF)</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Firefox Desktop</span>
                    <span className="block text-[10px] text-zinc-500">Full Support (JPG, PNG, WebP, PDF)</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Chrome Android</span>
                    <span className="block text-[10px] text-zinc-500">Full Support (JPG, PNG, WebP, PDF)</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

        </div>

      </div>

      <Footer />
    </main>
  );
}
