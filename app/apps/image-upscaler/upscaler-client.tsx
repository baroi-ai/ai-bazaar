"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import PocketBase from "pocketbase";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Coins,
  Loader2,
  Download,
  UploadCloud,
  ImageUpscale,
  XCircle,
  Monitor,
  Tv,
  MoveHorizontal,
  Sparkles,
  Zap,
  ShieldCheck,
} from "lucide-react";

// UI Components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// Initialize PocketBase
const pb = new PocketBase("http://127.0.0.1:8090");

// --- ROBUST COMPARE SLIDER ---
const CompareSlider = ({ original, enhanced }: { original: string; enhanced: string }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const updatePosition = (clientX: number) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    const pos = ((clientX - left) / width) * 100;
    setSliderPosition(Math.min(100, Math.max(0, pos)));
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    updatePosition(clientX);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      updatePosition(clientX);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleMove);
      window.addEventListener("touchend", handleEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="relative inline-block w-full max-w-full h-auto select-none group cursor-col-resize rounded-2xl md:rounded-[2rem] overflow-hidden border border-zinc-800 shadow-2xl bg-[#0a0a0a]"
      onMouseDown={handleStart}
      onTouchStart={handleStart}
    >
      <img src={original} alt="Reference" className="block max-h-[50vh] md:max-h-[60vh] w-auto max-w-full h-auto opacity-0 pointer-events-none" />

      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <img src={enhanced} alt="Enhanced" className="absolute inset-0 w-full h-full object-contain" />
      </div>

      <div
        className="absolute inset-0 h-full overflow-hidden border-r-2 border-white/50 z-10 pointer-events-none"
        style={{ width: `${sliderPosition}%` }}
      >
        <div className="absolute top-0 left-0 h-full" style={{ width: containerWidth ? `${containerWidth}px` : "100%" }}>
          <img src={original} alt="Original" className="absolute inset-0 w-full h-full object-contain" />
        </div>
      </div>

      <div
        className="absolute top-0 bottom-0 w-1 bg-white/80 cursor-ew-resize shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center z-20 pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="bg-[#0a0a0a] rounded-full p-1 md:p-1.5 shadow-lg border border-zinc-700 transform transition-transform hover:scale-110">
          <MoveHorizontal className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      {/* LABELS WITH HIGH VISIBILITY ON MOBILE */}
      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-[9px] md:text-[11px] font-bold px-2.5 py-1 md:py-1.5 rounded-lg z-30 pointer-events-none uppercase tracking-widest border border-white/10 shadow-lg">
        ← Before
      </div>
      <div className="absolute top-3 right-3 bg-sky-500/80 backdrop-blur-md text-[#0a0a0a] text-[9px] md:text-[11px] font-black px-2.5 py-1 md:py-1.5 rounded-lg z-30 pointer-events-none uppercase tracking-widest border border-sky-400/30 shadow-lg">
        After →
      </div>
    </div>
  );
};

// --- CONFIGURATION ---
const availableModels = [
  { id: "fal-ai/nano-banana-2/edit", name: "Deepshark Upscaler", iconPath: "/logo.png", supportsUpscalingLevels: true, supportsImageInput: true },
  { id: "fal-ai/topaz/upscale/image", name: "Topaz Upscaler", iconPath: "/logo.png", supportsUpscalingLevels: true, supportsImageInput: true },
];

const upscaleLevels = [
  { id: "2k", name: "2K (2x)", value: 2, IconComponent: Monitor },
  { id: "4k", name: "4K (4x)", value: 4, IconComponent: Tv },
];

interface GenerationJob {
  id: string;
  status: "processing" | "completed" | "failed";
  urls: string[];
  upscaleLevel: string;
  originalUrl?: string;
}

