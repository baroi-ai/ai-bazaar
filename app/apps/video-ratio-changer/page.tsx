"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  Download,
  UploadCloud,
  XCircle,
  Video,
  Crop,
  Maximize2,
  Settings2,
  Cpu,
  HardDrive,
  Globe,
  CheckCircle2,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Navbar and Footer relative imports
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// --- Types ---
interface AspectRatio {
  id: string;
  name: string;
  ratio: number;
  width: number;
  height: number;
  icon: string;
  label: string;
}

type CropMode = "cover" | "contain" | "blur" | "stretch";
type ExportQuality = "480p" | "720p" | "1080p";

const ASPECT_RATIOS: AspectRatio[] = [
  { id: "16_9", name: "16:9", ratio: 16 / 9, width: 1920, height: 1080, icon: "📺", label: "YouTube / Landscape" },
  { id: "9_16", name: "9:16", ratio: 9 / 16, width: 1080, height: 1920, icon: "📱", label: "TikTok / Shorts / Reels" },
  { id: "1_1", name: "1:1", ratio: 1, width: 1080, height: 1080, icon: "🟦", label: "Instagram Square" },
  { id: "4_5", name: "4:5", ratio: 0.8, width: 1080, height: 1350, icon: "📸", label: "Instagram Portrait" },
  { id: "4_3", name: "4:3", ratio: 4 / 3, width: 1440, height: 1080, icon: "📼", label: "Classic SD TV" },
  { id: "21_9", name: "21:9", ratio: 21 / 9, width: 2560, height: 1080, icon: "🎬", label: "Cinematic Ultrawide" },
];

