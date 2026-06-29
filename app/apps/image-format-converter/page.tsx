"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  FileImage,
  ArrowRight,
  HardDrive,
  Globe,
  CheckCircle2,
  Monitor,
  Smartphone,
  Trash2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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

interface ConvertedData {
  url: string;
  size: number;
  format: string;
  name: string;
}

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  converted?: ConvertedData;
  status: "pending" | "converting" | "done" | "error";
}

const SUPPORTED_FORMATS = [
  { mime: "image/webp", label: "WEBP" },
  { mime: "image/jpeg", label: "JPEG" },
  { mime: "image/png", label: "PNG" },
  { mime: "image/avif", label: "AVIF" },
  { mime: "image/gif", label: "GIF" },
  { mime: "image/bmp", label: "BMP" },
];

const MAX_FILES = 20;
const MAX_FILE_SIZE_MB = 40;

export default function ImageConverterPage() {
  // State
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Conversion Settings
  const [targetFormat, setTargetFormat] = useState<string>("image/webp");
  const [quality, setQuality] = useState<number>(0.8);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ref to track images for cleanup on unmount
  const imagesRef = useRef<ImageItem[]>([]);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const supportsQuality =
    targetFormat === "image/jpeg" ||
    targetFormat === "image/webp" ||
    targetFormat === "image/avif";

  // Cleanup Object URLs ONLY when component unmounts
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => {
        URL.revokeObjectURL(img.previewUrl);
        if (img.converted) URL.revokeObjectURL(img.converted.url);
      });
    };
  }, []);

  // --- Handlers ---
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > MAX_FILES) {
      toast.error(`You can only process up to ${MAX_FILES} images at a time.`);
      return;
    }

    const newImages: ImageItem[] = [];
    let oversizedCount = 0;

    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        oversizedCount++;
        return;
      }
      newImages.push({
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending",
      });
    });

    if (oversizedCount > 0) {
      toast.warning(
        `${oversizedCount} file(s) skipped (exceeded ${MAX_FILE_SIZE_MB}MB limit).`,
      );
    }

    setImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (id: string) => {
    setImages((prev) =>
      prev.filter((img) => {
        if (img.id === id) {
          URL.revokeObjectURL(img.previewUrl);
          if (img.converted) URL.revokeObjectURL(img.converted.url);
        }
        return img.id !== id;
      }),
    );
  };

  const clearAllImages = () => {
    images.forEach((img) => {
      URL.revokeObjectURL(img.previewUrl);
      if (img.converted) URL.revokeObjectURL(img.converted.url);
    });
    setImages([]);
    setProgress(0);
  };

  const processSingleImage = (item: ImageItem): Promise<ConvertedData> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();

      img.onerror = () =>
        reject(new Error("Failed to load image into canvas."));

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

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error(`Browser encoding failed for ${ext}`));
              return;
            }

            const newUrl = URL.createObjectURL(blob);
            const baseName =
              item.file.name.substring(0, item.file.name.lastIndexOf(".")) ||
              "image";

            resolve({
              url: newUrl,
              size: blob.size,
              format: targetFormat,
              name: `${baseName}-converted.${ext}`,
            });
          },
          targetFormat,
          supportsQuality ? quality : undefined,
        );
      };

      img.src = item.previewUrl;
    });
  };

  const handleConvertAll = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setProgress(0);

    const updatedImages = [...images];

    for (let i = 0; i < updatedImages.length; i++) {
      if (updatedImages[i].status === "done") continue;

      updatedImages[i].status = "converting";
      setImages([...updatedImages]);

      try {
        const convertedData = await processSingleImage(updatedImages[i]);
        updatedImages[i].converted = convertedData;
        updatedImages[i].status = "done";
      } catch (error) {
        console.error(error);
        updatedImages[i].status = "error";
      }

      setProgress(Math.round(((i + 1) / updatedImages.length) * 100));
      setImages([...updatedImages]);
    }

    toast.success("Batch conversion complete!");
    setIsProcessing(false);
  };

  const handleDownloadSingle = (converted: ConvertedData) => {
    const link = document.createElement("a");
    link.href = converted.url;
    link.download = converted.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDownloadAll = () => {
    const convertedItems = images.filter(
      (img) => img.status === "done" && img.converted,
    );
    if (!convertedItems.length) return;
    convertedItems.forEach((item, index) => {
      setTimeout(() => handleDownloadSingle(item.converted!), index * 200);
    });
    toast.success(`Downloading ${convertedItems.length} images...`);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans flex flex-col">
      <Navbar />

      <div className="flex flex-col min-h-[calc(100vh-80px)] w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
        <div className="flex-1 bg-[#0e0e0e] border border-zinc-800/80 md:rounded-[2rem] rounded-2xl relative flex flex-col shadow-2xl overflow-hidden mb-6 min-h-[400px]">
          <div className="flex-1 w-full h-full relative p-4 md:p-8 overflow-y-auto">
            {images.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center p-6 md:p-12 w-full h-full animate-in fade-in zoom-in-95 duration-500">
                <FileImage className="h-16 w-16 mb-6 text-zinc-700" />
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">
                  Batch Image Converter
                </h1>
                <p className="text-zinc-400 max-w-md mb-8 text-sm md:text-base leading-relaxed">
                  Convert up to {MAX_FILES} images at once. Everything processes
                  locally within your browser.
                </p>
                <Label
                  htmlFor="source-image-upload-center"
                  className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors shadow-lg"
                >
                  <UploadCloud className="w-5 h-5" /> Select Images
                </Label>
                <Input
                  id="source-image-upload-center"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </div>
            )}

            {images.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="relative bg-[#0a0a0a] border border-zinc-800 rounded-xl overflow-hidden flex flex-col group shadow-lg"
                  >
                    {!isProcessing && (
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    <div className="h-40 w-full bg-zinc-950 flex items-center justify-center p-2 relative">
                      <img
                        src={img.converted ? img.converted.url : img.previewUrl}
                        alt={img.file.name}
                        className={`max-h-full max-w-full object-contain ${img.status === "converting" ? "opacity-50 blur-sm" : ""}`}
                      />
                      {img.status === "converting" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t border-zinc-800 flex flex-col gap-2 bg-[#0e0e0e]">
                      <div className="text-xs text-zinc-400 truncate w-full">
                        {img.file.name}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wide">
                            Original
                          </span>
                          <span className="text-xs font-mono text-zinc-300">
                            {formatFileSize(img.file.size)}
                          </span>
                        </div>
                        {img.converted && (
                          <>
                            <ArrowRight className="w-3 h-3 text-emerald-500/50" />
                            <div className="flex flex-col text-right">
                              <span className="text-[9px] text-emerald-500/70 uppercase tracking-wide">
                                New
                              </span>
                              <span className="text-xs font-mono text-emerald-400">
                                {formatFileSize(img.converted.size)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                      {img.status === "error" && (
                        <div className="text-xs text-red-400 mt-2 font-medium text-center">
                          Conversion Failed
                        </div>
                      )}
                      {img.converted && (
                        <Button
                          onClick={() => handleDownloadSingle(img.converted!)}
                          variant="secondary"
                          size="sm"
                          className="w-full mt-2 h-8 text-xs bg-zinc-800 hover:bg-zinc-700 text-white"
                        >
                          <Download className="w-3 h-3 mr-2" /> Save
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="absolute bottom-0 w-full bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-zinc-800 p-3 md:px-6 md:py-4 flex flex-col md:flex-row items-center justify-between gap-4 z-20">
            <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar w-full md:w-auto px-1">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-zinc-400 font-medium">
                  Format:
                </span>
                <Select
                  value={targetFormat}
                  onValueChange={setTargetFormat}
                  disabled={isProcessing}
                >
                  <SelectTrigger className="bg-zinc-900 border border-zinc-800 text-zinc-200 h-9 rounded-xl text-xs w-28 focus:ring-1 focus:ring-emerald-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
                    {SUPPORTED_FORMATS.map((fmt) => (
                      <SelectItem key={fmt.mime} value={fmt.mime}>
                        <span className="uppercase tracking-wider text-xs font-medium">
                          {fmt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-px h-5 bg-zinc-800 mx-1 shrink-0"></div>
              <div
                className={`flex items-center gap-3 shrink-0 ${!supportsQuality ? "opacity-40" : ""}`}
              >
                <span className="text-xs text-zinc-400 font-medium">
                  Quality:
                </span>
                <Slider
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={[quality]}
                  onValueChange={(v: number[]) => setQuality(v[0])}
                  disabled={isProcessing || !supportsQuality}
                  className="w-24 h-4 [&_.bg-primary]:!bg-emerald-500"
                />
                <span className="w-8 text-right text-xs text-zinc-300 font-mono font-medium">
                  {Math.round(quality * 100)}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              {isProcessing && (
                <div className="mr-4 flex items-center gap-3 w-32 md:w-48">
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">
                    {progress}%
                  </span>
                </div>
              )}
              {!isProcessing && images.some((img) => img.status === "done") && (
                <Button
                  onClick={handleDownloadAll}
                  variant="outline"
                  className="h-9 px-4 text-xs font-semibold border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <Download className="w-3.5 h-3.5 mr-2" /> Download All
                </Button>
              )}
              <div className="relative">
                <Input
                  id="add-more-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageFileChange}
                  className="hidden"
                  disabled={isProcessing || images.length >= MAX_FILES}
                />
                <Label
                  htmlFor="add-more-images"
                  className={`cursor-pointer h-9 px-3 flex items-center justify-center rounded-lg text-xs font-semibold border ${images.length >= MAX_FILES ? "bg-zinc-900 border-zinc-800 text-zinc-600" : "bg-[#0e0e0e] border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}
                >
                  + Add
                </Label>
              </div>
              {!isProcessing && (
                <Button
                  onClick={clearAllImages}
                  variant="ghost"
                  className="h-9 w-9 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                onClick={handleConvertAll}
                disabled={
                  isProcessing || !images.some((img) => img.status !== "done")
                }
                className="h-9 px-5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-gray-950"
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    {" "}
                    <RefreshCw className="w-3.5 h-3.5 mr-2" /> Convert
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8">
      <section className="space-y-16 py-12">
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-3xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="text-2xl">🖼️</span> Next-Gen AVIF & WEBP
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Convert legacy JPEGs and PNGs into highly efficient modern
              formats. AVIF and WEBP offer drastically smaller file sizes while
              maintaining superior visual fidelity for your web projects.
            </p>
          </div>
          <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-3xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="text-2xl">⚙️</span> Lossy Quality Control
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Manually adjust output quality for supported formats. Dial down
              the compression ratio to squeeze images under strict megabyte
              limits for faster page loads and SEO optimization.
            </p>
          </div>
          <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-3xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="text-2xl">🔒</span> 100% Secure Processing
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              All image decoding and encoding occurs strictly in your device's
              memory. No files are uploaded to our servers, guaranteeing
              compliance with strict data privacy laws.
            </p>
          </div>
          <div className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-3xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
              <span className="text-2xl">⚡</span> Zero Network Latency
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Because the tool leverages native browser APIs instead of remote
              compute clusters, batch processing and high-resolution conversions
              complete almost instantaneously.
            </p>
          </div>
        </div>

        {/* System Requirements Section */}
        <div className="p-8 md:p-12 bg-zinc-900/20 border border-zinc-800 rounded-3xl grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold mb-6">System Requirements</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <HardDrive className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-semibold">Memory (RAM)</h4>
                  <p className="text-zinc-400 text-sm mt-1">
                    Minimum 2GB required. For processing 20 high-resolution
                    files simultaneously, 8GB+ is recommended.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Cpu className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-semibold">Processor</h4>
                  <p className="text-zinc-400 text-sm mt-1">
                    Standard modern CPU. Our browser-based canvas engine is
                    optimized for multi-core performance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6">Supported Browsers</h2>
            <div className="grid grid-cols-2 gap-4">
              {["Chrome", "Firefox", "Edge", "Safari"].map((browser) => (
                <div
                  key={browser}
                  className="p-4 bg-zinc-950 rounded-xl border border-zinc-800"
                >
                  <span className="font-semibold text-sm">{browser}</span>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Full compatibility
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      </div>
      <Footer />
      <style
        dangerouslySetInnerHTML={{
          __html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`,
        }}
      />
    </main>
  );
}
