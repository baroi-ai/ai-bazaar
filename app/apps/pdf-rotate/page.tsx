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
  RotateCw,
  RotateCcw,
  FileText,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument, degrees } from "pdf-lib";

// Navbar and Footer relative imports
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function PDFRotatePage() {
  // --- States ---
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [rotations, setRotations] = useState<Record<number, number>>({}); // 0-indexed page index -> rotation angle (0, 90, 180, 270)
  const [outputName, setOutputName] = useState<string>("rotated-document");
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

    const maxSize = 100 * 1024 * 1024; // 100MB limit
    if (file.size > maxSize) {
      toast.error("File exceeds 100MB safety limit.");
      return;
    }

    setSourceFile(file);
    setRotations({});
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
      setOutputName(`${baseName}-rotated`);
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
    setRotations({});
    setTotalPages(0);
    setOutputName("rotated-document");
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

  // --- Rotation Manipulation Handlers ---
  const rotateCCW = (index: number) => {
    setRotations(prev => {
      const current = prev[index] || 0;
      const next = (current - 90 + 360) % 360;
      return { ...prev, [index]: next };
    });
  };

  const rotateCW = (index: number) => {
    setRotations(prev => {
      const current = prev[index] || 0;
      const next = (current + 90) % 360;
      return { ...prev, [index]: next };
    });
  };

  // --- Global Batch Rotations ---
  const rotateAllCW = () => {
    const updated: Record<number, number> = {};
    for (let i = 0; i < totalPages; i++) {
      const current = rotations[i] || 0;
      updated[i] = (current + 90) % 360;
    }
    setRotations(updated);
    toast.success("Rotated all pages clockwise by 90°.");
  };

  const rotateAllCCW = () => {
    const updated: Record<number, number> = {};
    for (let i = 0; i < totalPages; i++) {
      const current = rotations[i] || 0;
      updated[i] = (current - 90 + 360) % 360;
    }
    setRotations(updated);
    toast.success("Rotated all pages counter-clockwise by 90°.");
  };

  const resetAll = () => {
    setRotations({});
    toast.success("Reset all page rotations.");
  };

  // --- Compile & Export PDF ---
  const handleSavePDF = async () => {
    if (!fileBuffer || !sourceFile) return;

    setIsProcessing(true);
    toast.info("Applying rotations to pages...");

    try {
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pages = pdfDoc.getPages();

      // Loop through and set target degrees rotation
      pages.forEach((page, index) => {
        const userRotation = rotations[index] || 0;
        if (userRotation !== 0) {
          const originalRotation = page.getRotation().angle;
          page.setRotation(degrees((originalRotation + userRotation) % 360));
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

      toast.success("PDF saved successfully!");
    } catch (err) {
      console.error("PDF rotation failed:", err);
      toast.error("Failed to compile rotated PDF document.");
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
          
          {/* LEFT: Preview Details and Rotating Grid (lg:col-span-8) */}
          <div className="lg:col-span-8 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] flex flex-col relative overflow-hidden shadow-2xl p-4 md:p-6 justify-start">
            
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
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">Rotate PDF Pages</h1>
                <p className="text-zinc-400 max-w-md mb-6 text-sm leading-relaxed px-4">
                  Drag and drop a PDF file here, or click to browse. Spin individual sheets or all pages instantly.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Private Local Rotation
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" /> Max 250 pages
                  </div>
                </div>
              </div>
            ) : (
              /* PDF Loaded Workspace Grid */
              <div className="w-full flex flex-col h-full">
                
                {/* PDF details badge */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    Interactive Rotation Grid
                  </h3>
                  
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={clearFile}
                    className="h-8 w-8 rounded-full shadow-md bg-red-600 hover:bg-red-500 transition-transform active:scale-95"
                    title="Remove PDF"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>

                {/* PDF info details */}
                <div className="bg-[#0a0a0c] border border-zinc-800/80 p-3 rounded-xl mb-6 text-xs text-zinc-400 font-mono flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex gap-4">
                    <span>File: <strong className="text-white">{sourceFile.name}</strong></span>
                    <span>Page Count: <strong className="text-cyan-400">{totalPages} pg</strong></span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={rotateAllCW}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline bg-transparent"
                    >
                      Rotate All CW (+90°)
                    </button>
                    <span className="text-zinc-700">|</span>
                    <button
                      onClick={rotateAllCCW}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline bg-transparent"
                    >
                      Rotate All CCW (-90°)
                    </button>
                    <span className="text-zinc-700">|</span>
                    <button
                      onClick={resetAll}
                      className="text-[10px] text-zinc-500 hover:text-zinc-400 hover:underline bg-transparent"
                    >
                      Reset All
                    </button>
                  </div>
                </div>

                {/* Layout page cards grid */}
                <div className="flex-grow overflow-y-auto max-h-[45vh] pr-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-2">
                    {Array.from({ length: totalPages }, (_, i) => i).map((idx) => {
                      const rotation = rotations[idx] || 0;
                      return (
                        <div
                          key={idx}
                          className="bg-[#060608] border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-3.5 flex flex-col items-center justify-between text-center shadow-lg relative group transition-all"
                        >
                          {/* Page sheets design with 3D CSS rotate transform */}
                          <div className="relative w-24 h-24 flex items-center justify-center mb-3">
                            <div
                              className="w-14 h-18 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-sm font-extrabold font-mono text-cyan-400 shadow-md select-none"
                              style={{
                                transform: `rotate(${rotation}deg)`,
                                transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                              }}
                            >
                              {idx + 1}
                            </div>
                          </div>

                          {/* Page label and active angle detail */}
                          <div className="space-y-1 mb-3.5 select-none">
                            <span className="text-xs font-semibold text-zinc-400 block">
                              Page {idx + 1}
                            </span>
                            <span className="text-[10px] text-zinc-500 block font-mono">
                              {rotation}° degrees
                            </span>
                          </div>

                          {/* Controls Panel */}
                          <div className="grid grid-cols-2 gap-2 w-full border-t border-zinc-850 pt-2.5">
                            <button
                              onClick={() => rotateCCW(idx)}
                              className="p-1.5 text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-lg flex items-center justify-center gap-1 transition"
                              title="Rotate Counter-Clockwise"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> <span className="text-[10px] font-medium">-90°</span>
                            </button>
                            <button
                              onClick={() => rotateCW(idx)}
                              className="p-1.5 text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-lg flex items-center justify-center gap-1 transition"
                              title="Rotate Clockwise"
                            >
                              <RotateCw className="w-3.5 h-3.5" /> <span className="text-[10px] font-medium">+90°</span>
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* RIGHT: Assembly configurations panel (lg:col-span-4) */}
          <div className="lg:col-span-4 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] p-5 md:p-6 flex flex-col shadow-2xl justify-between">
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Settings2 className="w-5 h-5 text-cyan-400" /> Save Config
              </h2>

              {/* Output Name input */}
              <div className="space-y-2">
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

              {/* Warnings details */}
              <div className="bg-[#060608] border border-zinc-800/80 rounded-xl p-3.5 text-xs text-zinc-400 space-y-2 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-white mb-1">
                  <span className="text-cyan-400">ℹ️</span> How it works
                </div>
                <p>
                  You can click CCW or CW rotation buttons on individual pages, or rotate all pages together using the batch options. Rotations are compiled locally on device.
                </p>
              </div>
            </div>

            {/* Bottom Generate Action Button */}
            <div className="pt-4 border-t border-zinc-800 flex flex-col gap-3">
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
                  onClick={handleSavePDF}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Compiling...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> Rotate & Save PDF
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
                Local Client-Side <span className="text-cyan-400">PDF Rotator</span>
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                Turn pages in any direction online. Modify individual layout orientations or rotate all sheets together with 100% private in-browser compiling.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔄</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">CSS 3D Visual Previews</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Pages spin live on the screen as you modify rotation degrees, offering a clear visual model before saving your document.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">📢</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Batch Rotate Controls</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Turn all document pages simultaneously with global clockwise (+90°) or counter-clockwise (-90°) functions to save time on large files.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🎯</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Individual Page Actions</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Target specific sideways or upside-down pages individually. Fix scans or misplaced layouts without touching other standard sheets.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔒</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">100% Sandbox Privacy</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Document orientation values are adjusted within your local browser sandbox. No uploads, no servers, full security.
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
