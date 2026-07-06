"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Trash2,
  Image,
  Layers,
  ArrowRight,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

// Navbar and Footer relative imports
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// --- Types ---
type ResizeMode = "percentage" | "pixels";
type OutputFormat = "jpeg" | "png" | "webp" | "pdf";
type BgColor = "white" | "black" | "transparent";

export default function ImageSizeReducerPage() {
  // --- States ---
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Reducer Control States
  const [resizeMode, setResizeMode] = useState<ResizeMode>("percentage");
  const [percentScale, setPercentScale] = useState<number>(70);
  const [pixelWidth, setPixelWidth] = useState<string>("");
  const [pixelHeight, setPixelHeight] = useState<string>("");
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("jpeg");
  const [quality, setQuality] = useState<number>(75);
  const [bgColor, setBgColor] = useState<BgColor>("white");

  // Dynamic Estimation State
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // --- Cleanup Object URLs ---
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // --- Trigger Real-Time Compression Size Estimation ---
  useEffect(() => {
    if (!imageElement || !sourceFile) {
      setEstimatedSize(null);
      return;
    }

    const timer = setTimeout(() => {
      estimateCompressedSize();
    }, 150); // debounce input slider movements

    return () => clearTimeout(timer);
  }, [imageElement, resizeMode, percentScale, pixelWidth, pixelHeight, outputFormat, quality, bgColor]);

  // --- Image Selection Handlers ---
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (JPEG, PNG, WebP, etc.).");
      return;
    }

    // Revoke previous URL if any
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);

    setSourceFile(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);

    // Create Image element to extract metrics
    const img = document.createElement("img");
    img.src = url;
    img.onload = () => {
      setOriginalDimensions({ width: img.width, height: img.height });
      setPixelWidth(img.width.toString());
      setPixelHeight(img.height.toString());
      setImageElement(img);
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
    setPixelWidth("");
    setPixelHeight("");
    setEstimatedSize(null);
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

  // --- Dimension Sync logic ---
  const handleWidthChange = (val: string) => {
    setPixelWidth(val);
    const w = parseInt(val);
    if (lockAspectRatio && originalDimensions.width > 0 && !isNaN(w)) {
      const ratio = originalDimensions.height / originalDimensions.width;
      setPixelHeight(Math.round(w * ratio).toString());
    }
  };

  const handleHeightChange = (val: string) => {
    setPixelHeight(val);
    const h = parseInt(val);
    if (lockAspectRatio && originalDimensions.height > 0 && !isNaN(h)) {
      const ratio = originalDimensions.width / originalDimensions.height;
      setPixelWidth(Math.round(h * ratio).toString());
    }
  };

  // --- Dimension Calculator Helper ---
  const getTargetDimensions = () => {
    if (resizeMode === "percentage") {
      const scale = percentScale / 100;
      const w = Math.round(originalDimensions.width * scale);
      const h = Math.round(originalDimensions.height * scale);
      return { width: w > 0 ? w : 1, height: h > 0 ? h : 1 };
    } else {
      const w = parseInt(pixelWidth);
      const h = parseInt(pixelHeight);
      return {
        width: !isNaN(w) && w > 0 ? w : originalDimensions.width,
        height: !isNaN(h) && h > 0 ? h : originalDimensions.height,
      };
    }
  };

  // --- Dynamic Compression Size Estimator ---
  const estimateCompressedSize = () => {
    if (!imageElement || !sourceFile) return;

    setIsEstimating(true);
    const { width: targetW, height: targetH } = getTargetDimensions();

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsEstimating(false);
      return;
    }

    // Flatten background
    if (outputFormat === "jpeg" || outputFormat === "pdf" || bgColor !== "transparent") {
      ctx.fillStyle = bgColor === "transparent" ? "#ffffff" : bgColor;
      ctx.fillRect(0, 0, targetW, targetH);
    }

    ctx.drawImage(imageElement, 0, 0, targetW, targetH);

    if (outputFormat === "pdf") {
      // PDF size is roughly JPEG size + minimal PDF overhead (~10 KB)
      canvas.toBlob((blob) => {
        if (blob) {
          setEstimatedSize(blob.size + 12000); // Add ~12KB buffer for PDF headers
        }
        setIsEstimating(false);
      }, "image/jpeg", quality / 100);
    } else {
      const mimeMap: Record<OutputFormat, string> = {
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        pdf: "image/jpeg", // Handled separately
      };
      canvas.toBlob((blob) => {
        if (blob) {
          setEstimatedSize(blob.size);
        }
        setIsEstimating(false);
      }, mimeMap[outputFormat], quality / 100);
    }
  };

  // --- Export / Reduction Processor ---
  const handleProcessImage = async () => {
    if (!imageElement || !sourceFile) return;

    setIsProcessing(true);
    const { width: targetW, height: targetH } = getTargetDimensions();

    // Create final processing canvas
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Unable to initialize image processor.");
      setIsProcessing(false);
      return;
    }

    // Background color flattening
    if (outputFormat === "jpeg" || outputFormat === "pdf" || bgColor !== "transparent") {
      ctx.fillStyle = bgColor === "transparent" ? "#ffffff" : bgColor;
      ctx.fillRect(0, 0, targetW, targetH);
    }

    ctx.drawImage(imageElement, 0, 0, targetW, targetH);

    const baseName = sourceFile.name.substring(0, sourceFile.name.lastIndexOf("."));

    if (outputFormat === "pdf") {
      try {
        const imgData = canvas.toDataURL("image/jpeg", quality / 100);
        const pdf = new jsPDF({
          orientation: targetW > targetH ? "landscape" : "portrait",
          unit: "px",
          format: [targetW, targetH]
        });
        pdf.addImage(imgData, "JPEG", 0, 0, targetW, targetH);
        pdf.save(`reduced-${baseName}.pdf`);
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
          toast.error("Image compression failed.");
          setIsProcessing(false);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `reduced-${baseName}.${outputFormat === "jpeg" ? "jpg" : outputFormat}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        toast.success("Image reduced successfully!");
        setIsProcessing(false);
      }, mimeMap[outputFormat], quality / 100);
    }
  };

  // --- Display Size Formatter ---
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getCompressionSavings = () => {
    if (!sourceFile || !estimatedSize) return 0;
    const savings = ((sourceFile.size - estimatedSize) / sourceFile.size) * 100;
    return savings;
  };

  const getQualityBadge = (val: number) => {
    if (val < 30) return "High Compression (Low Fidelity)";
    if (val < 65) return "Balanced (Recommended)";
    if (val < 90) return "High Quality (Lower Compression)";
    return "Maximum Quality (Heavy size)";
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
          
          {/* LEFT: Image Preview Area (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] flex flex-col relative overflow-hidden shadow-2xl p-4 md:p-6 justify-center items-center">
            
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
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">Image Size Reducer</h1>
                <p className="text-zinc-400 max-w-md mb-6 text-sm leading-relaxed px-4">
                  Drag and drop your image here, or click to browse. Supports JPEG, PNG, WebP, SVG, and more.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Private Local Processing
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" /> PDF & Image Transcoding
                  </div>
                </div>
              </div>
            ) : (
              /* Loaded Image Preview State */
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <div className="relative w-full max-h-[55vh] flex items-center justify-center flex-grow p-2">
                  <img
                    src={imagePreviewUrl}
                    alt="Source Preview"
                    className="max-h-[50vh] max-w-full rounded-xl border border-zinc-800 shadow-2xl object-contain bg-zinc-950/20"
                  />

                  {/* Absolute Delete overlay button */}
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={clearImage}
                    className="absolute -top-1 -right-1 h-8 w-8 rounded-full shadow-lg bg-red-600 hover:bg-red-500 z-30 transition-transform active:scale-90"
                    title="Remove Image"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>

                {/* Image details metadata info */}
                <div className="flex items-center gap-3 bg-[#0a0a0c] border border-zinc-800 p-2.5 rounded-xl mt-4 z-20 shadow-md">
                  <span className="text-zinc-400 font-mono text-xs select-none">
                    Name: <strong className="text-white truncate max-w-[120px] inline-block align-bottom">{sourceFile?.name}</strong>
                  </span>
                  <span className="text-zinc-500 font-mono text-xs select-none px-2 border-l border-zinc-800">
                    Size: {sourceFile ? formatSize(sourceFile.size) : "--"}
                  </span>
                  <span className="text-zinc-500 font-mono text-xs select-none px-2 border-l border-zinc-800">
                    Resolution: {originalDimensions.width ? `${originalDimensions.width}x${originalDimensions.height}` : "--"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Control Board (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] p-5 md:p-6 flex flex-col shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Settings2 className="w-5 h-5 text-cyan-400" /> Reduction Board
            </h2>

            {/* Inputs & Actions */}
            <div className="space-y-6 flex-grow">
              
              {/* Resize Mode Selector */}
              <div>
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-3">
                  1. Dimension Resizing
                </Label>
                
                <div className="grid grid-cols-2 gap-2 mb-3 bg-[#060608] p-1 rounded-xl border border-zinc-800/80">
                  <button
                    onClick={() => setResizeMode("percentage")}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      resizeMode === "percentage"
                        ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Resize by Percentage
                  </button>
                  <button
                    onClick={() => setResizeMode("pixels")}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      resizeMode === "pixels"
                        ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Resize by Pixels
                  </button>
                </div>

                {/* Percentage slider */}
                {resizeMode === "percentage" ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Dimensions Scale:</span>
                      <span className="text-cyan-400 font-mono font-bold">{percentScale}%</span>
                    </div>
                    <Slider
                      min={10}
                      max={100}
                      step={1}
                      value={[percentScale]}
                      onValueChange={(val) => setPercentScale(val[0])}
                    />
                    {originalDimensions.width > 0 && (
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                        New Scale: {getTargetDimensions().width}x{getTargetDimensions().height}
                      </span>
                    )}
                  </div>
                ) : (
                  /* Pixel Width/Height Inputs */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-zinc-500 text-[10px] uppercase font-bold">Width (px)</Label>
                        <Input
                          type="number"
                          value={pixelWidth}
                          onChange={(e) => handleWidthChange(e.target.value)}
                          className="bg-[#060608] border-zinc-800 text-white rounded-lg text-xs h-9 focus:ring-cyan-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-zinc-500 text-[10px] uppercase font-bold">Height (px)</Label>
                        <Input
                          type="number"
                          value={pixelHeight}
                          onChange={(e) => handleHeightChange(e.target.value)}
                          className="bg-[#060608] border-zinc-800 text-white rounded-lg text-xs h-9 focus:ring-cyan-500/50"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={lockAspectRatio}
                        onCheckedChange={setLockAspectRatio}
                        className="data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-zinc-700 border-2 border-transparent scale-75"
                      />
                      <span className="text-[11px] text-zinc-400 select-none">
                        Maintain Aspect Ratio Lock
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Output format select */}
              <div>
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-2">
                  2. Output Export Format
                </Label>
                <Select
                  value={outputFormat}
                  onValueChange={(val) => setOutputFormat(val as OutputFormat)}
                >
                  <SelectTrigger className="w-full bg-[#060608] border-zinc-800 text-zinc-300 rounded-xl focus:ring-cyan-500/50">
                    <SelectValue placeholder="Select output format" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-zinc-800 text-zinc-300">
                    <SelectItem value="jpeg">JPEG (JPG) - Lossy Photo</SelectItem>
                    <SelectItem value="png">PNG - Lossless Graphic</SelectItem>
                    <SelectItem value="webp">WebP - Modern Widescreen</SelectItem>
                    <SelectItem value="pdf">PDF - Document Package</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quality compression slider (disabled for PNG) */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    3. Compression Quality
                  </Label>
                  <span className={`font-mono text-xs font-bold ${outputFormat === "png" ? "text-zinc-600" : "text-cyan-400"}`}>
                    {outputFormat === "png" ? "Lossless" : `${quality}%`}
                  </span>
                </div>
                <Slider
                  min={5}
                  max={100}
                  step={1}
                  value={[quality]}
                  onValueChange={(val) => setQuality(val[0])}
                  disabled={outputFormat === "png"}
                  className="py-2"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  {outputFormat === "png" ? "PNG quality is lossless to preserve opacity details." : getQualityBadge(quality)}
                </span>
              </div>

              {/* Background Color Flattener */}
              {(outputFormat === "jpeg" || outputFormat === "pdf") && (
                <div className="animate-in fade-in duration-300">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-2">
                    4. Flatten Transparency Background
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "white", name: "White Fill", code: "#ffffff" },
                      { id: "black", name: "Black Fill", code: "#000000" },
                      { id: "transparent", name: "Solid White (PDF)", code: "#ffffff" },
                    ].map((col) => (
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
                          style={{ backgroundColor: col.code }}
                        />
                        <span className="text-[10px]">{col.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Real-time size display savings */}
              {sourceFile && estimatedSize !== null && (
                <div className="bg-[#060608] border border-zinc-800/80 rounded-xl p-3.5 space-y-2 mt-4 animate-in fade-in duration-300 relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Original Size:</span>
                    <span className="text-xs font-bold text-white font-mono">{formatSize(sourceFile.size)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                      Reduced Size: 
                      {isEstimating && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />}
                    </span>
                    <span className="text-xs font-bold text-cyan-400 font-mono">{formatSize(estimatedSize)}</span>
                  </div>
                  
                  {getCompressionSavings() > 0 ? (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-2 rounded-lg flex items-center justify-between text-[11px] text-emerald-400 font-medium">
                      <span className="flex items-center gap-1">⚡ Space savings</span>
                      <span className="font-bold flex items-center gap-1">
                        -{getCompressionSavings().toFixed(1)}% <ArrowRight className="w-3 h-3" /> {formatSize(sourceFile.size - estimatedSize)} saved
                      </span>
                    </div>
                  ) : (
                    <div className="bg-yellow-500/5 border border-yellow-500/10 p-2 rounded-lg flex items-center justify-between text-[11px] text-yellow-500 font-medium">
                      <span>Compressed scale exceeds original</span>
                      <span>Adjust sliders</span>
                    </div>
                  )}
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
                  onClick={handleProcessImage}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Compressing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> Reduce Image Size
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
                Client-Side Image <span className="text-cyan-400">Compressor & Resizer</span>
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                Resize dimensions and adjust JPEG/WebP quality to reduce file sizes instantly. Converted formats are compiled inside your browser, ensuring maximum speed and privacy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🖼️</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Multi-Format Image Transcoding</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Export your modified images to JPEG (JPG), PNG, WebP, or generate a single-page PDF document instantly. Easy conversion for all web formats.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🗜️</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Smart Quality Compressors</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Adjust image quality using a sliding scale to strip metadata and compress file sizes by up to 90% without compromising visual clarity.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔒</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">100% In-Browser Privacy</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Calculations are performed locally in browser memory. Your images are never sent to external servers, protecting your sensitive personal data.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">⚡</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Real-Time Estimations</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Altering sliders updates the estimated compression file size dynamically. Instantly view your exact savings before saving changes.
                </p>
              </div>
            </div>
          </section>

          {/* System Requirements & Browser Compatibility */}
          <section className="p-6 md:p-8 rounded-[2rem] border border-zinc-800/50 bg-[#0e0e0e]/50 backdrop-blur-xl">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Cpu className="text-cyan-400 w-5 h-5" /> Local System Performance
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm mb-6 leading-relaxed">
              Standard browser capabilities enable fast processing for all hardware. Support depends on browser image file codecs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Size limits & length limitations */}
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
