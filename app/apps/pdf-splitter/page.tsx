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
  FileText,
  Trash2,
  Scissors,
  Layers,
  Sparkle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

// Navbar and Footer relative imports
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// --- Types ---
type SplitMode = "ranges" | "fixed" | "extract";

export default function PDFSplitterPage() {
  // --- States ---
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pdfDocInstance, setPdfDocInstance] = useState<PDFDocument | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Settings
  const [splitMode, setSplitMode] = useState<SplitMode>("ranges");
  const [rangeInput, setRangeInput] = useState<string>("1-2, 3-4");
  const [fixedPageInterval, setFixedPageInterval] = useState<number>(1);
  const [selectedPages, setSelectedPages] = useState<Record<number, boolean>>({}); // 1-indexed page checkboxes
  const [outputPrefix, setOutputPrefix] = useState<string>("split-document");

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

  // --- Range Input Default Generator ---
  useEffect(() => {
    if (totalPages > 0) {
      if (totalPages === 1) {
        setRangeInput("1");
      } else if (totalPages === 2) {
        setRangeInput("1, 2");
      } else {
        const half = Math.ceil(totalPages / 2);
        setRangeInput(`1-${half}, ${half + 1}-${totalPages}`);
      }

      // Initialize selected pages checkbox grid
      const initCheckboxes: Record<number, boolean> = {};
      for (let i = 1; i <= totalPages; i++) {
        initCheckboxes[i] = true;
      }
      setSelectedPages(initCheckboxes);
      
      // Setup output prefix default
      if (sourceFile) {
        const baseName = sourceFile.name.substring(0, sourceFile.name.lastIndexOf("."));
        setOutputPrefix(`${baseName}-split`);
      }
    }
  }, [totalPages, sourceFile]);

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
    setTotalPages(0);
    setFileBuffer(null);

    toast.info("Reading PDF content...");

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
      setPdfDocInstance(pdfDoc);
      toast.success("PDF loaded successfully!");
    } catch (err) {
      console.error("Failed to load PDF:", err);
      toast.error("Failed to parse PDF document. It might be password-protected or corrupted.");
      clearFile();
    }
  };

  const clearFile = () => {
    setSourceFile(null);
    setTotalPages(0);
    setFileBuffer(null);
    setPdfDocInstance(null);
    setRangeInput("1-2, 3-4");
    setSelectedPages({});
    setOutputPrefix("split-document");
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

  // --- Select All / Clear All Box toggles ---
  const selectAllPages = (val: boolean) => {
    const updated: Record<number, boolean> = {};
    for (let i = 1; i <= totalPages; i++) {
      updated[i] = val;
    }
    setSelectedPages(updated);
  };

  // --- Range Input Parser utility ---
  const parseRanges = (input: string, maxPages: number): number[][] | string => {
    const cleanInput = input.replace(/\s+/g, "");
    if (!cleanInput) return "Range input is empty.";

    const parts = cleanInput.split(",");
    const resultRanges: number[][] = [];

    for (const part of parts) {
      // Pattern 1: Range like 1-5
      const rangeMatch = part.match(/^(\d+)-(\d+)$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        
        if (isNaN(start) || isNaN(end) || start < 1 || end < 1 || start > maxPages || end > maxPages) {
          return `Invalid range values: ${part}. Pages must be between 1 and ${maxPages}.`;
        }
        if (start > end) {
          return `Start page is greater than end page: ${part}.`;
        }

        const rangePages: number[] = [];
        for (let i = start; i <= end; i++) {
          rangePages.push(i - 1); // convert to 0-indexed page indices
        }
        resultRanges.push(rangePages);
        continue;
      }

      // Pattern 2: Single page like 3
      const singleMatch = part.match(/^(\d+)$/);
      if (singleMatch) {
        const pageNum = parseInt(singleMatch[1], 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > maxPages) {
          return `Invalid page number: ${part}. Must be between 1 and ${maxPages}.`;
        }
        resultRanges.push([pageNum - 1]); // convert to 0-indexed page index
        continue;
      }

      return `Invalid syntax format: "${part}". Use digits, ranges (1-5), and commas.`;
    }

    return resultRanges;
  };

  // --- PDF Splitting Main Execution ---
  const handleSplitPDF = async () => {
    if (!fileBuffer || !sourceFile) return;

    setIsProcessing(true);
    toast.info("Splitting PDF document on device...");

    try {
      const outputDocs: { name: string; bytes: Uint8Array }[] = [];

      // Load clean document to fetch page indices
      const sourcePdf = await PDFDocument.load(fileBuffer);

      if (splitMode === "ranges") {
        const parsed = parseRanges(rangeInput, totalPages);
        if (typeof parsed === "string") {
          toast.error(parsed);
          setIsProcessing(false);
          return;
        }

        // Generate split ranges files
        for (let i = 0; i < parsed.length; i++) {
          const pageIndices = parsed[i];
          if (pageIndices.length === 0) continue;

          const splitDoc = await PDFDocument.create();
          const copiedPages = await splitDoc.copyPages(sourcePdf, pageIndices);
          copiedPages.forEach(p => splitDoc.addPage(p));

          const bytes = await splitDoc.save();
          // Name with range details e.g. prefix-pages-1-3.pdf
          const pageString = pageIndices.map(idx => idx + 1).join("_");
          const label = pageIndices.length === 1 ? `page-${pageIndices[0] + 1}` : `pages-${pageIndices[0] + 1}-${pageIndices[pageIndices.length - 1] + 1}`;
          outputDocs.push({
            name: `${outputPrefix}-${label}.pdf`,
            bytes: bytes
          });
        }
      } else if (splitMode === "fixed") {
        if (fixedPageInterval < 1 || fixedPageInterval > totalPages) {
          toast.error(`Interval must be between 1 and ${totalPages}.`);
          setIsProcessing(false);
          return;
        }

        // Split in chunks of interval size
        let currentIdx = 0;
        let fileNum = 1;
        while (currentIdx < totalPages) {
          const endIdx = Math.min(totalPages, currentIdx + fixedPageInterval);
          const pageIndices: number[] = [];
          for (let i = currentIdx; i < endIdx; i++) {
            pageIndices.push(i);
          }

          const splitDoc = await PDFDocument.create();
          const copiedPages = await splitDoc.copyPages(sourcePdf, pageIndices);
          copiedPages.forEach(p => splitDoc.addPage(p));

          const bytes = await splitDoc.save();
          outputDocs.push({
            name: `${outputPrefix}-part-${fileNum}.pdf`,
            bytes: bytes
          });

          currentIdx = endIdx;
          fileNum++;
        }
      } else if (splitMode === "extract") {
        // Collect checked page indices (0-indexed)
        const pageIndices: number[] = [];
        for (let i = 1; i <= totalPages; i++) {
          if (selectedPages[i]) {
            pageIndices.push(i - 1);
          }
        }

        if (pageIndices.length === 0) {
          toast.error("Please check at least 1 page to extract.");
          setIsProcessing(false);
          return;
        }

        const splitDoc = await PDFDocument.create();
        const copiedPages = await splitDoc.copyPages(sourcePdf, pageIndices);
        copiedPages.forEach(p => splitDoc.addPage(p));

        const bytes = await splitDoc.save();
        outputDocs.push({
          name: `${outputPrefix}-extracted.pdf`,
          bytes: bytes
        });
      }

      // --- Download Output Files ---
      if (outputDocs.length === 0) {
        toast.error("No pages were outputted.");
      } else if (outputDocs.length === 1) {
        // Single PDF download directly
        const fileObj = outputDocs[0];
        const blob = new Blob([fileObj.bytes as any], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileObj.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success("PDF split and downloaded successfully!");
      } else {
        // Multiple PDFs downloaded inside a single zip
        toast.info("Packaging multiple files into ZIP...");
        const zip = new JSZip();
        for (const doc of outputDocs) {
          zip.file(doc.name, doc.bytes);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${outputPrefix}-all-parts.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success(`PDF split! Downloaded ${outputDocs.length} files in a ZIP archive.`);
      }
    } catch (err) {
      console.error("PDF splitting execution failed:", err);
      toast.error("Failed to split PDF document. Ensure the file has valid permissions.");
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
          
          {/* LEFT: Preview Details and Page Checkboxes Grid (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] flex flex-col relative overflow-hidden shadow-2xl p-4 md:p-6 justify-start">
            
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
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">PDF Splitter</h1>
                <p className="text-zinc-400 max-w-md mb-6 text-sm leading-relaxed px-4">
                  Drag and drop a PDF file here, or click to browse. Extract pages or split into ranges.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Private Local Splitting
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" /> ZIP Multi-Part downloads
                  </div>
                </div>
              </div>
            ) : (
              /* PDF Loaded Workspace */
              <div className="w-full flex flex-col h-full">
                
                {/* PDF details badge */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    Source Document Details
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

                {/* Info Card */}
                <div className="bg-[#0a0a0c] border border-zinc-800/80 p-4 rounded-xl mb-6 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono text-zinc-400">
                    <div>Filename: <strong className="text-white block truncate">{sourceFile.name}</strong></div>
                    <div>File Size: <strong className="text-white block">{formatSize(sourceFile.size)}</strong></div>
                    <div>Page Count: <strong className="text-cyan-400 block">{totalPages} pg</strong></div>
                    <div>Privacy Status: <strong className="text-emerald-400 block flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 inline" /> Local Buffer</strong></div>
                  </div>
                </div>

                {/* Extract Checkbox Grid (shown only in extract mode) */}
                {splitMode === "extract" && (
                  <div className="flex-grow flex flex-col border border-zinc-850 bg-[#060608]/40 p-4 rounded-xl overflow-hidden animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-850">
                      <span className="text-xs font-semibold text-zinc-400">Check pages to extract:</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => selectAllPages(true)}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline"
                        >
                          Select All
                        </button>
                        <span className="text-zinc-600">|</span>
                        <button
                          onClick={() => selectAllPages(false)}
                          className="text-[10px] text-zinc-500 hover:text-zinc-400 hover:underline"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 overflow-y-auto max-h-[35vh] pr-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setSelectedPages(prev => ({ ...prev, [pageNum]: !prev[pageNum] }))}
                          className={`p-3 rounded-xl border text-center text-xs transition-all flex flex-col items-center justify-center font-bold font-mono ${
                            selectedPages[pageNum]
                              ? "bg-cyan-500/10 border-cyan-500 text-white"
                              : "bg-[#060608] border-zinc-800 text-zinc-600 hover:border-zinc-700"
                          }`}
                        >
                          <span className="text-[10px] text-zinc-400 block mb-1">Page</span>
                          <span className="text-sm">{pageNum}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ranges or Interval visual instructions info block */}
                {splitMode !== "extract" && (
                  <div className="flex-grow flex flex-col justify-center items-center p-8 bg-[#0a0a0c]/60 rounded-xl border border-zinc-850 border-dashed text-center">
                    <Scissors className="w-10 h-10 text-cyan-500/30 mb-3 animate-pulse" />
                    <span className="text-xs font-semibold text-zinc-400">Parameters ready for compilation</span>
                    <p className="text-[11px] text-zinc-500 max-w-sm mt-1">
                      Configuring parameters on the right board will isolate and cut page indices using memory arrays. Output files will generate immediately on click.
                    </p>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* RIGHT: Split parameters panel (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] p-5 md:p-6 flex flex-col shadow-2xl justify-between">
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Settings2 className="w-5 h-5 text-cyan-400" /> Splitting Board
              </h2>

              {/* Split Mode Selector */}
              <div>
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-3">
                  1. Splitting Mode
                </Label>
                
                <div className="grid grid-cols-3 gap-1.5 bg-[#060608] p-1 rounded-xl border border-zinc-800/80">
                  {[
                    { id: "ranges", label: "By Ranges" },
                    { id: "fixed", label: "Every N pg" },
                    { id: "extract", label: "Extract Selected" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setSplitMode(mode.id as SplitMode)}
                      className={`py-2 rounded-lg text-[10px] md:text-xs font-medium transition-all ${
                        splitMode === mode.id
                          ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Sub-Settings Board */}
              {/* Range input */}
              {splitMode === "ranges" && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="custom-ranges" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                      2. Custom Page Ranges
                    </Label>
                    <span className="text-[10px] text-zinc-500">Syntax: e.g. 1-2, 3-4</span>
                  </div>
                  <Input
                    id="custom-ranges"
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    disabled={!sourceFile}
                    className="bg-[#060608] border-zinc-800 text-white rounded-xl text-xs h-10 focus:ring-cyan-500/50"
                  />
                  {sourceFile && typeof parseRanges(rangeInput, totalPages) === "string" && (
                    <span className="text-[10px] text-red-400 font-medium">
                      ⚠️ {parseRanges(rangeInput, totalPages) as string}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-500 block leading-relaxed">
                    Splitting by ranges creates a separate PDF document for each range sequence. Pages are 1-indexed.
                  </span>
                </div>
              )}

              {/* Split Every N Pages */}
              {splitMode === "fixed" && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="fixed-pages" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                      2. Split Every (N) Pages
                    </Label>
                    <span className="text-cyan-400 font-mono text-xs font-bold">{fixedPageInterval} pg</span>
                  </div>
                  <Input
                    id="fixed-pages"
                    type="number"
                    min={1}
                    max={totalPages > 0 ? totalPages : 1}
                    value={fixedPageInterval}
                    onChange={(e) => setFixedPageInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={!sourceFile}
                    className="bg-[#060608] border-zinc-800 text-white rounded-xl text-xs h-10 focus:ring-cyan-500/50"
                  />
                  <span className="text-[10px] text-zinc-500 block leading-relaxed">
                    For example, setting to 1 page separates every page of the document into its own individual single-page PDF document.
                  </span>
                </div>
              )}

              {/* Extract Specific Pages Info */}
              {splitMode === "extract" && (
                <div className="bg-[#060608] border border-zinc-800/80 rounded-xl p-3.5 text-xs text-zinc-400 leading-relaxed animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 font-semibold text-white mb-1.5">
                    <Layers className="w-4 h-4 text-cyan-400" /> Extraction Mode
                  </div>
                  Check the page card checkboxes in the left grid. Only pages you select will be compiled together into a single unified output PDF document.
                </div>
              )}

              {/* Output File prefix input */}
              <div className="space-y-2">
                <Label htmlFor="output-filename-prefix" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                  Output Filename Prefix
                </Label>
                <Input
                  id="output-filename-prefix"
                  type="text"
                  value={outputPrefix}
                  onChange={(e) => setOutputPrefix(e.target.value)}
                  disabled={!sourceFile}
                  className="bg-[#060608] border-zinc-800 text-white rounded-xl text-xs h-10 focus:ring-cyan-500/50"
                />
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
                  onClick={handleSplitPDF}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Splitting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> Split PDF
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
                Local Client-Side <span className="text-cyan-400">PDF Splitter</span>
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                Separate or extract pages from your PDF files without network uploads. Configure custom range boundaries, split by page counts, and bundle output files locally.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">✂️</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Split Page Ranges</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Specify range bounds like 1-3, 5-8 to generate independent sub-documents. Live syntax checking alerts you to out-of-bounds page values immediately.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🖼️</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Interactive Extraction Grid</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Switch to extract mode and check the visual layout page buttons. Only selected indices assemble together into a fresh, single PDF document.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔒</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Absolute File Privacy</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Your PDF files are split in browser sandbox memory arrays. Documents are never transmitted to external cloud systems, protecting your records.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">📦</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Single ZIP Multi-Downloads</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Splits yielding multiple PDF segments compile inside a ZIP folder automatically, letting you download everything in one package and avoiding browser popup blockers.
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
