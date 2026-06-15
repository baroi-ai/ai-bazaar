"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Download,
  UploadCloud,
  XCircle,
  Cpu,
  RefreshCw,
  ImageOff,
  ArrowRight,
  FileImage,
  Zap,
  Lock,
  Settings2,
  HardDrive,
  Globe,
  CheckCircle2,
  Monitor,
  Smartphone
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

// Add your Navbar and Footer imports (adjust path if needed)
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// --- Helper for File Size Formatting ---
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

interface ConvertedImage {
  url: string;
  size: number;
  format: string;
  name: string;
}

const SUPPORTED_FORMATS = [
  { mime: "image/webp", label: "WEBP" },
  { mime: "image/jpeg", label: "JPEG" },
  { mime: "image/png", label: "PNG" },
  { mime: "image/avif", label: "AVIF" },
  { mime: "image/gif", label: "GIF" },
  { mime: "image/bmp", label: "BMP" },
];

export default function ImageConverterPage() {
  // State
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [convertedImage, setConvertedImage] = useState<ConvertedImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState("Upload an image to begin...");

  // Conversion Settings
  const [targetFormat, setTargetFormat] = useState<string>("image/webp");
  const [quality, setQuality] = useState<number>(0.8);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportsQuality =
    targetFormat === "image/jpeg" ||
    targetFormat === "image/webp" ||
    targetFormat === "image/avif";

  // Cleanup
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      if (convertedImage) URL.revokeObjectURL(convertedImage.url);
    };
  }, [imagePreviewUrl, convertedImage]);

  // --- Handlers ---
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 40 * 1024 * 1024) {
        toast.error("File size cannot exceed 40MB to ensure smooth local processing.");
        return;
      }
      setSourceImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      setConvertedImage(null);
      setStatusText(file.name);
      e.target.value = "";
    }
  };

  const clearImage = () => {
    setSourceImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    if (convertedImage) URL.revokeObjectURL(convertedImage.url);
    setConvertedImage(null);
    setStatusText("Upload an image to begin...");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- ZERO-COST CLIENT-SIDE CONVERSION LOGIC ---
  const handleConvert = () => {
    if (!sourceImageFile || !imagePreviewUrl) return;

    setIsLoading(true);

    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.src = imagePreviewUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      if (targetFormat === "image/jpeg" || targetFormat === "image/bmp") {
        ctx!.fillStyle = "#FFFFFF";
        ctx!.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx?.drawImage(img, 0, 0);

      let ext = targetFormat.split("/")[1];
      if (ext === "jpeg") ext = "jpg";

      const exportQuality = supportsQuality ? quality : undefined;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            toast.error(`Failed to convert. Your browser might not support ${ext.toUpperCase()} encoding.`);
            setIsLoading(false);
            return;
          }

          const newUrl = URL.createObjectURL(blob);
          const baseName = sourceImageFile.name.substring(0, sourceImageFile.name.lastIndexOf(".")) || "image";

          setConvertedImage({
            url: newUrl,
            size: blob.size,
            format: targetFormat,
            name: `${baseName}-converted.${ext}`,
          });

          toast.success("Conversion complete!");
          setIsLoading(false);
        },
        targetFormat,
        exportQuality
      );
    };

    img.onerror = () => {
      toast.error("Failed to load image.");
      setIsLoading(false);
    };
  };

  const handleDownload = () => {
    if (!convertedImage) return;
    const link = document.createElement("a");
    link.href = convertedImage.url;
    link.download = convertedImage.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans flex flex-col">
      <Navbar />

      {/* --- SECTION 1: THE TOOL (Above the Fold) --- */}
      <div className="flex flex-col min-h-[calc(100vh-80px)] w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
        
        {/* MAIN PREVIEW AREA */}
        <div className="flex-1 bg-[#0e0e0e] border border-zinc-800/80 md:rounded-[2rem] rounded-2xl relative flex flex-col shadow-2xl overflow-hidden mb-6">
          
          <div className="flex-1 w-full h-full overflow-hidden relative flex flex-col items-center justify-center p-4 md:p-8">
            
            {/* STATE 1: Empty */}
            {!imagePreviewUrl && (
              <div className="flex flex-col items-center justify-center text-center p-6 md:p-12 w-full animate-in fade-in zoom-in-95 duration-500">
                <FileImage className="h-16 w-16 mb-6 text-zinc-700" />
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">Image Converter</h1>
                <p className="text-zinc-400 max-w-md mb-8 text-sm md:text-base leading-relaxed">
                  Convert image formats and compress file sizes instantly. Everything processes locally within your browser.
                </p>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium uppercase tracking-wider">
                  <Cpu className="w-4 h-4" /> 100% Private Local Conversion
                </div>
              </div>
            )}

            {/* STATE 2 & 3: Preview & Converted Image */}
            {imagePreviewUrl && (
              <div className="animate-in fade-in duration-500 relative flex flex-col items-center justify-center w-full h-full max-h-full">
                
                <div className="relative shadow-2xl rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-2 flex-shrink-0 flex items-center justify-center max-w-full max-h-full">
                  <img
                    src={convertedImage ? convertedImage.url : imagePreviewUrl}
                    alt="Preview"
                    className="max-h-[50vh] max-w-full w-auto object-contain rounded-xl block"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={clearImage}
                    className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-lg transition-opacity bg-red-600 hover:bg-red-500 z-40"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>

                {/* Stats Card (Visible after conversion) */}
                {convertedImage && sourceImageFile && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#0a0a0a]/90 backdrop-blur-md border border-zinc-700 rounded-2xl p-3 flex flex-col gap-3 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex flex-col items-center p-2 bg-zinc-900 border border-zinc-800 rounded-xl w-[45%]">
                        <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Original</span>
                        <span className="text-zinc-300 font-mono text-xs">{formatFileSize(sourceImageFile.size)}</span>
                        <span className="text-zinc-600 text-[9px] uppercase mt-1">{sourceImageFile.type.split("/")[1]}</span>
                      </div>

                      <ArrowRight className="w-4 h-4 text-emerald-500/50 shrink-0" />

                      <div className="flex flex-col items-center p-2 bg-emerald-950/30 border border-emerald-900/50 rounded-xl w-[45%]">
                        <span className="text-emerald-500/70 text-[10px] font-bold uppercase tracking-wider mb-0.5">Converted</span>
                        <span className="text-emerald-400 font-mono text-xs">{formatFileSize(convertedImage.size)}</span>
                        <span className="text-emerald-600 text-[9px] uppercase mt-1">{convertedImage.format.split("/")[1]}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Editor Toolbar (Settings) */}
          {imagePreviewUrl && (
            <div className="w-full bg-[#0a0a0a]/80 backdrop-blur-md border-t border-zinc-800 p-3 md:px-6 md:py-4 flex justify-center z-10">
              <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar w-full md:w-auto justify-start md:justify-center px-1">
                
                {/* Format Dropdown */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-400 font-medium">Format:</span>
                  <Select value={targetFormat} onValueChange={setTargetFormat} disabled={isLoading}>
                    <SelectTrigger className="bg-zinc-900 border border-zinc-800 text-zinc-200 h-9 rounded-xl text-xs w-28 focus:ring-1 focus:ring-emerald-500">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
                      {SUPPORTED_FORMATS.map((fmt) => (
                        <SelectItem key={fmt.mime} value={fmt.mime} className="focus:bg-zinc-800 focus:text-white">
                          <span className="uppercase tracking-wider text-xs font-medium">{fmt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-px h-5 bg-zinc-800 mx-1 shrink-0"></div>

                {/* Quality Slider */}
                <div className={`flex items-center gap-3 shrink-0 transition-opacity duration-300 ${!supportsQuality ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
                  <span className="text-xs text-zinc-400 font-medium">Quality:</span>
                  <div className="w-24 md:w-32 flex items-center">
                    <Slider
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={[quality]}
                      onValueChange={(v: number[]) => setQuality(v[0])}
                      disabled={isLoading || !supportsQuality}
                      className="h-4 [&_.bg-primary]:!bg-emerald-500"
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-zinc-300 font-mono font-medium">
                    {Math.round(quality * 100)}%
                  </span>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* BOTTOM UPLOAD / GENERATE SECTION */}
        <div className="shrink-0 w-full flex flex-col items-center justify-center max-w-4xl mx-auto gap-3 mb-24 md:mb-0">
          
          {/* Input Bar */}
          <div className="flex items-center gap-2 md:gap-3 w-full">
            <div className="shrink-0 relative">
              <Input
                ref={fileInputRef}
                id="source-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
                disabled={isLoading}
              />
              <Label
                htmlFor="source-image-upload"
                className={`cursor-pointer h-12 md:h-14 w-12 md:w-14 flex items-center justify-center rounded-xl md:rounded-2xl transition-all shadow-lg ${
                  imagePreviewUrl 
                    ? "bg-emerald-500/10 border border-emerald-500/50 text-emerald-400" 
                    : "bg-[#0e0e0e] border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-zinc-600"
                }`}
              >
                <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
              </Label>
            </div>

            <div className="relative flex-grow h-12 md:h-14 bg-[#0e0e0e] border border-zinc-800 rounded-xl md:rounded-2xl flex items-center px-3 md:px-4 shadow-lg transition-colors focus-within:border-emerald-500/50 overflow-hidden">
              <span className="text-xs md:text-sm text-zinc-500 truncate pr-[140px] md:pr-48 select-none w-full">
                {statusText}
              </span>

              <div className="absolute right-1.5 md:right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                
                {/* Convert Button */}
                {(!convertedImage || statusText !== convertedImage.name) && (
                  <Button
                    onClick={handleConvert}
                    disabled={!imagePreviewUrl || isLoading}
                    className={`h-9 md:h-10 px-3 md:px-6 rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm font-bold transition-all shadow-lg shrink-0 ${
                      !imagePreviewUrl || isLoading
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-zinc-200 hover:bg-white text-zinc-900 hover:scale-105 active:scale-95"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-2 hidden md:inline-block" /> 
                        Convert
                      </>
                    )}
                  </Button>
                )}

                {/* Download Button (Only shows after conversion) */}
                {convertedImage && (
                   <Button
                    onClick={handleDownload}
                    className="h-9 md:h-10 px-4 md:px-6 rounded-lg md:rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-gray-900 text-xs md:text-sm font-bold shadow-[0_0_15px_rgba(52,211,153,0.3)] shrink-0 animate-in zoom-in"
                  >
                    <Download className="w-4 h-4 md:mr-1.5" /> <span className="hidden md:inline">Save Image</span>
                  </Button>
                )}

              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* --- SECTION 2: SEO & APP EXPLANATION GRID (Below the Fold) --- */}
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-20 flex flex-col gap-8 md:gap-12">
        
        {/* Features Grid */}
        <section className="p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden shadow-2xl border border-zinc-800/50 bg-[#0e0e0e]/50 backdrop-blur-xl max-w-4xl mx-auto w-full">
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 blur-[100px] pointer-events-none z-0"></div>

          <div className="text-center mb-10 relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Lightning-Fast <span className="text-emerald-400">Image Conversion</span>
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
              Transform image formats and compress file sizes directly in your browser. Utilizing the HTML5 Canvas API, there are no server uploads, meaning zero latency and absolute privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
            {/* SEO Card 1 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-emerald-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">🖼️</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Next-Gen AVIF & WEBP
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Convert legacy JPEGs and PNGs into highly efficient modern formats. AVIF and WEBP offer drastically smaller file sizes while maintaining superior visual fidelity.
              </p>
            </div>

            {/* SEO Card 2 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-teal-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">⚙️</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Lossy Quality Control
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Manually adjust output quality for supported formats. Dial down the compression ratio to squeeze images under strict megabyte limits for web deployment.
              </p>
            </div>

            {/* Privacy Card 3 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-sky-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">🔒</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                100% Secure Processing
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                All image decoding and encoding occurs strictly in your device's memory. No files are uploaded to our servers, guaranteeing compliance with strict data privacy laws.
              </p>
            </div>

            {/* Speed Card 4 */}
            <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 md:p-6 rounded-2xl hover:border-cyan-500/20 transition group">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-105 transition-transform">⚡</div>
              <h3 className="text-sm md:text-base font-bold text-white mb-2">
                Zero Network Latency
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Because the tool leverages native browser APIs instead of remote compute clusters, batch processing and high-resolution conversions complete almost instantaneously.
              </p>
            </div>
          </div>
        </section>

        {/* System Requirements & Browser Compatibility */}
        <section className="p-6 md:p-10 rounded-[2rem] border border-zinc-800/50 bg-[#0e0e0e]/50 backdrop-blur-xl max-w-4xl mx-auto w-full">
          <div className="text-center md:text-left mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
              System Requirements & Compatibility
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm">
              This tool utilizes modern HTML5 APIs. Browser support dictates which output formats are available.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Minimum Specs */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" /> Hardware Specs
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm text-white font-medium">Memory (RAM)</span>
                    <span className="block text-xs text-zinc-500">Minimum 2GB required. For processing 40MB source files, 4GB+ is recommended to prevent tab crashes.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-sm text-white font-medium">Processor</span>
                    <span className="block text-xs text-zinc-500">Standard mobile or desktop CPU. Canvas encoding is generally single-threaded.</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Browser Support */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-400" /> Supported Browsers
              </h3>
              <div className="grid grid-cols-2 gap-3">
                
                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Monitor className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Chrome Desktop</span>
                    <span className="block text-[10px] text-zinc-500">Full Support (inc. AVIF)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Smartphone className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Chrome Android</span>
                    <span className="block text-[10px] text-zinc-500">Full Support (inc. AVIF)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Monitor className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Firefox Desktop</span>
                    <span className="block text-[10px] text-zinc-500">Full Support</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                  <Monitor className="w-5 h-5 text-zinc-400" />
                  <div>
                    <span className="block text-xs font-semibold text-white">Safari / WebKit</span>
                    <span className="block text-[10px] text-zinc-500">AVIF output not supported natively on older versions.</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

      </div>

      <Footer />
      
      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  );
}