export default function VideoRatioChangerPage() {
  // --- States ---
  const [sourceVideoFile, setSourceVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>(ASPECT_RATIOS[0]);
  const [cropMode, setCropMode] = useState<CropMode>("blur");
  const [exportQuality, setExportQuality] = useState<ExportQuality>("720p");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Export States
  const [isExporting, setIsExporting] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fgVideoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const hiddenValidatorRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const processVideoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const exportTimerRef = useRef<any>(null);

  // --- Mobile Detection ---
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

  // --- Cleanup Object URLs ---
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  // --- Sync Dual Videos for Blur Preview ---
  useEffect(() => {
    const fg = fgVideoRef.current;
    const bg = bgVideoRef.current;
    if (!fg || !bg || cropMode !== "blur") return;

    const onPlay = () => bg.play().catch(() => {});
    const onPause = () => bg.pause();
    const onSeeking = () => { bg.currentTime = fg.currentTime; };
    const onSeeked = () => { bg.currentTime = fg.currentTime; };
    const onRateChange = () => { bg.playbackRate = fg.playbackRate; };

    fg.addEventListener("play", onPlay);
    fg.addEventListener("pause", onPause);
    fg.addEventListener("seeking", onSeeking);
    fg.addEventListener("seeked", onSeeked);
    fg.addEventListener("ratechange", onRateChange);

    // Initial Sync
    bg.currentTime = fg.currentTime;
    if (!fg.paused) bg.play().catch(() => {});

    return () => {
      fg.removeEventListener("play", onPlay);
      fg.removeEventListener("pause", onPause);
      fg.removeEventListener("seeking", onSeeking);
      fg.removeEventListener("seeked", onSeeked);
      fg.removeEventListener("ratechange", onRateChange);
    };
  }, [cropMode, videoPreviewUrl]);

  // --- Playback Sync Helper for Controls ---
  const togglePlay = () => {
    const fg = fgVideoRef.current;
    if (!fg) return;

    if (isPlaying) {
      fg.pause();
      setIsPlaying(false);
    } else {
      fg.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const fg = fgVideoRef.current;
    if (!fg) return;

    fg.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // --- Video Selection Handlers ---
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a valid video file.");
      return;
    }

    const maxSize = isMobile ? 50 * 1024 * 1024 : 150 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File size exceeds limit (${isMobile ? "50MB" : "150MB"}).`);
      return;
    }

    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);

    setSourceVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    setIsPlaying(false);
    setIsMuted(false);
  };

  const clearVideo = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setSourceVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoDuration(0);
    setVideoDimensions({ width: 0, height: 0 });
    setIsPlaying(false);
    setIsMuted(false);
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

  // --- Helper: MimeType support detector ---
  const getSupportedMimeType = () => {
    const types = [
      "video/mp4;codecs=h264,aac",
      "video/mp4;codecs=h264",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return "video/webm";
  };

  // --- Dimension Calculator ---
  const getExportDimensions = (quality: ExportQuality, ratio: number) => {
    const maxDim = quality === "480p" ? 480 : quality === "720p" ? 720 : 1080;
    let w, h;
    if (ratio >= 1) {
      // Landscape or Square
      w = maxDim;
      h = Math.round(maxDim / ratio);
    } else {
      // Portrait
      h = maxDim;
      w = Math.round(maxDim * ratio);
    }

    // Force dimensions to be even numbers for codec compliance
    w = w % 2 === 0 ? w : w - 1;
    h = h % 2 === 0 ? h : h - 1;

    return { width: w, height: h };
  };

  // --- Canvas Draw Helpers ---
  const drawCover = (ctx: CanvasRenderingContext2D, video: HTMLVideoElement, w: number, h: number) => {
    const srcAspect = video.videoWidth / video.videoHeight;
    const dstAspect = w / h;
    let dw, dh, dx, dy;
    if (srcAspect > dstAspect) {
      dh = h;
      dw = h * srcAspect;
      dx = (w - dw) / 2;
      dy = 0;
    } else {
      dw = w;
      dh = w / srcAspect;
      dx = 0;
      dy = (h - dh) / 2;
    }
    ctx.drawImage(video, dx, dy, dw, dh);
  };

  const drawContainOnly = (ctx: CanvasRenderingContext2D, video: HTMLVideoElement, w: number, h: number) => {
    const srcAspect = video.videoWidth / video.videoHeight;
    const dstAspect = w / h;
    let dw, dh, dx, dy;
    if (srcAspect > dstAspect) {
      dw = w;
      dh = w / srcAspect;
      dx = 0;
      dy = (h - dh) / 2;
    } else {
      dh = h;
      dw = h * srcAspect;
      dx = (w - dw) / 2;
      dy = 0;
    }
    ctx.drawImage(video, dx, dy, dw, dh);
  };

  const drawContain = (ctx: CanvasRenderingContext2D, video: HTMLVideoElement, w: number, h: number) => {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    drawContainOnly(ctx, video, w, h);
  };

  const drawStretch = (ctx: CanvasRenderingContext2D, video: HTMLVideoElement, w: number, h: number) => {
    ctx.drawImage(video, 0, 0, w, h);
  };

  const drawBlurBackground = (ctx: CanvasRenderingContext2D, video: HTMLVideoElement, w: number, h: number) => {
    ctx.save();
    const srcAspect = video.videoWidth / video.videoHeight;
    const dstAspect = w / h;
    let dw, dh, dx, dy;
    if (srcAspect > dstAspect) {
      dh = h;
      dw = h * srcAspect;
      dx = (w - dw) / 2;
      dy = 0;
    } else {
      dw = w;
      dh = w / srcAspect;
      dx = 0;
      dy = (h - dh) / 2;
    }

    if (typeof (ctx as any).filter !== "undefined") {
      (ctx as any).filter = "blur(30px) brightness(0.6)";
      ctx.drawImage(video, dx, dy, dw, dh);
      (ctx as any).filter = "none";
    } else {
      ctx.drawImage(video, dx, dy, dw, dh);
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();

    drawContainOnly(ctx, video, w, h);
  };

  // --- Export Logic ---
  const handleExport = async () => {
    if (!sourceVideoFile || !videoPreviewUrl) return;

    // Pause current main previews
    if (fgVideoRef.current) fgVideoRef.current.pause();
    setIsPlaying(false);

    // Initialize States
    setIsExporting(true);
    setProgressPercentage(0);
    setElapsedTime(0);

    const { width: exportWidth, height: exportHeight } = getExportDimensions(exportQuality, selectedRatio.ratio);

    // Setup offscreen canvas
    const canvas = document.createElement("canvas");
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Unable to initialize canvas contexts.");
      setIsExporting(false);
      return;
    }

    // Setup Offscreen video elements for extraction
    const processVideo = document.createElement("video");
    processVideoRef.current = processVideo;
    processVideo.src = videoPreviewUrl;
    processVideo.crossOrigin = "anonymous";
    processVideo.playsInline = true;
    processVideo.volume = 1.0;
    processVideo.muted = false; // Must be false to extract audio, but we silence speakers via Web Audio

    let audioCtx: AudioContext | null = null;
    let audioDestNode: MediaStreamAudioDestinationNode | null = null;
    let audioSourceNode: MediaElementAudioSourceNode | null = null;

    try {
      // Initialize Audio context securely inside this user interaction thread
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioCtxClass();
      audioSourceNode = audioCtx.createMediaElementSource(processVideo);
      audioDestNode = audioCtx.createMediaStreamDestination();
      
      // Connect sound tracks to destination (MediaRecorder input)
      audioSourceNode.connect(audioDestNode);
      // DO NOT connect to audioCtx.destination. This mutes speakers!
    } catch (err) {
      console.warn("Audio extraction not fully supported. Proceeding as video-only.", err);
    }

    // Capture Canvas Stream at standard 30fps
    const canvasStream = canvas.captureStream(30);
    const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

    if (audioDestNode) {
      const audioTracks = audioDestNode.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        combinedTracks.push(audioTracks[0]);
      }
    }

    const combinedStream = new MediaStream(combinedTracks);
    const recordedChunks: Blob[] = [];
    const mimeType = getSupportedMimeType();

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
    } catch (e) {
      // Fallback if mimeType strict compilation fails
      mediaRecorder = new MediaRecorder(combinedStream);
    }
    recorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    // Render loop
    const renderLoop = () => {
      if (processVideo.paused || processVideo.ended) return;

      // Draw according to Crop Mode
      if (cropMode === "cover") {
        drawCover(ctx, processVideo, exportWidth, exportHeight);
      } else if (cropMode === "contain") {
        drawContain(ctx, processVideo, exportWidth, exportHeight);
      } else if (cropMode === "stretch") {
        drawStretch(ctx, processVideo, exportWidth, exportHeight);
      } else if (cropMode === "blur") {
        drawBlurBackground(ctx, processVideo, exportWidth, exportHeight);
      }

      // Progress Tracker
      const current = processVideo.currentTime;
      const duration = processVideo.duration || videoDuration;
      if (duration > 0) {
        const pct = Math.min(99, Math.round((current / duration) * 100));
        setProgressPercentage(pct);
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    mediaRecorder.onstop = () => {
      // Cleanup drawing loops
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (exportTimerRef.current) clearInterval(exportTimerRef.current);
      if (audioCtx) audioCtx.close();

      if (recordedChunks.length === 0) {
        toast.error("Encoding failed: No media frames captured.");
        setIsExporting(false);
        return;
      }

      const fileExtension = mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(recordedChunks, { type: mimeType });
      const url = URL.createObjectURL(blob);

      // Download
      const link = document.createElement("a");
      link.href = url;
      link.download = `resized-${sourceVideoFile.name.split(".")[0]}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Aspect ratio modified successfully!");
      setIsExporting(false);
      setProgressPercentage(100);
    };

    // Begin playback and recording
    processVideo.addEventListener("play", () => {
      mediaRecorder.start();
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    });

    processVideo.addEventListener("ended", () => {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    });

    // Time counter timer
    let startSec = 0;
    exportTimerRef.current = setInterval(() => {
      startSec += 1;
      setElapsedTime(startSec);
    }, 1000);

    // Kick off playback
    processVideo.currentTime = 0;
    processVideo.play().catch((err) => {
      console.error("Export playback failed:", err);
      toast.error("Failed to process video playback.");
      cleanupExport();
    });
  };

  const cleanupExport = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (exportTimerRef.current) clearInterval(exportTimerRef.current);
    
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (processVideoRef.current) {
      processVideoRef.current.pause();
      processVideoRef.current.src = "";
    }
    setIsExporting(false);
    toast.error("Process aborted by user.");
  };

  // --- Calculated Estimates ---
  const getRemainingTime = () => {
    if (elapsedTime === 0) return "--";
    const percentDone = progressPercentage / 100;
    if (percentDone === 0) return "--";
    
    const totalEst = elapsedTime / percentDone;
    const remaining = Math.max(0, Math.round(totalEst - elapsedTime));
    
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans flex flex-col">
      <Navbar />

      {/* Hidden validator video element for initial file check */}
      {videoPreviewUrl && (
        <video
          ref={hiddenValidatorRef}
          src={videoPreviewUrl}
          className="hidden"
          preload="metadata"
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            const limit = isMobile ? 180 : 600; // 3 mins Mobile, 10 mins Desktop
            if (video.duration > limit) {
              const limitText = isMobile ? "3 minutes (180s)" : "10 minutes (600s)";
              toast.error(`Video exceeds local browser limit of ${limitText}.`);
              clearVideo();
              return;
            }
            setVideoDuration(video.duration);
            setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
          }}
          onError={() => {
            toast.error("Error loading video format. Try another file.");
            clearVideo();
          }}
        />
      )}

      {/* Main Container */}
      <div className="flex flex-col w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6" style={{ minHeight: "calc(100vh - 80px)" }}>
        
        {/* Main Work Area */}
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 min-h-[50vh]">
          
          {/* LEFT: Video Preview Area (lg:col-span-8) */}
          <div className="lg:col-span-8 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] flex flex-col relative overflow-hidden shadow-2xl p-4 md:p-6 justify-center items-center">
            
            {/* Empty Upload State */}
            {!videoPreviewUrl ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-2xl py-12 md:py-20 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                  isDragOver
                    ? "border-cyan-500 bg-cyan-500/5 scale-[1.02]"
                    : "border-zinc-800 bg-[#0a0a0a] hover:border-zinc-700 hover:bg-[#0c0c0f]"
                }`}
              >
                <UploadCloud className="h-16 w-16 mb-6 text-zinc-600 animate-pulse" />
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">Video Aspect Ratio Changer</h1>
                <p className="text-zinc-400 max-w-md mb-6 text-sm leading-relaxed px-4">
                  Drag and drop your video here, or click to browse. Rescale to standard sizes locally without uploads.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Private Local Processing
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Maximum {isMobile ? "50MB" : "150MB"} Size
                  </div>
                </div>
              </div>
            ) : (
              /* Loaded Video Preview State */
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                {/* Clean Aspect Ratio Container Wrapper */}
                <div className="relative w-full max-h-[60vh] flex items-center justify-center flex-grow">
                  
                  {/* Dynamic Aspect Ratio Box */}
                  <div
                    className="relative max-h-full max-w-full overflow-hidden border border-zinc-800 bg-[#060608] shadow-2xl rounded-xl transition-all duration-300"
                    style={{
                      aspectRatio: selectedRatio.ratio,
                      width: selectedRatio.ratio >= 1 ? "100%" : "auto",
                      height: selectedRatio.ratio < 1 ? "60vh" : "auto",
                      maxHeight: "100%",
                      maxWidth: "100%",
                    }}
                  >
                    {/* Mode 1: Cover */}
                    {cropMode === "cover" && (
                      <video
                        ref={fgVideoRef}
                        src={videoPreviewUrl}
                        className="w-full h-full object-cover"
                        playsInline
                        loop
                      />
                    )}

                    {/* Mode 2: Contain */}
                    {cropMode === "contain" && (
                      <video
                        ref={fgVideoRef}
                        src={videoPreviewUrl}
                        className="w-full h-full object-contain"
                        playsInline
                        loop
                      />
                    )}

                    {/* Mode 3: Stretch */}
                    {cropMode === "stretch" && (
                      <video
                        ref={fgVideoRef}
                        src={videoPreviewUrl}
                        className="w-full h-full object-fill"
                        playsInline
                        loop
                      />
                    )}

                    {/* Mode 4: Blurred Background */}
                    {cropMode === "blur" && (
                      <div className="relative w-full h-full overflow-hidden">
                        {/* Blurred Backer */}
                        <video
                          ref={bgVideoRef}
                          src={videoPreviewUrl}
                          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-50"
                          muted
                          playsInline
                          loop
                        />
                        {/* Sharp Front */}
                        <video
                          ref={fgVideoRef}
                          src={videoPreviewUrl}
                          className="relative z-10 w-full h-full object-contain"
                          playsInline
                          loop
                        />
                      </div>
                    )}
                  </div>

                  {/* Absolute Delete overlay button */}
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={clearVideo}
                    className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-lg bg-red-600 hover:bg-red-500 z-30 transition-transform active:scale-90"
                    title="Remove Video"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>

                {/* Video Playback controls */}
                <div className="flex items-center gap-3 bg-[#0a0a0c] border border-zinc-800 p-2 rounded-xl mt-4 z-20 shadow-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlay}
                    className="text-zinc-300 hover:text-white"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className="text-zinc-300 hover:text-white"
                  >
                    {isMuted ? <VolumeX className="h-5 w-5 text-red-400" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                  <span className="text-zinc-500 font-mono text-xs select-none px-2 border-l border-zinc-800">
                    Duration: {videoDuration ? `${videoDuration.toFixed(1)}s` : "--"}
                  </span>
                  <span className="text-zinc-500 font-mono text-xs select-none px-2 border-l border-zinc-800">
                    Source: {videoDimensions.width ? `${videoDimensions.width}x${videoDimensions.height}` : "--"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Control Board (lg:col-span-4) */}
          <div className="lg:col-span-4 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] p-5 md:p-6 flex flex-col shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Settings2 className="w-5 h-5 text-cyan-400" /> Adjustment Panel
            </h2>

            {/* Inputs & Actions */}
            <div className="space-y-6 flex-grow">
              
              {/* Aspect Ratio Cards Selection */}
              <div>
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-3">
                  1. Target Aspect Ratio
                </Label>
                <div className="grid grid-cols-2 gap-2.5">
                  {ASPECT_RATIOS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedRatio(item)}
                      className={`p-3 rounded-xl border flex flex-col text-left transition-all relative ${
                        selectedRatio.id === item.id
                          ? "bg-cyan-500/10 border-cyan-500 text-white font-semibold"
                          : "bg-[#060608] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      <span className="text-lg mb-1">{item.icon}</span>
                      <span className="text-xs text-white">{item.name}</span>
                      <span className="text-[10px] text-zinc-500 block truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Crop Mode Selection */}
              <div>
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-3">
                  2. Resize & Crop Mode
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "blur", name: "Blurred Sidebands", icon: "✨" },
                    { id: "cover", name: "Center Crop", icon: "✂️" },
                    { id: "contain", name: "Letterbox (Black)", icon: "⬛" },
                    { id: "stretch", name: "Stretch", icon: "📐" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setCropMode(mode.id as CropMode)}
                      className={`p-2.5 rounded-xl border text-center text-xs transition-all flex items-center justify-center gap-2 ${
                        cropMode === mode.id
                          ? "bg-cyan-500/10 border-cyan-500 text-white font-semibold"
                          : "bg-[#060608] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      <span>{mode.icon}</span>
                      <span>{mode.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Export Quality Options */}
              <div>
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-2">
                  3. Export Quality
                </Label>
                <Select
                  value={exportQuality}
                  onValueChange={(val) => setExportQuality(val as ExportQuality)}
                >
                  <SelectTrigger className="w-full bg-[#060608] border-zinc-800 text-zinc-300 rounded-xl focus:ring-cyan-500/50">
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-zinc-800 text-zinc-300">
                    <SelectItem value="480p">480p SD - Fast Processing</SelectItem>
                    <SelectItem value="720p">720p HD - Recommended</SelectItem>
                    <SelectItem value="1080p">1080p Full HD - High Size</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>

            {/* Bottom Generate Action Button */}
            <div className="mt-8 pt-4 border-t border-zinc-800 flex flex-col gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                className="hidden"
              />
              {!videoPreviewUrl ? (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95"
                >
                  <UploadCloud className="w-4 h-4 mr-2" /> Upload Video
                </Button>
              ) : (
                <Button
                  onClick={handleExport}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center"
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Export Video
                </Button>
              )}
            </div>

          </div>

        </div>

        {/* --- SECTION 2: SEO & EXPLANATIONS (Below the fold) --- */}
        <div className="w-full py-10 flex flex-col gap-8 md:gap-12 mt-4 max-w-5xl mx-auto">
          
          {/* Features Grid */}
          <section className="p-6 md:p-10 rounded-[2rem] border border-zinc-800/50 bg-[#0e0e0e]/50 backdrop-blur-xl relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/5 blur-[100px] pointer-events-none z-0"></div>
            
            <div className="text-center mb-8 relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Modern Aspect Ratio <span className="text-cyan-400">Rescaler</span>
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                Resize and crop your videos client-side to adapt to TikTok, YouTube, Instagram, or widescreen formats. No uploads required, preserving 100% of your privacy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">✨</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Blurred Sidebands Mode</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Fits your landscape video inside portrait (9:16) containers by mirroring a scaled, blurred replica behind it. Extremely popular for professional social reels.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔒</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">100% Secure Client Processing</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Calculations are executed entirely inside your local browser using standard HTML5 Canvas and Web Audio contexts. Your video files are never dispatched to external servers.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🎶</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Audio Track Preservation</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Uses Web Audio API nodes to pull and link original sound feeds directly with canvas renders. The export procedure runs completely silently to prevent speakers noise.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🚀</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Adjustable Resolution Sizes</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Choose from 480p, 720p HD, and 1080p Full HD scales. Higher dimensions prioritize frame fidelity, while lower configurations accelerate processing.
                </p>
              </div>
            </div>
          </section>

          {/* Browser System limits warnings & requirements */}
          <section className="p-6 md:p-8 rounded-[2rem] border border-zinc-800/50 bg-[#0e0e0e]/50 backdrop-blur-xl">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Cpu className="text-cyan-400 w-5 h-5" /> Local Browser System Limits
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm mb-6 leading-relaxed">
              Because this tool records canvas frames live using standard browser capabilities, processing is dependent on local CPU speed and hardware memory. Read details below to prevent crashes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Memory constraints and length validations */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" /> Size & Length Allocations
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold text-white">Desktop Limits</span>
                      <span className="block text-[11px] text-zinc-500">Max 10 minutes duration and 150MB file size. Designed to ensure stable memory utilization.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold text-white">Mobile Limits</span>
                      <span className="block text-[11px] text-zinc-500">Max 3 minutes duration and 50MB file size. Stricter thresholds prevent WebKit/Blink engine sandboxed tab crashes.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold text-white">Real-Time Processing Speed</span>
                      <span className="block text-[11px] text-zinc-500">Export processing runs at 1x speed to sync sound tracks securely. A 30s video will take exactly 30s to export.</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Supported Tech specs */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" /> Supported Browser Specs
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Chrome Desktop</span>
                    <span className="block text-[10px] text-zinc-500">Full Support (V8 optimal speed)</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Safari Mac / iOS</span>
                    <span className="block text-[10px] text-zinc-500">Supported (via native MP4 fallback)</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Firefox Desktop</span>
                    <span className="block text-[10px] text-zinc-500">Supported (via VP8/VP9 webm codecs)</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Chrome Android</span>
                    <span className="block text-[10px] text-zinc-500">Supported (RAM-bound)</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

        </div>

      </div>

      {/* Export progress popup dialog modal */}
      <Dialog open={isExporting} onOpenChange={() => {}}>
        <DialogContent className="border-zinc-800 bg-[#0e0e0e] text-gray-200 max-w-md w-[95vw] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-xl font-bold">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              Adjusting Aspect Ratio...
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs mt-1">
              Processing frames locally. Please do not close or minimize this tab.
            </DialogDescription>
          </DialogHeader>

          {/* Progress content */}
          <div className="flex flex-col items-center justify-center py-6">
            
            {/* Visual Circular progress representation */}
            <div className="relative w-36 h-36 flex items-center justify-center mb-6">
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  className="stroke-zinc-800 fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  className="stroke-cyan-500 fill-none transition-all duration-300"
                  strokeWidth="8"
                  strokeDasharray={402}
                  strokeDashoffset={402 - (402 * progressPercentage) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white font-mono">{progressPercentage}%</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Progress</span>
              </div>
            </div>

            {/* Time counters */}
            <div className="w-full grid grid-cols-2 gap-4 bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl">
              <div className="text-center">
                <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Time Elapsed</span>
                <span className="text-sm font-bold text-white font-mono">{elapsedTime}s</span>
              </div>
              <div className="text-center">
                <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Estimated Left</span>
                <span className="text-sm font-bold text-white font-mono">{getRemainingTime()}</span>
              </div>
            </div>

            <div className="w-full flex items-center gap-2 mt-4 px-2 text-[10px] text-yellow-500/80 leading-normal">
              <span className="shrink-0 text-xs">⚠️</span>
              <span>Keep tab focused! Minimizing pauses HTML5 canvas rendering in background.</span>
            </div>

          </div>

          {/* Dialog Action buttons */}
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button
              variant="outline"
              onClick={cleanupExport}
              className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 text-xs h-9 rounded-lg"
            >
              Cancel Process
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </main>
  );
}
