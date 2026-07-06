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
  Copy,
  FileText,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";

// Navbar and Footer relative imports
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// --- Types ---
interface PageItem {
  id: string;
  originalIndex: number; // 0-indexed reference to the source PDF pages
}

export default function PDFRearrangePage() {
  // --- States ---
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [outputName, setOutputName] = useState<string>("rearranged-document");
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
    setPages([]);
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

      const initialPages: PageItem[] = [];
      for (let i = 0; i < count; i++) {
        initialPages.push({
          id: Math.random().toString(36).substring(2, 9),
          originalIndex: i
        });
      }

      setPages(initialPages);
      setTotalPages(count);
      setFileBuffer(buffer);
      
      const baseName = file.name.substring(0, file.name.lastIndexOf("."));
      setOutputName(`${baseName}-rearranged`);
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
    setPages([]);
    setTotalPages(0);
    setOutputName("rearranged-document");
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

  // --- Reordering and Modification Handlers ---
  const moveLeft = (index: number) => {
    if (index === 0) return;
    setPages(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveRight = (index: number) => {
    if (index === pages.length - 1) return;
    setPages(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const duplicatePage = (index: number) => {
    if (pages.length >= 300) {
      toast.error("Safety page limit (300 pages) reached.");
      return;
    }
    setPages(prev => {
      const copy = [...prev];
      const page = copy[index];
      copy.splice(index + 1, 0, {
        id: Math.random().toString(36).substring(2, 9),
        originalIndex: page.originalIndex
      });
      return copy;
    });
    toast.success(`Duplicated page index ${index + 1}.`);
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) {
      toast.error("PDF must contain at least 1 page.");
      return;
    }
    setPages(prev => prev.filter((_, idx) => idx !== index));
    toast.success(`Removed page index ${index + 1}.`);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // --- Save / Export PDF Rearrangement ---
  const handleSavePDF = async () => {
    if (!fileBuffer || !sourceFile || pages.length === 0) return;

    setIsProcessing(true);
    toast.info("Assembling rearranged PDF...");

    try {
      const newPdf = await PDFDocument.create();
      const sourcePdf = await PDFDocument.load(fileBuffer);
      
      // Extract original indices in custom user order
      const indicesToCopy = pages.map(p => p.originalIndex);
      
      // Copy and append pages
      const copiedPages = await newPdf.copyPages(sourcePdf, indicesToCopy);
      copiedPages.forEach(p => newPdf.addPage(p));

      const bytes = await newPdf.save();
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
      console.error("PDF rearrangement failed:", err);
      toast.error("Failed to assemble PDF. Ensure document is not locked.");
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
          
          {/* LEFT: Preview Details and Reordering Grid (lg:col-span-8) */}
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
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">Rearrange PDF Pages</h1>
                <p className="text-zinc-400 max-w-md mb-6 text-sm leading-relaxed px-4">
                  Drag and drop a PDF file here, or click to browse. Reorder, duplicate, or delete sheets locally.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Private Local Reordering
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
                    Interactive Organizer Grid
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
                <div className="bg-[#0a0a0c] border border-zinc-800/80 p-3 rounded-xl mb-6 text-xs text-zinc-400 font-mono flex flex-wrap gap-4">
                  <span>File: <strong className="text-white">{sourceFile.name}</strong></span>
                  <span>Original Size: <strong className="text-white">{formatSize(sourceFile.size)}</strong></span>
                  <span>Active Count: <strong className="text-cyan-400">{pages.length} pages</strong></span>
                </div>

                {/* Layout page cards grid */}
                <div className="flex-grow overflow-y-auto max-h-[45vh] pr-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {pages.map((page, idx) => (
                      <div
                        key={page.id}
                        className="bg-[#060608] border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-3.5 flex flex-col items-center justify-between text-center shadow-lg relative group transition-all"
                      >
                        {/* Page sheets design */}
                        <div className="w-16 h-20 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-sm font-extrabold font-mono text-cyan-400 shadow-md mb-3 select-none relative">
                          <div className="absolute top-1 left-1 text-[8px] font-normal text-zinc-600">
                            org pg {page.originalIndex + 1}
                          </div>
                          {idx + 1}
                        </div>

                        {/* Page label */}
                        <span className="text-xs font-semibold text-zinc-400 select-none block mb-3.5">
                          Page {idx + 1}
                        </span>

                        {/* Controls Panel */}
                        <div className="grid grid-cols-4 gap-1 w-full border-t border-zinc-850 pt-2.5">
                          <button
                            onClick={() => moveLeft(idx)}
                            disabled={idx === 0}
                            className="p-1 text-zinc-500 hover:text-white disabled:opacity-20 flex justify-center transition"
                            title="Move Left"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveRight(idx)}
                            disabled={idx === pages.length - 1}
                            className="p-1 text-zinc-500 hover:text-white disabled:opacity-20 flex justify-center transition"
                            title="Move Right"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => duplicatePage(idx)}
                            className="p-1 text-zinc-500 hover:text-emerald-400 flex justify-center transition"
                            title="Duplicate Page"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deletePage(idx)}
                            className="p-1 text-zinc-500 hover:text-red-400 flex justify-center transition"
                            title="Delete Page"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>
                    ))}
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
                  <span className="text-cyan-400">ℹ️</span> Organizing Rules
                </div>
                <p>
                  You can duplicate pages to copy details or delete pages to strip content. Use arrows to shift files around. Save compiler creates the new PDF immediately.
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
                  disabled={isProcessing || pages.length === 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Compiling...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> Rearrange & Save PDF
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
                Local Client-Side <span className="text-cyan-400">PDF Organizer</span>
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                Sort, copy, and remove pages in any PDF file without network uploads. Drag or click controls to rearrange layout sheets on device instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔀</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Shift Sheets Position</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Use Left and Right buttons to slide pages around on grid blocks. PDF builder will bind layout sheets in the exact order you organize.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">👯</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Duplicate PDF Pages</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Click the duplicate sheet icon to copy pages instantly in memory. Perfect for replicating template forms or details before download.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🗑️</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Strip Pages Locally</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Delete unwanted pages with a single click. Exclude cover sheets, blank spaces, or trailing attachments before final compilation.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔒</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">100% Sandbox Privacy</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Reordering executes in local buffer memory arrays. Your files are never sent to external servers, protecting your sensitive personal data.
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
