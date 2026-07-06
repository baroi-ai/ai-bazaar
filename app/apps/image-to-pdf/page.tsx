"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ArrowLeft,
  ArrowRight,
  Trash2,
  FileImage,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

// Navbar and Footer relative imports
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// --- Types ---
interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
}

export default function ImageToPDFPage() {
  // --- States ---
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<"a4" | "letter">("a4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [margin, setMargin] = useState<"none" | "thin" | "wide">("none");
  const [outputName, setOutputName] = useState<string>("images-converted");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // --- Cleanup Image Previews ---
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [images]);

  // --- File Selection Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      processSelectedFiles(Array.from(files));
    }
  };

  const processSelectedFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(
      (file) => file.type.startsWith("image/")
    );

    if (validFiles.length === 0) {
      toast.error("Please upload valid image files (PNG, JPG, WebP).");
      return;
    }

    if (images.length + validFiles.length > 50) {
      toast.error("You can upload a maximum of 50 images.");
      return;
    }

    const items: ImageItem[] = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file: file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...items]);
    toast.success(`Added ${validFiles.length} images.`);
  };

  const removeImage = (id: string, previewUrl: string) => {
    URL.revokeObjectURL(previewUrl);
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
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
    const files = e.dataTransfer.files;
    if (files) {
      processSelectedFiles(Array.from(files));
    }
  };

  // --- Sorting Controls ---
  const moveLeft = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveRight = (index: number) => {
    if (index === images.length - 1) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  // --- Compile PDF with jsPDF ---
  const handleCompilePDF = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    toast.info("Compiling PDF document...");

    try {
      const format = pageSize; // 'a4' or 'letter'
      const optOrientation = orientation; // 'portrait' or 'landscape'
      
      const doc = new jsPDF({
        orientation: optOrientation,
        unit: "mm",
        format: format,
      });

      // Target page dimensions in mm
      const pw = optOrientation === "portrait"
        ? (format === "a4" ? 210 : 215.9)
        : (format === "a4" ? 297 : 279.4);
      
      const ph = optOrientation === "portrait"
        ? (format === "a4" ? 297 : 279.4)
        : (format === "a4" ? 210 : 215.9);

      // Margin calculations
      let mValue = 0;
      if (margin === "thin") mValue = 5;
      if (margin === "wide") mValue = 10;

      const targetW = pw - (mValue * 2);
      const targetH = ph - (mValue * 2);

      // Iterate through images and add to PDF
      for (let i = 0; i < images.length; i++) {
        if (i > 0) {
          doc.addPage(format, optOrientation);
        }

        const imgItem = images[i];
        
        // Convert file to base64 or DataURL
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imgItem.file);
        });
        
        const dataUrl = await base64Promise;
        const formatName = imgItem.file.type.split("/")[1].toUpperCase();

        doc.addImage(
          dataUrl,
          formatName === "JPEG" ? "JPEG" : "PNG",
          mValue,
          mValue,
          targetW,
          targetH,
          undefined,
          "FAST"
        );
      }

      doc.save(outputName.trim().endsWith(".pdf")
        ? outputName.trim()
        : `${outputName.trim()}.pdf`
      );

      toast.success("PDF created successfully!");
    } catch (err) {
      console.error("Image to PDF failed:", err);
      toast.error("Failed to compile PDF document.");
    } finally {
      setIsProcessing(false);
    }
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
          
          {/* LEFT: Grid of loaded images (lg:col-span-8) */}
          <div className="lg:col-span-8 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] flex flex-col relative overflow-hidden shadow-2xl p-4 md:p-6 justify-start">
            
            {/* Empty Upload State */}
            {images.length === 0 ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex-grow py-16 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 border-zinc-800 bg-[#0a0a0a] hover:border-zinc-700 hover:bg-[#0c0c0f]"
              >
                <UploadCloud className="h-16 w-16 mb-6 text-zinc-600 animate-pulse" />
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">Convert Image to PDF</h1>
                <p className="text-zinc-400 max-w-md mb-6 text-sm leading-relaxed px-4">
                  Drag and drop PNG, JPG, or WebP images here, or click to browse. Reorder files to configure layouts.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Sortable Grid Layout
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" /> Custom Margins & Sizes
                  </div>
                </div>
              </div>
            ) : (
              /* Loaded Images Grid */
              <div className="w-full flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileImage className="w-5 h-5 text-cyan-400" /> Sort Images Grid
                  </h3>
                  
                  <Button
                    variant="outline"
                    onClick={clearAll}
                    className="border-zinc-800 text-zinc-400 hover:text-white"
                  >
                    Clear All
                  </Button>
                </div>

                <div className="flex-grow overflow-y-auto max-h-[48vh] pr-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-1">
                    {images.map((img, idx) => (
                      <div
                        key={img.id}
                        className="bg-[#060608] border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-3 flex flex-col justify-between items-center relative group shadow-lg"
                      >
                        {/* Image Preview Thumbnail */}
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-800 mb-2.5 bg-zinc-950 flex items-center justify-center">
                          <img
                            src={img.previewUrl}
                            alt="Preview thumbnail"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>

                        {/* Page labeling */}
                        <span className="text-[10px] text-zinc-400 block font-mono font-medium mb-3 select-none">
                          Page {idx + 1}
                        </span>

                        {/* Card Reorder controls */}
                        <div className="grid grid-cols-3 gap-1 w-full border-t border-zinc-850 pt-2 text-zinc-500">
                          <button
                            onClick={() => moveLeft(idx)}
                            disabled={idx === 0}
                            className="p-1 flex justify-center hover:text-white disabled:opacity-20 transition"
                            title="Move Page Left"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeImage(img.id, img.previewUrl)}
                            className="p-1 flex justify-center hover:text-red-400 transition"
                            title="Remove Page"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveRight(idx)}
                            disabled={idx === images.length - 1}
                            className="p-1 flex justify-center hover:text-white disabled:opacity-20 transition"
                            title="Move Page Right"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Assembly settings panel (lg:col-span-4) */}
          <div className="lg:col-span-4 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] p-5 md:p-6 flex flex-col shadow-2xl justify-between">
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Settings2 className="w-5 h-5 text-cyan-400" /> Save Settings
              </h2>

              {/* Page standard dimensions select */}
              <div className="space-y-1.5">
                <Label htmlFor="page-dim-select" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                  Page Dimensions
                </Label>
                <select
                  id="page-dim-select"
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as "a4" | "letter")}
                  className="w-full bg-[#060608] border border-zinc-800 text-zinc-300 rounded-xl p-2.5 text-xs focus:ring-cyan-500/50"
                >
                  <option value="a4">Standard A4 Size (210 x 297mm)</option>
                  <option value="letter">US Letter Size (8.5 x 11in)</option>
                </select>
              </div>

              {/* Page orientations select */}
              <div className="space-y-1.5">
                <Label htmlFor="orientation-select" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                  Page Orientation
                </Label>
                <select
                  id="orientation-select"
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as "portrait" | "landscape")}
                  className="w-full bg-[#060608] border border-zinc-800 text-zinc-300 rounded-xl p-2.5 text-xs focus:ring-cyan-500/50"
                >
                  <option value="portrait">Portrait layout</option>
                  <option value="landscape">Landscape layout</option>
                </select>
              </div>

              {/* Margins selection */}
              <div className="space-y-1.5">
                <Label htmlFor="margin-select" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                  Border Margin
                </Label>
                <select
                  id="margin-select"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value as "none" | "thin" | "wide")}
                  className="w-full bg-[#060608] border border-zinc-800 text-zinc-300 rounded-xl p-2.5 text-xs focus:ring-cyan-500/50"
                >
                  <option value="none">No Margins (Full Bleed)</option>
                  <option value="thin">Thin Margins (5mm)</option>
                  <option value="wide">Wide Margins (10mm)</option>
                </select>
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
                    disabled={images.length === 0}
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
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-[#060608] border border-zinc-850 text-zinc-400 hover:text-white border text-xs h-10 flex items-center justify-center"
              >
                <UploadCloud className="w-4 h-4 mr-2" /> Upload Images
              </Button>
              <Button
                onClick={handleCompilePDF}
                disabled={isProcessing || images.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Compiling...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> Convert to PDF
                  </>
                )}
              </Button>
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
                Local Client-Side <span className="text-cyan-400">Image to PDF Converter</span>
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                Compile grids of image files (PNG, JPG, WebP) into a single PDF document in-browser. Custom sort layout order and customize border margins privately.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🖼️</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Multi-Format Compatible</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Supports common web image formats including lossless PNG, compressed JPEG, and modern transparent WebP uploads.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔀</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Visual Reordering</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Move images left or right on the preview workspace cards to arrange the final pages before compiling.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🏁</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Border Margin Presets</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Set borders to full bleed (no margin), thin boundaries (5mm), or wide spacings (10mm) for clean document margins.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔒</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">100% Sandbox Privacy</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  PDF assembly is executed inside your local browser memory using jsPDF. Your images are never uploaded to servers.
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
