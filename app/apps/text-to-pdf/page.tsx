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
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

// Navbar and Footer relative imports
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function TextToPDFPage() {
  // --- States ---
  const [textContent, setTextContent] = useState<string>("");
  const [pageSize, setPageSize] = useState<"a4" | "letter">("a4");
  const [fontFamily, setFontFamily] = useState<"helvetica" | "courier" | "times">("helvetica");
  const [fontSize, setFontSize] = useState<number>(12);
  const [lineSpacing, setLineSpacing] = useState<number>(1.5);
  const [margin, setMargin] = useState<number>(15); // mm
  const [outputName, setOutputName] = useState<string>("text-document");
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

  // --- File Selection Handlers (TXT uploader) ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = async (file: File) => {
    if (file.type !== "text/plain" && !file.name.endsWith(".txt")) {
      toast.error("Please upload a valid TXT text document.");
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB limit for text files
    if (file.size > maxSize) {
      toast.error("File exceeds 2MB safety limit.");
      return;
    }

    toast.info("Loading text document...");

    try {
      const text = await file.text();
      setTextContent(text);
      
      const baseName = file.name.substring(0, file.name.lastIndexOf("."));
      setOutputName(`${baseName}-converted`);
      toast.success("TXT file loaded successfully!");
    } catch (err) {
      console.error("Failed to load text:", err);
      toast.error("Failed to read text file.");
    }
  };

  const clearText = () => {
    setTextContent("");
    setOutputName("text-document");
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

  // --- Compile Text to PDF ---
  const handleCompilePDF = async () => {
    if (!textContent.trim()) {
      toast.error("Please enter some text or upload a TXT file first.");
      return;
    }

    setIsProcessing(true);
    toast.info("Generating PDF document...");

    try {
      const format = pageSize; // 'a4' or 'letter'
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: format,
      });

      // Target page dimensions in mm
      const pw = format === "a4" ? 210 : 215.9;
      const ph = format === "a4" ? 297 : 279.4;

      // Font Configuration
      doc.setFont(fontFamily);
      doc.setFontSize(fontSize);

      // Wrap text inside target margins width
      const maxLineWidth = pw - (margin * 2);
      const lines: string[] = doc.splitTextToSize(textContent, maxLineWidth);

      // Line heights calculation
      const fontHeightInMm = (fontSize * 0.352778); // Convert pt to mm
      const leadingHeight = fontHeightInMm * lineSpacing;

      let yCoord = margin + fontHeightInMm; // start offset

      for (let i = 0; i < lines.length; i++) {
        // Page break checker
        if (yCoord + leadingHeight > ph - margin) {
          doc.addPage();
          yCoord = margin + fontHeightInMm;
        }

        doc.text(lines[i], margin, yCoord);
        yCoord += leadingHeight;
      }

      doc.save(outputName.trim().endsWith(".pdf")
        ? outputName.trim()
        : `${outputName.trim()}.pdf`
      );

      toast.success("PDF generated successfully!");
    } catch (err) {
      console.error("Text to PDF failed:", err);
      toast.error("Failed to generate PDF document.");
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
          
          {/* LEFT: Text Editor Area (lg:col-span-8) */}
          <div className="lg:col-span-8 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] flex flex-col relative overflow-hidden shadow-2xl p-4 md:p-6 justify-start">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" /> Rich Text Workspace
              </h3>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-zinc-800 text-zinc-400 hover:text-white text-xs px-3 h-8 rounded-lg"
                >
                  Upload .txt file
                </Button>
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={clearText}
                  className="bg-red-650 hover:bg-red-550 text-xs px-3 h-8 rounded-lg"
                >
                  Clear Workspace
                </Button>
              </div>
            </div>

            {/* Drag and Drop Text Area wrapper */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="flex-grow flex flex-col"
            >
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type or paste your text content here, or drag and drop a .txt document..."
                className="w-full flex-grow p-4 bg-[#060608] border border-zinc-850 rounded-xl focus:border-zinc-700 outline-none text-sm text-zinc-300 resize-none font-mono min-h-[35vh] md:min-h-[45vh]"
              />
            </div>
          </div>

          {/* RIGHT: Layout settings panel (lg:col-span-4) */}
          <div className="lg:col-span-4 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] p-5 md:p-6 flex flex-col shadow-2xl justify-between">
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Settings2 className="w-5 h-5 text-cyan-400" /> Page Settings
              </h2>

              {/* Font Family Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="font-family-select" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                  Font Family
                </Label>
                <select
                  id="font-family-select"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value as any)}
                  className="w-full bg-[#060608] border border-zinc-800 text-zinc-300 rounded-xl p-2.5 text-xs focus:ring-cyan-500/50"
                >
                  <option value="helvetica">Helvetica (Sans-Serif)</option>
                  <option value="times">Times New Roman (Serif)</option>
                  <option value="courier">Courier (Monospace)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Font Size Selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="font-size-select" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                    Font Size
                  </Label>
                  <select
                    id="font-size-select"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full bg-[#060608] border border-zinc-800 text-zinc-300 rounded-xl p-2.5 text-xs focus:ring-cyan-500/50"
                  >
                    <option value={10}>10 pt (Small)</option>
                    <option value={12}>12 pt (Standard)</option>
                    <option value={14}>14 pt (Large)</option>
                    <option value={18}>18 pt (Heading)</option>
                  </select>
                </div>

                {/* Line Spacing Selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="spacing-select" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                    Line Spacing
                  </Label>
                  <select
                    id="spacing-select"
                    value={lineSpacing}
                    onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                    className="w-full bg-[#060608] border border-zinc-800 text-zinc-300 rounded-xl p-2.5 text-xs focus:ring-cyan-500/50"
                  >
                    <option value={1.15}>Compact (1.15x)</option>
                    <option value={1.5}>Medium (1.5x)</option>
                    <option value={2.0}>Double (2.0x)</option>
                  </select>
                </div>
              </div>

              {/* Page margins select */}
              <div className="space-y-1.5">
                <Label htmlFor="margin-select" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                  Border Margin
                </Label>
                <select
                  id="margin-select"
                  value={margin}
                  onChange={(e) => setMargin(parseInt(e.target.value))}
                  className="w-full bg-[#060608] border border-zinc-800 text-zinc-300 rounded-xl p-2.5 text-xs focus:ring-cyan-500/50"
                >
                  <option value={10}>Narrow Borders (10mm)</option>
                  <option value={15}>Normal Borders (15mm)</option>
                  <option value={25}>Wide Borders (25mm)</option>
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
                accept=".txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                onClick={handleCompilePDF}
                disabled={isProcessing || !textContent.trim()}
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
                Local Client-Side <span className="text-cyan-400">Text to PDF Converter</span>
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                Convert plain text or TXT files to clean formatted PDF files. Adjust fonts, sizing, double spacing and custom borders offline.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">✍️</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Workspace Text Area</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Type draft notes or copy-paste long articles directly into the web interface to format them as print-ready layouts.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔤</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Standard Fonts Selection</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Switch between standard clean Sans-Serif Helvetica, typewriter Monospace Courier, or classic serif Times Roman.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🚀</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Multi-Page Breaks</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  The split-layout compiler automatically calculates lines height boundaries, inserting page-breaks seamlessly.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔒</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">100% Sandbox Privacy</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  PDF document styling runs completely on client hardware. No database connections, keeping your data confidential.
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
