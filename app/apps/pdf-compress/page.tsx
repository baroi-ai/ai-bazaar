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
  FileDown,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

// Navbar and Footer relative imports
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// --- Types ---
type CompressLevel = "low" | "medium" | "high";

export default function PDFCompressPage() {
  // --- States ---
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [compressLevel, setCompressLevel] = useState<CompressLevel>("medium");
  const [outputName, setOutputName] = useState<string>("compressed-document");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);

  // Result metrics
  const [compressedSize, setCompressedSize] = useState<number | null>(null);

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Load PDF.js dynamically ---
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      const globalPdfjs = (window as any).pdfjsLib;
      if (globalPdfjs) {
        globalPdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        setPdfjsLoaded(true);
      }
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

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

  // --- File Selection Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = async (file: File) => {
    if (!pdfjsLoaded) {
      toast.error("PDF engine is still loading. Please wait a moment.");
      return;
    }

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
    setFileBuffer(null);
    setTotalPages(0);
    setCompressedSize(null);

    toast.info("Loading PDF document...");

    try {
      const buffer = await file.arrayBuffer();
      const globalPdfjs = (window as any).pdfjsLib;
      const loadingTask = globalPdfjs.getDocument({ data: new Uint8Array(buffer) });
      const pdf = await loadingTask.promise;
      
      const count = pdf.numPages;
      if (count > 250) {
        toast.error(`Document page count (${count}) exceeds the browser safety limit of 250 pages.`);
        clearFile();
        return;
      }

      setTotalPages(count);
      setFileBuffer(buffer);
      
      const baseName = file.name.substring(0, file.name.lastIndexOf("."));
      setOutputName(`${baseName}-compressed`);
      toast.success("PDF loaded successfully!");
    } catch (err) {
      console.error("Failed to load PDF:", err);
      toast.error("Failed to parse PDF document. It might be password-protected or corrupted.");
      clearFile();
    }
  };

  const clearFile = () => {
    setSourceFile(null);
    setFileBuffer(null);
    setTotalPages(0);
    setCompressedSize(null);
    setOutputName("compressed-document");
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

  // --- PDF Compress Logic ---
  const handleCompressPDF = async () => {
    if (!fileBuffer || !sourceFile || !pdfjsLoaded) return;

    setIsProcessing(true);
    toast.info("Resampling and compressing pages...");

    try {
      const globalPdfjs = (window as any).pdfjsLib;
      const loadingTask = globalPdfjs.getDocument({ data: new Uint8Array(fileBuffer) });
      const pdf = await loadingTask.promise;

      // Set scale and quality based on compression presets
      let renderScale = 1.0;
      let quality = 0.7;

      if (compressLevel === "low") {
        renderScale = 1.3;
        quality = 0.85;
      } else if (compressLevel === "medium") {
        renderScale = 0.9;
        quality = 0.65;
      } else if (compressLevel === "high") {
        renderScale = 0.6;
        quality = 0.4;
      }

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Process page-by-page
      for (let i = 1; i <= totalPages; i++) {
        if (i > 1) {
          doc.addPage("a4", "portrait");
        }

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: renderScale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render PDF page to canvas context
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        // Extract as JPEG with specified quality
        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        // Standard A4 dimensions in mm: 210 x 297
        doc.addImage(dataUrl, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      }

      // Generate output array buffer
      const outputArrayBuffer = doc.output("arraybuffer");
      setCompressedSize(outputArrayBuffer.byteLength);

      const blob = new Blob([outputArrayBuffer], { type: "application/pdf" });
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

      toast.success("PDF compressed successfully!");
    } catch (err) {
      console.error("PDF compression failed:", err);
      toast.error("Failed to compress PDF document.");
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
          
          {/* LEFT: File Upload area (lg:col-span-7) */}
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
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">Compress PDF Size</h1>
                <p className="text-zinc-400 max-w-md mb-6 text-sm leading-relaxed px-4">
                  Drag and drop your PDF here, or click to browse. Downsample images and reduce file memory size locally.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Private Local Downsampling
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" /> Custom presets
                  </div>
                </div>
              </div>
            ) : (
              /* Loaded PDF file info */
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <div className="w-20 h-24 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-cyan-400 text-3xl font-mono shadow-xl relative animate-pulse mb-6 select-none">
                  PDF
                </div>

                <div className="text-center space-y-2 mb-6">
                  <h3 className="text-lg font-bold text-white max-w-md truncate">{sourceFile.name}</h3>
                  <p className="text-xs text-zinc-500 font-mono">
                    Pages: {totalPages} | Size: {formatSize(sourceFile.size)}
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

          {/* RIGHT: Lock settings panel (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] p-5 md:p-6 flex flex-col shadow-2xl justify-between">
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Settings2 className="w-5 h-5 text-cyan-400" /> Compress Level
              </h2>

              {/* Compress Preset Selector */}
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                  Compression Preset
                </Label>
                <div className="grid grid-cols-3 gap-1 bg-[#060608] p-1 rounded-xl border border-zinc-800/80">
                  <button
                    onClick={() => setCompressLevel("low")}
                    className={`py-2 rounded-lg text-[10px] md:text-xs font-medium transition-all ${
                      compressLevel === "low"
                        ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Low (Clear)
                  </button>
                  <button
                    onClick={() => setCompressLevel("medium")}
                    className={`py-2 rounded-lg text-[10px] md:text-xs font-medium transition-all ${
                      compressLevel === "medium"
                        ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Medium (Balanced)
                  </button>
                  <button
                    onClick={() => setCompressLevel("high")}
                    className={`py-2 rounded-lg text-[10px] md:text-xs font-medium transition-all ${
                      compressLevel === "high"
                        ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    High (Smallest)
                  </button>
                </div>
              </div>

              {/* Compression Metrics details */}
              {sourceFile && compressedSize && (
                <div className="bg-[#060608] border border-zinc-800/80 rounded-xl p-3.5 text-xs text-zinc-400 space-y-2.5 font-mono animate-in slide-in-from-top-3 duration-300">
                  <div className="flex justify-between">
                    <span>Original Size:</span>
                    <strong className="text-white">{formatSize(sourceFile.size)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Compressed Size:</span>
                    <strong className="text-cyan-400">{formatSize(compressedSize)}</strong>
                  </div>
                  <div className="flex justify-between border-t border-zinc-850 pt-2 text-[10px] uppercase font-bold">
                    <span>Reduction:</span>
                    <strong className="text-emerald-400">
                      -{Math.round(((sourceFile.size - compressedSize) / sourceFile.size) * 100)}% Saved
                    </strong>
                  </div>
                </div>
              )}

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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOutputName(e.target.value)}
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
                  onClick={handleCompressPDF}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Compressing...
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 mr-2" /> Compress PDF
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
                Local Client-Side <span className="text-cyan-400">PDF Compressor</span>
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                Downsample images and optimize document file structures in your local browser sandbox. Reduce PDF memory footprint without compromising key details.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🗜️</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Three Custom Presets</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Select between Low compression (maximum quality), Medium (balanced speed/quality), and High (smallest size) based on sharing limitations.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">📊</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Visual Size Metrics</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Review the compression output size and active file size reductions in real-time, calculating exact percentages saved.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🖥️</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Local Canvas Resampling</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Utilizes HTML5 canvas pixel downsampling algorithms to re-render pages as compressed JPEG maps directly in memory.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔒</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">100% Sandbox Privacy</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Calculations execute on local hardware within your browser's sandboxed boundaries. Zero files are sent to external databases.
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
