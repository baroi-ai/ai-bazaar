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
  Edit3,
  Type,
  Image as ImageIcon,
  Eraser,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";

// Navbar and Footer relative imports
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// --- Types ---
type SignatureMethod = "draw" | "type" | "upload";
type CursiveFont = "Alex Brush" | "Dancing Script" | "Great Vibes" | "Sacramento";

export default function PDFSignaturePage() {
  // --- States ---
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [outputName, setOutputName] = useState<string>("signed-document");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Signature Generation States
  const [method, setMethod] = useState<SignatureMethod>("draw");
  const [inkColor, setInkColor] = useState<string>("#000000");
  const [strokeWidth, setStrokeWidth] = useState<number>(3);

  // Typed Signature
  const [typedName, setTypedName] = useState<string>("John Doe");
  const [selectedFont, setSelectedFont] = useState<CursiveFont>("Dancing Script");

  // Uploaded Signature
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  // Final Signature Output PNG State
  const [sigPngUrl, setSigPngUrl] = useState<string | null>(null);

  // Draggable Placement States (in percentages relative to mockup page size)
  const [sigX, setSigX] = useState<number>(40); // left %
  const [sigY, setSigY] = useState<number>(75); // top %
  const [sigScale, setSigScale] = useState<number>(35); // size scale %
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; sigX: number; sigY: number }>({
    mouseX: 0,
    mouseY: 0,
    sigX: 0,
    sigY: 0,
  });

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const sigPadRef = useRef<HTMLCanvasElement>(null);
  const mockPageRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef<boolean>(false);

  // --- Pre-fetch Google Cursive Fonts ---
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Alex+Brush&family=Dancing+Script&family=Great+Vibes&family=Sacramento&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
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

  // --- Cleanup Preview URLs ---
  useEffect(() => {
    return () => {
      if (uploadedImagePreview) URL.revokeObjectURL(uploadedImagePreview);
      if (sigPngUrl) URL.revokeObjectURL(sigPngUrl);
    };
  }, [uploadedImagePreview, sigPngUrl]);

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
    setSelectedPageIndex(0);
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
      setOutputName(`${baseName}-signed`);
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
    setSelectedPageIndex(0);
    setOutputName("signed-document");
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

  // --- Signature Pad Canvas Drawing Logic ---
  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = sigPadRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    isDrawingRef.current = true;
    const { x, y } = getCanvasCoordinates(e, canvas);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    const canvas = sigPadRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = sigPadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigPngUrl(null);
  };

  // --- Generate PNG from Drawing / Typing / Uploading ---
  const handleGenerateSignaturePNG = () => {
    if (method === "draw") {
      const canvas = sigPadRef.current;
      if (!canvas) return;

      // Check if canvas is empty
      const emptyCtx = canvas.getContext("2d");
      if (!emptyCtx) return;

      // Convert drawing to data URL
      const dataUrl = canvas.toDataURL("image/png");
      if (sigPngUrl) URL.revokeObjectURL(sigPngUrl);
      setSigPngUrl(dataUrl);
      toast.success("Signature captured! Drag it on the page mockup.");
    } else if (method === "type") {
      if (!typedName.trim()) {
        toast.error("Please enter a name first.");
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 200;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `italic 50px "${selectedFont}", cursive`;
      ctx.fillStyle = inkColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedName, 300, 100);

      const dataUrl = canvas.toDataURL("image/png");
      if (sigPngUrl) URL.revokeObjectURL(sigPngUrl);
      setSigPngUrl(dataUrl);
      toast.success("Cursive signature generated!");
    } else if (method === "upload") {
      if (!uploadedImagePreview) {
        toast.error("Please upload a signature image first.");
        return;
      }
      if (sigPngUrl) URL.revokeObjectURL(sigPngUrl);
      setSigPngUrl(uploadedImagePreview);
      toast.success("Uploaded signature loaded!");
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file.");
        return;
      }
      setUploadedImageFile(file);
      if (uploadedImagePreview) URL.revokeObjectURL(uploadedImagePreview);
      setUploadedImagePreview(URL.createObjectURL(file));
    }
  };

  // --- Signature placement dragging events ---
  const startDragSignature = (e: React.MouseEvent | React.TouchEvent) => {
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

    setIsDragging(true);
    setDragStart({
      mouseX: clientX,
      mouseY: clientY,
      sigX: sigX,
      sigY: sigY
    });
  };

  const dragSignature = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !mockPageRef.current) return;

    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = mockPageRef.current.getBoundingClientRect();
    const deltaX = ((clientX - dragStart.mouseX) / rect.width) * 100;
    const deltaY = ((clientY - dragStart.mouseY) / rect.height) * 100;

    // Clamp coordinates within mockup page
    const nextX = Math.max(0, Math.min(100 - sigScale, dragStart.sigX + deltaX));
    const nextY = Math.max(0, Math.min(100 - (sigScale * 0.4), dragStart.sigY + deltaY));

    setSigX(nextX);
    setSigY(nextY);
  };

  const stopDragSignature = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", dragSignature);
      window.addEventListener("mouseup", stopDragSignature);
      window.addEventListener("touchmove", dragSignature, { passive: false });
      window.addEventListener("touchend", stopDragSignature);
    }
    return () => {
      window.removeEventListener("mousemove", dragSignature);
      window.removeEventListener("mouseup", stopDragSignature);
      window.removeEventListener("touchmove", dragSignature);
      window.removeEventListener("touchend", stopDragSignature);
    };
  }, [isDragging, dragStart, sigX, sigY, sigScale]);

  // --- Compile & Save PDF with signature ---
  const handleSignPDF = async () => {
    if (!fileBuffer || !sourceFile || !sigPngUrl) return;

    setIsProcessing(true);
    toast.info("Embedding signature into PDF page...");

    try {
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pages = pdfDoc.getPages();

      if (selectedPageIndex < 0 || selectedPageIndex >= pages.length) {
        toast.error("Invalid page selected.");
        setIsProcessing(false);
        return;
      }

      const page = pages[selectedPageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Convert PNG Data URL / Object URL to array buffer
      const response = await fetch(sigPngUrl);
      const imgBytes = await response.arrayBuffer();
      const embeddedSigImage = await pdfDoc.embedPng(imgBytes);

      // Map percentages to absolute PDF coordinates
      const targetW = (sigScale / 100) * pageWidth;
      const targetH = targetW * 0.35; // standard signature proportions 1:0.35
      const targetX = (sigX / 100) * pageWidth;

      // Flipped Y mapping: PDF Y coordinate starts at the bottom-left!
      const targetY = (1 - (sigY / 100) - (sigScale * 0.35 / 100)) * pageHeight;

      // Draw the signature
      page.drawImage(embeddedSigImage, {
        x: targetX,
        y: targetY,
        width: targetW,
        height: targetH,
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

      toast.success("Document signed and downloaded successfully!");
    } catch (err) {
      console.error("PDF signature embedding failed:", err);
      toast.error("Failed to sign PDF. Verify the document is not password protected.");
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

          {/* LEFT: Draggable Placement Mockup Workspace (lg:col-span-7) */}
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
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">PDF Signer</h1>
                <p className="text-zinc-400 max-w-md mb-6 text-sm leading-relaxed px-4">
                  Drag and drop a PDF file here, or click to browse. Place drawn, typed, or uploaded signatures visually.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Private Local Signing
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Edit3 className="w-3.5 h-3.5 text-emerald-400" /> Cursive type signature
                  </div>
                </div>
              </div>
            ) : (
              /* Loaded Workspace Draggable Mockup */
              <div className="relative w-full h-full flex flex-col items-center justify-center">

                {/* Visual Page mockup board (matches A4 aspect ratio 1:1.414) */}
                <div
                  ref={mockPageRef}
                  className="relative w-full max-w-md aspect-[1/1.414] bg-white border border-zinc-200 shadow-2xl rounded-lg overflow-hidden select-none"
                >
                  {/* Visual PDF page lines placeholder */}
                  <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none opacity-10">
                    <div className="space-y-4">
                      <div className="h-4 bg-zinc-950 rounded w-3/4" />
                      <div className="h-3 bg-zinc-950 rounded w-5/6" />
                      <div className="h-3 bg-zinc-950 rounded w-2/3" />
                      <div className="h-3 bg-zinc-950 rounded w-1/2" />
                    </div>

                    <div className="space-y-4">
                      <div className="h-3 bg-zinc-950 rounded w-5/6" />
                      <div className="h-3 bg-zinc-950 rounded w-4/5" />
                    </div>

                    <div className="flex justify-end pt-12">
                      <div className="h-10 bg-zinc-950 rounded w-1/3" />
                    </div>
                  </div>

                  {/* Watermark/Signature overlay box (only visible if generated) */}
                  {sigPngUrl ? (
                    <div
                      onMouseDown={startDragSignature}
                      onTouchStart={startDragSignature}
                      className="absolute z-20 cursor-move border border-dashed border-cyan-500 bg-cyan-500/5 hover:bg-cyan-500/10 flex items-center justify-center p-1 group shadow-lg"
                      style={{
                        left: `${sigX}%`,
                        top: `${sigY}%`,
                        width: `${sigScale}%`,
                        height: `${sigScale * 0.35}%`, // maintain 1:0.35 signatures aspect ratio
                      }}
                    >
                      <img
                        src={sigPngUrl}
                        alt="Signature Overlay"
                        className="w-full h-full object-contain pointer-events-none"
                      />

                      {/* Glow borders indicator */}
                      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-cyan-500 rounded-full border border-white group-hover:scale-110 transition-transform" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-cyan-500 rounded-full border border-white group-hover:scale-110 transition-transform" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400 pointer-events-none select-none">
                      Generate a signature in the right panel to place it here.
                    </div>
                  )}

                  {/* Absolute Delete overlay button */}
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={clearFile}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg bg-red-600 hover:bg-red-500 z-30 transition-transform active:scale-90"
                    title="Remove PDF"
                  >
                    <XCircle className="h-4.5 w-4.5" />
                  </Button>
                </div>

                {/* Page Select and Metrics details */}
                <div className="flex flex-wrap items-center justify-center gap-3 bg-[#0a0a0c] border border-zinc-800 p-2.5 rounded-xl mt-4 z-20 shadow-md">
                  <span className="text-zinc-400 font-mono text-xs select-none">
                    Pages: <strong className="text-white">{totalPages} pg</strong>
                  </span>

                  {/* Select page number dropdown */}
                  <span className="text-zinc-500 font-mono text-xs select-none px-2 border-l border-zinc-800 flex items-center gap-2">
                    Sign Page:
                    <select
                      value={selectedPageIndex}
                      onChange={(e) => setSelectedPageIndex(parseInt(e.target.value))}
                      className="bg-[#060608] border border-zinc-800 text-white rounded p-1 text-[10px] outline-none"
                    >
                      {Array.from({ length: totalPages }, (_, i) => i).map((idx) => (
                        <option key={idx} value={idx}>Page {idx + 1}</option>
                      ))}
                    </select>
                  </span>

                  {sigPngUrl && (
                    <span className="text-zinc-500 font-mono text-xs select-none px-2 border-l border-zinc-800">
                      Placement: <strong className="text-cyan-400">X: {Math.round(sigX)}% Y: {Math.round(sigY)}%</strong>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Signature Creator & Settings Panel (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] p-5 md:p-6 flex flex-col shadow-2xl justify-between overflow-y-auto max-h-[85vh]">
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Settings2 className="w-5 h-5 text-cyan-400" /> Signature Panel
              </h2>

              {/* Signature method Tab buttons */}
              <div>
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-2.5">
                  1. Choose Signature Method
                </Label>
                <div className="grid grid-cols-3 gap-1 bg-[#060608] p-1 rounded-xl border border-zinc-800/80">
                  <button
                    onClick={() => setMethod("draw")}
                    className={`py-2 rounded-lg text-[10px] md:text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${method === "draw"
                        ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                        : "text-zinc-500 hover:text-zinc-300"
                      }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Draw
                  </button>
                  <button
                    onClick={() => setMethod("type")}
                    className={`py-2 rounded-lg text-[10px] md:text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${method === "type"
                        ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                        : "text-zinc-500 hover:text-zinc-300"
                      }`}
                  >
                    <Type className="w-3.5 h-3.5" /> Type Name
                  </button>
                  <button
                    onClick={() => setMethod("upload")}
                    className={`py-2 rounded-lg text-[10px] md:text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${method === "upload"
                        ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                        : "text-zinc-500 hover:text-zinc-300"
                      }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Upload File
                  </button>
                </div>
              </div>

              {/* DRAW METHOD WORKSPACE */}
              {method === "draw" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="text-zinc-500 text-[10px] uppercase font-bold">Draw Signature Below</Label>
                      <button
                        onClick={clearCanvas}
                        className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 hover:underline bg-transparent"
                      >
                        <Eraser className="w-3 h-3" /> Clear Canvas
                      </button>
                    </div>

                    {/* Canvas drawing element container */}
                    <div className="border border-zinc-800 bg-[#060608] rounded-xl relative overflow-hidden h-36">
                      <canvas
                        ref={sigPadRef}
                        width={400}
                        height={144}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Ink Color */}
                    <div className="space-y-1.5">
                      <Label htmlFor="draw-ink-color" className="text-zinc-500 text-[10px] uppercase font-bold">Ink Color</Label>
                      <select
                        id="draw-ink-color"
                        value={inkColor}
                        onChange={(e) => setInkColor(e.target.value)}
                        className="w-full bg-[#060608] border border-zinc-800 text-zinc-300 rounded-lg p-2 text-xs focus:ring-cyan-500/50"
                      >
                        <option value="#000000">Black Ink</option>
                        <option value="#0000ff">Blue Ink</option>
                        <option value="#ff0000">Red Ink</option>
                      </select>
                    </div>

                    {/* Stroke width */}
                    <div className="space-y-1.5">
                      <Label htmlFor="draw-stroke-width" className="text-zinc-500 text-[10px] uppercase font-bold">Line Width</Label>
                      <select
                        id="draw-stroke-width"
                        value={strokeWidth}
                        onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                        className="w-full bg-[#060608] border border-zinc-800 text-zinc-300 rounded-lg p-2 text-xs focus:ring-cyan-500/50"
                      >
                        <option value={2}>Fine (2px)</option>
                        <option value={3}>Medium (3px)</option>
                        <option value={5}>Bold (5px)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TYPE METHOD WORKSPACE */}
              {method === "type" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Name Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="typed-name-input" className="text-zinc-500 text-[10px] uppercase font-bold">Type Your Name</Label>
                    <Input
                      id="typed-name-input"
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      className="bg-[#060608] border-zinc-800 text-white rounded-lg text-xs h-9 focus:ring-cyan-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Font selector */}
                    <div className="space-y-1.5">
                      <Label htmlFor="type-cursive-font" className="text-zinc-500 text-[10px] uppercase font-bold">Select Font</Label>
                      <select
                        id="type-cursive-font"
                        value={selectedFont}
                        onChange={(e) => setSelectedFont(e.target.value as CursiveFont)}
                        className="w-full bg-[#060608] border border-zinc-800 text-zinc-300 rounded-lg p-2 text-xs focus:ring-cyan-500/50"
                      >
                        <option value="Dancing Script">Dancing Script</option>
                        <option value="Alex Brush">Alex Brush</option>
                        <option value="Great Vibes">Great Vibes</option>
                        <option value="Sacramento">Sacramento</option>
                      </select>
                    </div>

                    {/* Color selector */}
                    <div className="space-y-1.5">
                      <Label htmlFor="type-ink-color" className="text-zinc-500 text-[10px] uppercase font-bold">Color</Label>
                      <select
                        id="type-ink-color"
                        value={inkColor}
                        onChange={(e) => setInkColor(e.target.value)}
                        className="w-full bg-[#060608] border border-zinc-800 text-zinc-300 rounded-lg p-2 text-xs focus:ring-cyan-500/50"
                      >
                        <option value="#0000ff">Blue Ink</option>
                        <option value="#000000">Black Ink</option>
                        <option value="#ff0000">Red Ink</option>
                      </select>
                    </div>
                  </div>

                  {/* Cursive text previews container */}
                  <div className="border border-zinc-850 bg-[#060608] p-3 rounded-xl h-20 flex items-center justify-center overflow-hidden">
                    <span
                      style={{ fontFamily: `"${selectedFont}", cursive`, color: inkColor }}
                      className="text-3xl tracking-wide select-none"
                    >
                      {typedName || "john doe"}
                    </span>
                  </div>
                </div>
              )}

              {/* UPLOAD METHOD WORKSPACE */}
              {method === "upload" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <Label className="text-zinc-500 text-[10px] uppercase font-bold">Select PNG/JPG Signature</Label>
                    <input
                      ref={signatureInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />

                    {!uploadedImagePreview ? (
                      <button
                        onClick={() => signatureInputRef.current?.click()}
                        className="w-full py-6 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-xs text-zinc-500 bg-[#060608] hover:border-zinc-700 hover:text-zinc-300 transition"
                      >
                        <UploadCloud className="w-6 h-6 mb-1.5 text-zinc-600" /> Choose Signature Image
                      </button>
                    ) : (
                      <div className="bg-[#060608] border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate text-xs">
                          <img
                            src={uploadedImagePreview}
                            alt="Signature preview"
                            className="w-8 h-8 rounded border border-zinc-800 object-contain bg-zinc-950"
                          />
                          <span className="truncate max-w-[120px] font-medium text-white">{uploadedImageFile?.name}</span>
                        </div>
                        <button
                          onClick={() => {
                            setUploadedImageFile(null);
                            setUploadedImagePreview(null);
                            setSigPngUrl(null);
                            if (signatureInputRef.current) signatureInputRef.current.value = "";
                          }}
                          className="text-red-400 hover:text-red-300 transition"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Capturing / Generating trigger */}
              <div>
                <Button
                  onClick={handleGenerateSignaturePNG}
                  className="w-full bg-[#060608] border border-zinc-800 text-zinc-300 hover:bg-zinc-900 border text-xs h-10 flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Capture Signature
                </Button>
              </div>

              {/* DRAGGABLE SETTINGS CONTROLS (only shown if signature PNG generated) */}
              {sigPngUrl && (
                <div className="space-y-4 pt-4 border-t border-zinc-850 animate-in slide-in-from-top-3 duration-300">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                    2. Scale Overlay Size
                  </Label>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Signature Scale:</span>
                      <span className="text-cyan-400 font-mono font-bold">{sigScale}%</span>
                    </div>
                    <Slider
                      min={10}
                      max={80}
                      step={1}
                      value={[sigScale]}
                      onValueChange={(val) => setSigScale(val[0])}
                    />
                  </div>
                </div>
              )}

              {/* Output Name input */}
              <div className="space-y-2 pt-4 border-t border-zinc-850">
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
                  onClick={handleSignPDF}
                  disabled={isProcessing || !sigPngUrl}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center disabled:opacity-40"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Embedding Sign...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> Sign & Save PDF
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
                Local Client-Side <span className="text-cyan-400">PDF Signer</span>
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                Add signatures to PDF files online without network uploads. Draw signatures, type cursive names, or upload scan image files locally in your browser sandbox.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">✍️</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">HTML5 Draw Signature Pad</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Draw your hand signature cleanly. Supports black, blue, and red ink coordinates with fine/bold line widths completely offline.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔤</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Cursive Type Generator</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Type your name to render styled signatures. Choose from Alex Brush, Great Vibes, Sacramento, or Dancing Script signature font formats.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🎯</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Visual Drag-and-Place</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Drag the signature overlay box to position it on the PDF page mockup. Use the scale slider to resize the signature dimensions.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔒</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">100% Sandbox Privacy</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  PDF signature mapping is executed in local browser memory arrays. Sensitive legal files never leave your system, protecting your security.
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
