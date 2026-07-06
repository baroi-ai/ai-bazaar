"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  FileText,
  Layers,
  Image,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

// Navbar and Footer relative imports
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// --- Types ---
type WatermarkType = "text" | "image";
type WatermarkPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "tiled";
type PageTarget = "all" | "first" | "custom";

export default function PDFWatermarkPage() {
  // --- States ---
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [outputName, setOutputName] = useState<string>("watermarked-document");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Settings
  const [watermarkType, setWatermarkType] = useState<WatermarkType>("text");
  const [watermarkText, setWatermarkText] = useState<string>("CONFIDENTIAL");
  const [textColorHex, setTextColorHex] = useState<string>("#ff0000");
  const [fontSize, setFontSize] = useState<number>(60);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(30); // for image scale
  const [opacity, setOpacity] = useState<number>(30); // 0-100%
  const [rotation, setRotation] = useState<number>(45); // degrees
  const [position, setPosition] = useState<WatermarkPosition>("center");
  const [pageTarget, setPageTarget] = useState<PageTarget>("all");
  const [customPagesInput, setCustomPagesInput] = useState<string>("1");

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  // --- Cleanup Image URL ---
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // --- File Selection Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast.error("Please upload a valid PDF document.");
      return;
    }

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File exceeds 100MB safety limit.");
      return;
    }

    setSourceFile(file);
    setTotalPages(0);
    setFileBuffer(null);

    toast.info("Loading PDF document...");

    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { updateMetadata: false });
      const count = pdfDoc.getPageCount();

      if (count > 250) {
        toast.error(`Document page count (${count}) exceeds the browser safety limit of 250 pages.`);
        clearFile();
        return;
      }

      setTotalPages(count);
      setFileBuffer(buffer);
      
      const baseName = file.name.substring(0, file.name.lastIndexOf("."));
      setOutputName(`${baseName}-watermarked`);
      toast.success("PDF loaded successfully!");
    } catch (err) {
      console.error("Failed to load PDF:", err);
      toast.error("Failed to parse PDF document. It might be password-protected or corrupted.");
      clearFile();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid PNG or JPEG image.");
        return;
      }
      setImageFile(file);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(URL.createObjectURL(file));
      toast.success("Watermark image uploaded!");
    }
  };

  const clearFile = () => {
    setSourceFile(null);
    setFileBuffer(null);
    setTotalPages(0);
    setOutputName("watermarked-document");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
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

  // --- Hex to RGB Parser ---
  const parseHexColor = (hex: string) => {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return { r: r / 255, g: g / 255, b: b / 255 };
  };

  // --- Target pages indices parser ---
  const getTargetPageIndices = () => {
    if (pageTarget === "all") {
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    if (pageTarget === "first") {
      return [0];
    }
    
    // Parse custom range input e.g. "1-3, 5"
    const indices: number[] = [];
    const cleanInput = customPagesInput.replace(/\s+/g, "");
    if (!cleanInput) return [];

    const parts = cleanInput.split(",");
    for (const part of parts) {
      const rangeMatch = part.match(/^(\d+)-(\d+)$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= totalPages && start <= end) {
          for (let i = start; i <= end; i++) {
            indices.push(i - 1);
          }
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          indices.push(pageNum - 1);
        }
      }
    }
    return Array.from(new Set(indices)); // Deduplicate
  };

  // --- Save / Compile Watermarked PDF ---
  const handleApplyWatermark = async () => {
    if (!fileBuffer || !sourceFile) return;

    if (watermarkType === "image" && !imageFile) {
      toast.error("Please upload a watermark image first.");
      return;
    }

    setIsProcessing(true);
    toast.info("Applying watermark to PDF document...");

    try {
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const targetIndices = getTargetPageIndices();

      if (targetIndices.length === 0) {
        toast.error("Invalid page range specified.");
        setIsProcessing(false);
        return;
      }

      // Embed Font if Type is Text
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const { r, g, b } = parseHexColor(textColorHex);

      // Embed Image if Type is Image
      let embeddedImage: any = null;
      if (watermarkType === "image" && imageFile) {
        const imageBytes = await imageFile.arrayBuffer();
        if (imageFile.type === "image/png" || imageFile.name.endsWith(".png")) {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        }
      }

      const pages = pdfDoc.getPages();

      // Loop through target page indices
      targetIndices.forEach((idx) => {
        if (idx < 0 || idx >= pages.length) return;
        const page = pages[idx];
        const { width, height } = page.getSize();

        // Dimensions of watermark item
        let itemW = 0;
        let itemH = 0;

        if (watermarkType === "text") {
          itemW = font.widthOfTextAtSize(watermarkText, fontSize);
          itemH = font.heightAtSize(fontSize);
        } else if (embeddedImage) {
          const imgScale = scale / 100;
          itemW = embeddedImage.width * imgScale;
          itemH = embeddedImage.height * imgScale;
        }

        // Draw overlay positioning calculations
        const applyDraw = (x: number, y: number) => {
          if (watermarkType === "text") {
            page.drawText(watermarkText, {
              x: x,
              y: y,
              size: fontSize,
              font: font,
              color: rgb(r, g, b),
              opacity: opacity / 100,
              rotate: degrees(rotation),
            });
          } else if (embeddedImage) {
            page.drawImage(embeddedImage, {
              x: x,
              y: y,
              width: itemW,
              height: itemH,
              opacity: opacity / 100,
              rotate: degrees(rotation),
            });
          }
        };

        if (position === "center") {
          applyDraw((width - itemW) / 2, (height - itemH) / 2);
        } else if (position === "top-left") {
          applyDraw(40, height - itemH - 40);
        } else if (position === "top-right") {
          applyDraw(width - itemW - 40, height - itemH - 40);
        } else if (position === "bottom-left") {
          applyDraw(40, 40);
        } else if (position === "bottom-right") {
          applyDraw(width - itemW - 40, 40);
        } else if (position === "tiled") {
          // 3x3 Grid repeat alignment
          for (let rIdx = 0; rIdx < 3; rIdx++) {
            for (let cIdx = 0; cIdx < 3; cIdx++) {
              const xCoord = cIdx * (width / 3) + (width / 6) - (itemW / 2);
              const yCoord = rIdx * (height / 3) + (height / 6) - (itemH / 2);
              applyDraw(xCoord, yCoord);
            }
          }
        }
      });

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      // Trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = outputName.trim().endsWith(".pdf")
        ? outputName.trim()
        : `${outputName.trim()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success("PDF watermarked successfully!");
    } catch (err) {
      console.error("PDF Watermark failed:", err);
      toast.error("Failed to apply watermark. Verify file is not protected.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
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
          
          {/* LEFT: Preview Details area (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] flex flex-col relative overflow-hidden shadow-2xl p-4 md:p-6 justify-center items-center">
            
            {/* Empty Upload State */}
            {!sourceFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex-grow py-16 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 border-zinc-800 bg-[#0a0a0a] hover:border-zinc-700 hover:bg-[#0c0c0f]"
              >
                <UploadCloud className="h-16 w-16 mb-6 text-zinc-600 animate-pulse" />
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">Watermark PDF</h1>
                <p className="text-zinc-400 max-w-md mb-6 text-sm leading-relaxed px-4">
                  Drag and drop your PDF here, or click to browse. Overlay custom text or brand logos privately.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Private Local Processing
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" /> Repeating tiled grids
                  </div>
                </div>
              </div>
            ) : (
              /* PDF Loaded Info and settings display */
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <div className="w-20 h-24 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-cyan-400 text-3xl font-mono shadow-xl relative animate-pulse mb-6 select-none">
                  PDF
                </div>

                <div className="text-center space-y-2 mb-6">
                  <h3 className="text-lg font-bold text-white max-w-md truncate">{sourceFile.name}</h3>
                  <p className="text-xs text-zinc-500 font-mono">
                    Page count: {totalPages} pages | Size: {formatSize(sourceFile.size)}
                  </p>
                </div>

                {/* Remove button */}
                <Button
                  onClick={clearFile}
                  variant="outline"
                  className="border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white"
                >
                  Remove Document
                </Button>
              </div>
            )}
          </div>

          {/* RIGHT: Settings parameters panel (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] p-5 md:p-6 flex flex-col shadow-2xl justify-between overflow-y-auto max-h-[85vh]">
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Settings2 className="w-5 h-5 text-cyan-400" /> Watermark Setup
              </h2>

              {/* Watermark Type Selector */}
              <div>
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-2.5">
                  1. Watermark Type
                </Label>
                <div className="grid grid-cols-2 gap-2 bg-[#060608] p-1 rounded-xl border border-zinc-800/80">
                  <button
                    onClick={() => setWatermarkType("text")}
                    className={`py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                      watermarkType === "text"
                        ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Type className="w-3.5 h-3.5" /> Text Watermark
                  </button>
                  <button
                    onClick={() => setWatermarkType("image")}
                    className={`py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                      watermarkType === "image"
                        ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Image className="w-3.5 h-3.5" /> Image Logo
                  </button>
                </div>
              </div>

              {/* Dynamic settings: text */}
              {watermarkType === "text" ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Content input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="watermark-text-content" className="text-zinc-500 text-[10px] uppercase font-bold">Watermark Text</Label>
                    <Input
                      id="watermark-text-content"
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="bg-[#060608] border-zinc-800 text-white rounded-lg text-xs h-9 focus:ring-cyan-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Font size */}
                    <div className="space-y-1.5">
                      <Label htmlFor="watermark-font-size" className="text-zinc-500 text-[10px] uppercase font-bold">Font Size (pt)</Label>
                      <Input
                        id="watermark-font-size"
                        type="number"
                        min={10}
                        max={200}
                        value={fontSize}
                        onChange={(e) => setFontSize(Math.max(10, parseInt(e.target.value) || 10))}
                        className="bg-[#060608] border-zinc-800 text-white rounded-lg text-xs h-9"
                      />
                    </div>
                    {/* Text Color HEX */}
                    <div className="space-y-1.5">
                      <Label htmlFor="watermark-text-color" className="text-zinc-500 text-[10px] uppercase font-bold">Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="watermark-text-color"
                          type="color"
                          value={textColorHex}
                          onChange={(e) => setTextColorHex(e.target.value)}
                          className="bg-[#060608] border-zinc-800 rounded-lg p-0.5 w-10 h-9 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={textColorHex}
                          onChange={(e) => setTextColorHex(e.target.value)}
                          className="bg-[#060608] border-zinc-800 text-white rounded-lg text-xs h-9 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Dynamic settings: image */
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <Label className="text-zinc-500 text-[10px] uppercase font-bold">Upload PNG/JPG Watermark</Label>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    
                    {!imageFile ? (
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full py-4 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-xs text-zinc-500 bg-[#060608] hover:border-zinc-700 hover:text-zinc-300 transition"
                      >
                        <UploadCloud className="w-5 h-5 mb-1 text-zinc-600" /> Choose Logo Image
                      </button>
                    ) : (
                      <div className="bg-[#060608] border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate text-xs">
                          {imagePreviewUrl && (
                            <img
                              src={imagePreviewUrl}
                              alt="Logo mini preview"
                              className="w-8 h-8 rounded border border-zinc-800 object-contain bg-zinc-950"
                            />
                          )}
                          <span className="truncate max-w-[120px] font-medium text-white">{imageFile.name}</span>
                        </div>
                        <button
                          onClick={clearImage}
                          className="text-red-400 hover:text-red-300 transition"
                          title="Remove image"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Image Scale Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Logo Scale size:</span>
                      <span className="text-cyan-400 font-mono font-bold">{scale}%</span>
                    </div>
                    <Slider
                      min={5}
                      max={100}
                      step={1}
                      value={[scale]}
                      onValueChange={(val) => setScale(val[0])}
                    />
                  </div>
                </div>
              )}

              {/* Common Opacity Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Overlay Opacity:</span>
                  <span className="text-cyan-400 font-mono font-bold">{opacity}%</span>
                </div>
                <Slider
                  min={5}
                  max={100}
                  step={1}
                  value={[opacity]}
                  onValueChange={(val) => setOpacity(val[0])}
                />
              </div>

              {/* Common Rotation Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Angle Rotation:</span>
                  <span className="text-cyan-400 font-mono font-bold">{rotation}°</span>
                </div>
                <Slider
                  min={0}
                  max={360}
                  step={1}
                  value={[rotation]}
                  onValueChange={(val) => setRotation(val[0])}
                />
              </div>

              {/* Positioning Selector */}
              <div className="space-y-2">
                <Label htmlFor="position-preset" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                  Placement Positioning
                </Label>
                <select
                  id="position-preset"
                  value={position}
                  onChange={(e) => setPosition(e.target.value as WatermarkPosition)}
                  className="w-full bg-[#060608] border border-zinc-800 text-zinc-300 rounded-xl p-2.5 text-xs focus:ring-cyan-500/50 focus:border-zinc-700 outline-none"
                >
                  <option value="center">Centered Overlay</option>
                  <option value="top-left">Top-Left Corner</option>
                  <option value="top-right">Top-Right Corner</option>
                  <option value="bottom-left">Bottom-Left Corner</option>
                  <option value="bottom-right">Bottom-Right Corner</option>
                  <option value="tiled">Tiled repeating pattern</option>
                </select>
              </div>

              {/* Page Targets Selector */}
              <div className="space-y-2">
                <Label htmlFor="page-targets" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                  Apply Watermark to:
                </Label>
                <select
                  id="page-targets"
                  value={pageTarget}
                  onChange={(e) => setPageTarget(e.target.value as PageTarget)}
                  className="w-full bg-[#060608] border border-zinc-800 text-zinc-300 rounded-xl p-2.5 text-xs focus:ring-cyan-500/50 focus:border-zinc-700 outline-none mb-3"
                >
                  <option value="all">All Pages</option>
                  <option value="first">First Page Only</option>
                  <option value="custom">Custom Page Range</option>
                </select>

                {pageTarget === "custom" && (
                  <div className="space-y-1.5 animate-in fade-in duration-350">
                    <Label htmlFor="custom-pages" className="text-zinc-500 text-[10px] uppercase font-bold">Custom Page Range</Label>
                    <Input
                      id="custom-pages"
                      type="text"
                      value={customPagesInput}
                      onChange={(e) => setCustomPagesInput(e.target.value)}
                      placeholder="e.g. 1-3, 5"
                      className="bg-[#060608] border-zinc-800 text-white rounded-lg text-xs h-9 focus:ring-cyan-500/50"
                    />
                  </div>
                )}
              </div>

              {/* Output Name input */}
              <div className="space-y-2 pt-2 border-t border-zinc-850">
                <Label htmlFor="output-filename" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                  Output Filename
                </Label>
                <div className="relative">
                  <Input
                    id="output-filename"
                    type="text"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    disabled={!sourceFile}
                    className="bg-[#060608] border-zinc-800 text-white rounded-xl text-xs h-10 pr-12 focus:ring-cyan-500/50"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono select-none">
                    .pdf
                  </span>
                </div>
              </div>

            </div>

            {/* Bottom Generate Action Button */}
            <div className="pt-4 border-t border-zinc-800 flex flex-col gap-3 mt-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {!sourceFile ? (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95"
                >
                  <UploadCloud className="w-4 h-4 mr-2" /> Upload PDF Document
                </Button>
              ) : (
                <Button
                  onClick={handleApplyWatermark}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Watermarking...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> Apply & Save PDF
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
                Local Client-Side <span className="text-cyan-400">PDF Watermarker</span>
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                Add confidential text labels or business logos directly onto layout pages privately. Adjust angles, transparency scales, placement, and target ranges locally.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔠</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Custom Text Labels</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Enter draft alerts, timestamps, or copyrights. Select font size ranges, customize HEX hex colors, and tilt angles for high visibility.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🖼️</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">PNG / JPG Brand Logos</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Upload corporate logo files. Embedded images compile onto target sheets with custom opacity layers and scaling dimensions.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🏁</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Tiled Repeating Presets</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Choose from corner or center placements, or toggle tiled configurations to distribute watermarks in a repeating 3x3 security grid.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔒</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">100% Sandbox Privacy</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Calculations execute in local memory arrays. Document data is never uploaded, safeguarding confidentiality of sensitive reports.
                </p>
              </div>
            </div>
          </section>

          {/* Local System Limits */}
          <section className="p-6 md:p-8 rounded-[2rem] border border-zinc-800/50 bg-[#0e0e0e]/50 backdrop-blur-xl">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Cpu className="text-cyan-400 w-5 h-5" /> Local System Limits
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm mb-6 leading-relaxed">
              Standard browser capabilities enable fast processing for all hardware. Support depends on browser memory constraints.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* File size & Page limits */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" /> Size & Volume Allocations
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold text-white">Individual File Limits</span>
                      <span className="block text-[11px] text-zinc-500">Max 100MB per document. Restricting single document size protects the browser parser from execution locks.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold text-white">Page Count Safety Cap</span>
                      <span className="block text-[11px] text-zinc-500">Max 250 total input pages. Capping input ranges protects active memory and maintains responsiveness.</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Supported Tech specs */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" /> Compatibility details
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Google Chrome</span>
                    <span className="block text-[10px] text-zinc-500">Full Support (Fastest arrays parsing)</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Apple Safari</span>
                    <span className="block text-[10px] text-zinc-500">Full Support (iOS sandboxed safe)</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Mozilla Firefox</span>
                    <span className="block text-[10px] text-zinc-500">Full Support</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Microsoft Edge</span>
                    <span className="block text-[10px] text-zinc-500">Full Support</span>
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