export default function ImageUpscalerClient() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedModel, setSelectedModel] = useState(availableModels[0].id);
  const [upscaleLevel, setUpscaleLevel] = useState(upscaleLevels[0].id);
  
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeJobs, setActiveJobs] = useState<GenerationJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsAuthenticated(pb.authStore.isValid);
    return () => { if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl); };
  }, [imagePreviewUrl]);

  const calculatedCost = useMemo(() => {
    const is4K = upscaleLevels.find((r) => r.id === upscaleLevel)?.value! >= 4;
    if (selectedModel === "fal-ai/nano-banana-2/edit") return is4K ? 20 : 10;
    if (selectedModel === "fal-ai/topaz/upscale/image") return is4K ? 12 : 8;
    return 10;
  }, [selectedModel, upscaleLevel]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { toast.error("File size cannot exceed 10MB."); return; }
      setSourceImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setActiveJobs([]);
      e.target.value = "";
    }
  };

  const clearImage = () => {
    setSourceImageFile(null);
    setImagePreviewUrl(null);
    setActiveJobs([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!isAuthenticated) return router.push("/login");
    if (!sourceImageFile) return toast.error("Please upload an image to upscale.");

    setIsLoading(true);
    toast.info(`Upscaling... (Cost: ${calculatedCost} coins)`);

    const newJobId = `job-${Date.now()}`;
    setActiveJobs([{ id: newJobId, status: "processing", urls: [], upscaleLevel: upscaleLevel, originalUrl: imagePreviewUrl || "" }]);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(sourceImageFile);
      const base64Data = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
      });

      const response = await fetch("/api/upscale", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": pb.authStore.token 
        },
        body: JSON.stringify({
          modelId: selectedModel,
          input: {
            image_data: base64Data,
            scale: upscaleLevels.find(r => r.id === upscaleLevel)?.value || 2,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) toast.error("Insufficient coins! Please recharge.");
        else toast.error(data.error || "Upscale failed");
        throw new Error(data.error);
      }

      pb.authStore.model!.credits = data.remainingCredits;

      setActiveJobs((prev) => prev.map((job) => job.id === newJobId ? { ...job, status: "completed", urls: [data.imageUrl] } : job));
      toast.success("Upscale complete!");
    } catch (error) {
      setActiveJobs((prev) => prev.map((job) => job.id === newJobId ? { ...job, status: "failed" } : job));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (imageUrl: string, jobId: string) => {
    setDownloadingIndex(jobId);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `upscaled-${jobId}.png`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Download failed.");
    } finally {
      setDownloadingIndex(null);
    }
  };

  return (
    <div className="flex flex-col bg-transparent text-gray-300 font-sans scroll-smooth relative overflow-hidden">
      
      {/* ABOVE THE FOLD SECTION (Forces min-h-screen to hide SEO until scroll) */}
      <div className="flex flex-col min-h-screen relative overflow-hidden">
        <Navbar />
        
        {/* TOOL WORKSPACE SECTION */}
        <div className="flex-grow p-4 md:p-6 flex flex-col justify-center">
          <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center">
            
            {/* STATE 1: Empty */}
            {activeJobs.length === 0 && !imagePreviewUrl && (
              <div className="flex flex-col items-center justify-center text-center text-zinc-500 py-12 px-4">
                <ImageUpscale className="h-14 w-14 md:h-16 md:w-16 mb-6 opacity-30 text-sky-400 animate-pulse" />
                <h1 className="text-2xl md:text-4xl font-extrabold mb-3 text-white tracking-tight">AI Image Upscaler</h1>
                <p className="max-w-md text-zinc-400 text-xs md:text-sm leading-relaxed">Enhance image quality, clear noise, and boost details up to ultra-sharp 4K resolution using advanced neural networks.</p>
              </div>
            )}

            {/* STATE 2: Preview */}
            {activeJobs.length === 0 && imagePreviewUrl && (
              <div className="animate-in fade-in duration-500 relative group w-fit max-w-full h-auto flex items-center justify-center p-2">
                <img src={imagePreviewUrl} alt="Source Preview" className="max-h-[45vh] md:max-h-[55vh] max-w-full w-auto object-contain rounded-2xl border border-zinc-800 shadow-2xl" />
                <Button variant="destructive" size="icon" onClick={clearImage} className="absolute top-4 right-4 h-9 w-9 rounded-full shadow-lg md:opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 active:scale-95">
                  <XCircle className="h-4 w-4 text-white" />
                </Button>
              </div>
            )}

            {/* STATE 3: Generation Status */}
            {activeJobs.length > 0 && (
              <div className="w-full flex justify-center items-center p-2">
                {activeJobs.map((job) => {
                  if (job.status === "processing") {
                    return (
                      <div key={job.id} className="w-full max-w-sm md:max-w-md aspect-square rounded-[2rem] border border-dashed border-zinc-800 bg-[#0e0e0e] flex flex-col items-center justify-center shadow-2xl p-4">
                        <Loader2 className="h-8 w-8 md:h-10 md:w-10 animate-spin text-sky-400 mb-5" />
                        <p className="text-zinc-400 text-xs md:text-sm font-medium animate-pulse">Enhancing structures...</p>
                      </div>
                    );
                  }
                  if (job.status === "completed") {
                    return job.urls.map((imgSrc, index) => (
                      <div key={`${job.id}-${index}`} className="relative group w-fit max-w-full h-auto rounded-[2rem] overflow-hidden shadow-2xl flex justify-center">
                        <CompareSlider original={job.originalUrl!} enhanced={imgSrc} />
                        <Button size="icon" onClick={() => handleDownload(imgSrc, job.id)} disabled={downloadingIndex === job.id} className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-40 h-10 w-10 md:h-12 md:w-12 rounded-full bg-sky-500 hover:bg-sky-400 text-[#0a0a0a] shadow-xl transition-transform active:scale-95">
                          {downloadingIndex === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 md:h-5 md:w-5" />}
                        </Button>
                      </div>
                    ));
                  }
                  if (job.status === "failed") {
                    return (
                      <div key={job.id} className="w-full max-w-md aspect-video rounded-[2rem] border border-dashed border-red-500/30 bg-red-500/5 flex flex-col items-center justify-center text-red-400 p-6 text-center">
                        <XCircle className="h-8 w-8 mb-3" />
                        <span className="text-xs md:text-sm font-medium">Upscale Failed. Please try another sample.</span>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        </div>

        {/* MOBILE FRIENDLY INTERACTIVE INTERFACE BAR */}
        <div className="w-full px-4 pb-24 md:pb-8 pt-2 border-t border-zinc-900/40">
          <div className="max-w-4xl mx-auto space-y-3.5">
            
            {/* Models Toggles Selector Row */}
            <div className="flex items-center justify-center gap-2 md:gap-3 w-full">
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
                <SelectTrigger className="flex-1 md:flex-initial md:w-[180px] bg-[#0e0e0e] border border-zinc-800 text-zinc-300 h-10 rounded-xl focus:ring-0 text-xs">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="bg-[#0e0e0e] border-zinc-800 text-zinc-300">
                  {availableModels.map((m) => <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={upscaleLevel} onValueChange={setUpscaleLevel} disabled={isLoading}>
                <SelectTrigger className="w-[110px] md:w-[130px] bg-[#0e0e0e] border border-zinc-800 text-zinc-300 h-10 rounded-xl focus:ring-0 text-xs">
                  <SelectValue placeholder="Resolution" />
                </SelectTrigger>
                <SelectContent className="bg-[#0e0e0e] border-zinc-800 text-zinc-300">
                  {upscaleLevels.map((l) => <SelectItem key={l.id} value={l.id} className="text-xs">{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Unified Prompt & Upload Action Layout Wrapper */}
            <div className="p-1.5 bg-[#0e0e0e] border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-xl">
              <div className="flex items-center gap-2 flex-grow">
                <Input ref={fileInputRef} id="upload" type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" disabled={isLoading} />
                <Label htmlFor="upload" className="cursor-pointer h-11 w-11 shrink-0 flex items-center justify-center bg-zinc-900 border border-zinc-800 hover:border-sky-500 hover:text-sky-400 rounded-xl text-zinc-400 transition-all active:scale-95 m-0">
                  <UploadCloud className="h-4 w-4" />
                </Label>
                
                {/* REPLACED TEXTAREA WITH INPUT FOR SINGLE LINE NO-BREAK TEXT */}
                <Input 
                  placeholder={imagePreviewUrl ? "Ready to upscale." : "Upload image..."} 
                  readOnly 
                  className="flex-grow bg-transparent border-none text-zinc-100 placeholder-zinc-500 px-2 h-11 text-xs md:text-sm font-medium shadow-none focus-visible:ring-0 cursor-not-allowed pointer-events-none" 
                />
              </div>
              
              <Button onClick={handleGenerate} disabled={isLoading || !sourceImageFile} className="h-11 sm:h-11 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold transition-all shadow-lg text-xs tracking-wide shrink-0 flex items-center justify-center gap-2 active:scale-[0.98]">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    <span>{isAuthenticated ? calculatedCost : "Upscale"}</span> 
                    <Coins className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>

          </div>
        </div>
      </div>

      {/* --- RICH DEEP CONTENT SECTION FOR SEO GOOGLE RANKING --- */}
      <section className="w-full bg-[#08080c] border-t border-zinc-900 py-12 md:py-16 px-4 md:px-8">
        <article className="max-w-4xl mx-auto space-y-10 text-zinc-400 text-xs md:text-sm leading-relaxed">
          
          <div className="text-center space-y-3">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Unlock Cinematic Clarity with Advanced AI Upscaling
            </h2>
            <p className="text-zinc-500 max-w-xl mx-auto text-[11px] md:text-xs">
              Stop letting compression algorithms ruin your creative assets. Turn low-res textures, dynamic photographs, and compressed graphics into production-ready masterpieces.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 border border-zinc-800/50 bg-[#0e0e12]/40 rounded-xl space-y-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h3 className="text-white font-semibold text-xs md:text-sm">Intelligent Detail Recovery</h3>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Unlike standard linear scaling that blurs pixels, our custom neural pipelines interpret textures, lines, and lighting fields to reconstruct natural detail from scratch.
              </p>
            </div>
            <div className="p-4 border border-zinc-800/50 bg-[#0e0e12]/40 rounded-xl space-y-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h3 className="text-white font-semibold text-xs md:text-sm">Topaz & Deepshark Engines</h3>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Choose between custom weights optimized for design consistency and production-standard frameworks specialized in heavy photorealistic image recovery up to 4K.
              </p>
            </div>
            <div className="p-4 border border-zinc-800/50 bg-[#0e0e12]/40 rounded-xl space-y-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-semibold text-xs md:text-sm">Secure Cloud Pipelines</h3>
              <p className="text-[11px] text-zinc-500 leading-normal">
                All uploaded imagery runs through secure, completely private processing instances. Your original data and upscaled files remain under your absolute cloud ownership.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-900/60">
            <h3 className="text-sm md:text-base font-bold text-white tracking-tight">Frequently Asked Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-zinc-300 font-medium text-xs mb-1">What makes AI upscaling better than basic stretching?</h4>
                <p className="text-[11px] text-zinc-500">
                  Traditional editing programs use mathematical scaling which makes images blurry. AI networks analyze pixel patterns and intelligently generate new high-fidelity data matching the original setting.
                </p>
              </div>
              <div>
                <h4 className="text-zinc-300 font-medium text-xs mb-1">What file sizes are recommended?</h4>
                <p className="text-[11px] text-zinc-500">
                  You can upload clean assets in PNG, JPEG, or WEBP under 10MB. Clearer initial textures yield the absolute best 4K details during regeneration steps.
                </p>
              </div>
            </div>
          </div>

        </article>
      </section>

      <Footer />
    </div>
  );
}
