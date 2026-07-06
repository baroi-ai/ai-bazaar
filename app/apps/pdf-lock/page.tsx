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
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt";

// Navbar and Footer relative imports
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function PDFLockPage() {
  // --- States ---
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [outputName, setOutputName] = useState<string>("protected-document");
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

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File exceeds 100MB safety limit.");
      return;
    }

    setSourceFile(file);
    setFileBuffer(null);

    try {
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);
      
      const baseName = file.name.substring(0, file.name.lastIndexOf("."));
      setOutputName(`${baseName}-protected`);
      toast.success("PDF loaded successfully!");
    } catch (err) {
      console.error("Failed to load PDF:", err);
      toast.error("Failed to read PDF file.");
      clearFile();
    }
  };

  const clearFile = () => {
    setSourceFile(null);
    setFileBuffer(null);
    setOutputName("protected-document");
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

  // --- Password Strength Meter ---
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: "", color: "bg-zinc-800", textClass: "text-zinc-500" };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score, text: "Weak Password", color: "bg-red-500", textClass: "text-red-500" };
    if (score <= 4) return { score, text: "Medium Security", color: "bg-yellow-500", textClass: "text-yellow-500" };
    return { score, text: "Strong Security (AES-256)", color: "bg-emerald-500", textClass: "text-emerald-500" };
  };

  const strength = getPasswordStrength(password);

  // --- Lock PDF ---
  const handleLockPDF = async () => {
    if (!fileBuffer || !sourceFile) return;

    if (!password) {
      toast.error("Please enter a protection password.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsProcessing(true);
    toast.info("Encrypting PDF document...");

    try {
      // Encrypt PDF bytes using AES-256 client-side
      const fileBytes = new Uint8Array(fileBuffer);
      const encryptedBytes = await encryptPDF(fileBytes, password);

      const blob = new Blob([encryptedBytes as any], { type: "application/pdf" });
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

      toast.success("PDF encrypted and saved successfully!");
    } catch (err) {
      console.error("PDF encryption failed:", err);
      toast.error("Failed to encrypt PDF file.");
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
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">Password Protect PDF</h1>
                <p className="text-zinc-400 max-w-md mb-6 text-sm leading-relaxed px-4">
                  Drag and drop your PDF here, or click to browse. Lock files instantly with strong AES-256 encryption.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> AES-256 Security
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" /> Private client-side encrypt
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
                    Size: {formatSize(sourceFile.size)}
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
                <Settings2 className="w-5 h-5 text-cyan-400" /> Encryption Setup
              </h2>

              {/* Password Input */}
              <div className="space-y-1.5">
                <Label htmlFor="protection-password" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                  Set Document Password
                </Label>
                <div className="relative">
                  <Input
                    id="protection-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter strong password"
                    className="bg-[#060608] border-zinc-800 text-white rounded-xl text-xs h-10 pr-10 focus:ring-cyan-500/50"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm-protection-password" className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                  Verify Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-protection-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="bg-[#060608] border-zinc-800 text-white rounded-xl text-xs h-10 pr-10 focus:ring-cyan-500/50"
                  />
                  <button
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password strength indicators */}
              {password && (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-zinc-500">Security Score:</span>
                    <span className={`font-bold uppercase ${strength.textClass}`}>{strength.text}</span>
                  </div>
                  <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${(strength.score / 5) * 100}%` }}
                    />
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
                  onClick={handleLockPDF}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Encrypting...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" /> Protect & Save PDF
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
                Local Client-Side <span className="text-cyan-400">PDF Locker</span>
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                Add strong password protection to PDF documents locally. Keep confidential files safe using modern AES-256 standard encryption algorithms without server uploads.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔑</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">AES-256 Protection</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Locks and encrypts your PDF files using highly secure Advanced Encryption Standard (AES) with 256-bit password locks.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🚦</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Visual Strength Meter</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Analyze your password strength dynamically to verify that your document lock is resistant to brute force attempts.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">👁️</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Password Visibility Toggle</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Toggle mask views on password characters to avoid spelling typos while maintaining confidentiality in shared workspaces.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔒</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">100% Sandbox Privacy</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  PDF document protection is compiled completely inside your local browser memory. No servers, no logs, full security.
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
