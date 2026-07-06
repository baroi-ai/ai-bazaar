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
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  FilePlus,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";

// Navbar and Footer relative imports
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// --- Types ---
interface MergedPDFFile {
  id: string;
  name: string;
  size: number;
  pageCount: number | "loading" | "error";
  file: File;
}

export default function PDFMergerPage() {
  // --- States ---
  const [pdfFiles, setPdfFiles] = useState<MergedPDFFile[]>([]);
  const [outputName, setOutputName] = useState<string>("merged-document");
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

  // --- Image Selection Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      processSelectedFiles(Array.from(files));
    }
  };

  const processSelectedFiles = (newFiles: File[]) => {
    const validPDFs = newFiles.filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (validPDFs.length === 0) {
      toast.error("Please upload valid PDF files.");
      return;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB per file limit
    const addedFiles: MergedPDFFile[] = validPDFs.map(file => {
      if (file.size > maxSize) {
        toast.error(`File "${file.name}" exceeds 100MB limit and was skipped.`);
        return null;
      }
      
      const newFileObj: MergedPDFFile = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        pageCount: "loading",
        file: file
      };

      // Load page count in the background
      extractPageCount(newFileObj);

      return newFileObj;
    }).filter((f): f is MergedPDFFile => f !== null);

    setPdfFiles(prev => [...prev, ...addedFiles]);
    toast.success(`Successfully uploaded ${addedFiles.length} file(s).`);
  };

  // --- Query PDF Page Count ---
  const extractPageCount = async (fileObj: MergedPDFFile) => {
    try {
      const arrayBuffer = await fileObj.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { 
        updateMetadata: false 
      });
      const count = pdfDoc.getPageCount();
      
      setPdfFiles(prev => prev.map(f => {
        if (f.id === fileObj.id) {
          return { ...f, pageCount: count };
        }
        return f;
      }));
    } catch (err) {
      console.error(`Failed to parse page count for ${fileObj.name}:`, err);
      setPdfFiles(prev => prev.map(f => {
        if (f.id === fileObj.id) {
          return { ...f, pageCount: "error" };
        }
        return f;
      }));
    }
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

  // --- List Reordering Handlers ---
  const moveFileUp = (index: number) => {
    if (index === 0) return;
    setPdfFiles(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveFileDown = (index: number) => {
    if (index === pdfFiles.length - 1) return;
    setPdfFiles(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const deleteFile = (id: string) => {
    setPdfFiles(prev => prev.filter(f => f.id !== id));
    toast.success("File removed from list.");
  };

  const clearAll = () => {
    setPdfFiles([]);
    setOutputName("merged-document");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- PDF Merging Core Loops ---
  const handleMergePDFs = async () => {
    if (pdfFiles.length < 2) {
      toast.error("Please add at least 2 PDF files to merge.");
      return;
    }

    setIsProcessing(true);
    toast.info("Merging PDF files on device...");

    // Check total page constraints to protect memory
    const totalPages = pdfFiles.reduce((acc, curr) => {
      if (typeof curr.pageCount === "number") {
        return acc + curr.pageCount;
      }
      return acc;
    }, 0);

    if (totalPages > 500) {
      toast.error(`Total page count (${totalPages}) exceeds the browser safety limit of 500 pages.`);
      setIsProcessing(false);
      return;
    }

    try {
      // 1. Create a fresh merged document container
      const mergedPdf = await PDFDocument.create();

      // 2. Loop through and copy pages from source documents
      for (const fileObj of pdfFiles) {
        const arrayBuffer = await fileObj.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      // 3. Save bytes and compile
      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      // 4. Download
      const link = document.createElement("a");
      link.href = url;
      link.download = outputName.trim().endsWith(".pdf") 
        ? outputName.trim() 
        : `${outputName.trim()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success("PDFs combined successfully!");
    } catch (err) {
      console.error("PDF Merge failure:", err);
      toast.error("Failed to merge PDF files. Ensure files are not corrupted or password-protected.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Visual format helpers ---
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getTotalPages = () => {
    return pdfFiles.reduce((acc, curr) => {
      return acc + (typeof curr.pageCount === "number" ? curr.pageCount : 0);
    }, 0);
  };

  const getTotalSize = () => {
    return pdfFiles.reduce((acc, curr) => acc + curr.size, 0);
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
          
          {/* LEFT: Reordering List and Upload Area (lg:col-span-8) */}
          <div className="lg:col-span-8 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] flex flex-col relative overflow-hidden shadow-2xl p-4 md:p-6 justify-start">
            
            {/* Empty Upload State */}
            {pdfFiles.length === 0 ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full flex-grow py-16 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                  isDragOver
                    ? "border-cyan-500 bg-cyan-500/5 scale-[1.02]"
                    : "border-zinc-800 bg-[#0a0a0a] hover:border-zinc-700 hover:bg-[#0c0c0f]"
                }`}
              >
                <UploadCloud className="h-16 w-16 mb-6 text-zinc-600 animate-pulse" />
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">PDF Merger</h1>
                <p className="text-zinc-400 max-w-md mb-6 text-sm leading-relaxed px-4">
                  Drag and drop multiple PDF files here, or click to browse. Reorder and bind documents locally.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Private Local Compilation
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Max 100MB per file
                  </div>
                </div>
              </div>
            ) : (
              /* PDF Files Table List */
              <div className="w-full flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-cyan-400" />
                    Uploaded PDFs ({pdfFiles.length})
                  </h3>
                  
                  {/* Inline upload additions */}
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-zinc-800 bg-[#0a0a0c] text-zinc-300 hover:bg-zinc-900 border"
                  >
                    <FilePlus className="w-4 h-4 mr-2" /> Add Files
                  </Button>
                </div>

                <div className="flex-grow overflow-y-auto max-h-[50vh] pr-1.5 mb-4 border border-zinc-800 bg-[#060608]/40 rounded-xl">
                  <div className="min-w-full divide-y divide-zinc-800 text-xs">
                    {/* Header */}
                    <div className="grid grid-cols-12 p-3 font-semibold text-zinc-400 bg-zinc-900/30 uppercase tracking-wider text-center md:text-left select-none">
                      <div className="col-span-1 text-center">#</div>
                      <div className="col-span-5 text-left pl-2">File Name</div>
                      <div className="col-span-2">Pages</div>
                      <div className="col-span-2">File Size</div>
                      <div className="col-span-2 text-center">Actions</div>
                    </div>
                    {/* Rows */}
                    {pdfFiles.map((fileObj, idx) => (
                      <div key={fileObj.id} className="grid grid-cols-12 p-3 items-center hover:bg-zinc-900/10 transition-colors border-t border-zinc-850">
                        <div className="col-span-1 text-center font-bold text-zinc-500 font-mono">
                          {idx + 1}
                        </div>
                        <div className="col-span-5 truncate text-white pl-2 flex items-center gap-2 font-medium" title={fileObj.name}>
                          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="truncate">{fileObj.name}</span>
                        </div>
                        <div className="col-span-2 font-mono text-zinc-300">
                          {fileObj.pageCount === "loading" ? (
                            <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                          ) : fileObj.pageCount === "error" ? (
                            <span className="text-red-400">Error</span>
                          ) : (
                            <span>{fileObj.pageCount} pg</span>
                          )}
                        </div>
                        <div className="col-span-2 font-mono text-zinc-500">
                          {formatSize(fileObj.size)}
                        </div>
                        <div className="col-span-2 flex items-center justify-center gap-1">
                          {/* Reordering Controls */}
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={idx === 0}
                            onClick={() => moveFileUp(idx)}
                            className="h-8 w-8 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400"
                            title="Move Up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={idx === pdfFiles.length - 1}
                            onClick={() => moveFileDown(idx)}
                            className="h-8 w-8 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400"
                            title="Move Down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteFile(fileObj.id)}
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metrics detail bottom info */}
                <div className="flex flex-wrap gap-4 items-center justify-between border-t border-zinc-800 pt-4 text-xs text-zinc-500">
                  <div className="flex gap-4">
                    <span>Total Pages: <strong className="text-white font-mono">{getTotalPages()} pg</strong></span>
                    <span>Total Size: <strong className="text-white font-mono">{formatSize(getTotalSize())}</strong></span>
                  </div>
                  <button
                    onClick={clearAll}
                    className="text-red-400 hover:text-red-300 hover:underline bg-transparent"
                  >
                    Clear All Files
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Merge Action panel controls (lg:col-span-4) */}
          <div className="lg:col-span-4 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] p-5 md:p-6 flex flex-col shadow-2xl justify-between">
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Settings2 className="w-5 h-5 text-cyan-400" /> Merger Panel
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
                    className="bg-[#060608] border-zinc-800 text-white rounded-xl text-xs h-10 pr-12 focus:ring-cyan-500/50"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono select-none">
                    .pdf
                  </span>
                </div>
              </div>

              {/* Warnings details */}
              <div className="bg-[#060608] border border-zinc-800/80 rounded-xl p-3.5 text-xs text-zinc-400 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="text-cyan-400">ℹ️</span> How it works
                </div>
                <p className="leading-relaxed">
                  Documents are loaded sequentially in memory. We clone each index page client-side and bind them together. Your uploads stay private inside your sandbox local workspace.
                </p>
              </div>
            </div>

            {/* Bottom Generate Action Button */}
            <div className="pt-4 border-t border-zinc-800 flex flex-col gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              {pdfFiles.length === 0 ? (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95"
                >
                  <UploadCloud className="w-4 h-4 mr-2" /> Upload PDFs
                </Button>
              ) : (
                <Button
                  onClick={handleMergePDFs}
                  disabled={isProcessing || pdfFiles.length < 2}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center disabled:opacity-40"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Combining...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> Combine PDF Files
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
                Local Client-Side <span className="text-cyan-400">PDF Merger</span>
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                Combine several PDF files into a single document without network uploads. Reorder pages, verify page counts, and download combined packages instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔀</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Reorder Document Sequences</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Use Up and Down controls to sort files easily. Combined PDF outputs will assemble documents in the exact order you organize them.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">📖</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Dynamic Page Counts</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  The tool loads PDF headers on selection to extract page totals. Inspect the total output page volume before executing the binder assembly.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔒</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Absolute Work Privacy</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  PDF assembly is executed within the browser using JS memory arrays. Your contracts, forms, and personal documents never leave your browser sandbox.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">⚡</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Fast PDF Copy Engine</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Powered by pure Javascript memory mapping, copying and combining pages takes under a second for standard-sized documents.
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
                      <span className="block text-[11px] text-zinc-500">Max 500 total combined pages. Capping output sizes ensures safe memory allocations and blocks tab crashes.</span>
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
