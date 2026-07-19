"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  Settings2,
  Cpu,
  HardDrive,
  Globe,
  CheckCircle2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  FileVideo,
  Zap,
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
interface FormatOption {
  id: string;
  name: string;
  mime: string;
  extension: string;
}

type ExportQuality = "480p" | "720p" | "1080p" | "source";

const FORMAT_OPTIONS: FormatOption[] = [
  { id: "webm_vp9", name: "WebM (VP9 Codec)", mime: "video/webm;codecs=vp9,opus", extension: "webm" },
  { id: "webm_vp8", name: "WebM (VP8 Codec)", mime: "video/webm;codecs=vp8,opus", extension: "webm" },
  { id: "webm_default", name: "WebM (Default)", mime: "video/webm", extension: "webm" },
  { id: "mp4_h264_aac", name: "MP4 (H.264 / AAC)", mime: "video/mp4;codecs=h264,aac", extension: "mp4" },
  { id: "mp4_h264", name: "MP4 (H.264)", mime: "video/mp4;codecs=h264", extension: "mp4" },
  { id: "mp4_default", name: "MP4 (Default)", mime: "video/mp4", extension: "mp4" },
  { id: "mkv_default", name: "MKV (Matroska)", mime: "video/x-matroska", extension: "mkv" },
];

export default function VideoConverterPage() {
  // --- States ---
  const [sourceVideoFile, setSourceVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Converter Settings
  const [supportedFormats, setSupportedFormats] = useState<FormatOption[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<FormatOption | null>(null);
  const [videoBitrate, setVideoBitrate] = useState<number>(2000); // in Kbps
  const [audioBitrate, setAudioBitrate] = useState<number>(128); // in Kbps
  const [resolutionScale, setResolutionScale] = useState<number>(100); // percentage (100, 75, 50, 25)

  // Export States
  const [isExporting, setIsExporting] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const hiddenValidatorRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const processVideoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const exportTimerRef = useRef<any>(null);

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

  // --- Check Codec Support & Set Defaults ---
  useEffect(() => {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return;

    const supported = FORMAT_OPTIONS.filter(f => MediaRecorder.isTypeSupported(f.mime));
    setSupportedFormats(supported);

    if (supported.length > 0) {
      setSelectedFormat(supported[0]);
    }
  }, []);

  // --- Cleanup Object URLs ---
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  // --- Playback Sync Helper for Controls ---
  const togglePlay = () => {
    const video = previewVideoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(() => { });
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const video = previewVideoRef.current;
    if (!video) return;

    video.muted = !isMuted;
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

  // --- Estimates ---
  const getEstimatedSize = () => {
    if (!videoDuration) return 0;
    // (bitrate in Kbps * duration in seconds) / 8 = size in KB
    const totalBitrate = videoBitrate + audioBitrate;
    const estBytes = (totalBitrate * 1000 * videoDuration) / 8;
    return estBytes;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getCompressionRatio = () => {
    if (!sourceVideoFile) return 0;
    const est = getEstimatedSize();
    const ratio = (est / sourceVideoFile.size) * 100;
    return Math.max(0, 100 - ratio);
  };

  const getBitrateLabel = (val: number) => {
    if (val < 500) return "Ultra Compact (High Compression)";
    if (val < 1500) return "Low (Compact / Mobile)";
    if (val < 3000) return "Medium (Balanced)";
    if (val < 5000) return "High (Standard HD)";
    return "Maximum (Pristine)";
  };

  // --- Export Logic ---
  const handleExport = async () => {
    if (!sourceVideoFile || !videoPreviewUrl || !selectedFormat) return;

    // Pause preview video
    if (previewVideoRef.current) previewVideoRef.current.pause();
    setIsPlaying(false);

    // Initialize States
    setIsExporting(true);
    setProgressPercentage(0);
    setElapsedTime(0);

    // Calculate dimensions
    const scale = resolutionScale / 100;
    let exportWidth = Math.round(videoDimensions.width * scale);
    let exportHeight = Math.round(videoDimensions.height * scale);

    // Force dimensions to be even numbers
    exportWidth = exportWidth % 2 === 0 ? exportWidth : exportWidth - 1;
    exportHeight = exportHeight % 2 === 0 ? exportHeight : exportHeight - 1;

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
    processVideo.muted = false; // Must be false to extract audio

    let audioCtx: AudioContext | null = null;
    let audioDestNode: MediaStreamAudioDestinationNode | null = null;
    let audioSourceNode: MediaElementAudioSourceNode | null = null;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioCtxClass();
      audioSourceNode = audioCtx.createMediaElementSource(processVideo);
      audioDestNode = audioCtx.createMediaStreamDestination();

      // Connect to recording destination node
      audioSourceNode.connect(audioDestNode);
    } catch (err) {
      console.warn("Audio extraction not fully supported. Proceeding as video-only.", err);
    }

    // Capture Canvas Stream at 30fps
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

    const options = {
      mimeType: selectedFormat.mime,
      videoBitsPerSecond: videoBitrate * 1000,
      audioBitsPerSecond: audioBitrate * 1000,
    };

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(combinedStream, options);
    } catch (e) {
      // Fallback
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

      // Draw resized video frame directly to Canvas
      ctx.drawImage(processVideo, 0, 0, exportWidth, exportHeight);

      // Track progress
      const current = processVideo.currentTime;
      const duration = processVideo.duration || videoDuration;
      if (duration > 0) {
        const pct = Math.min(99, Math.round((current / duration) * 100));
        setProgressPercentage(pct);
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    mediaRecorder.onstop = () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (exportTimerRef.current) clearInterval(exportTimerRef.current);
      if (audioCtx) audioCtx.close();

      if (recordedChunks.length === 0) {
        toast.error("Encoding failed: No media frames captured.");
        setIsExporting(false);
        return;
      }

      const fileExtension = selectedFormat.extension;
      const blob = new Blob(recordedChunks, { type: selectedFormat.mime });
      const url = URL.createObjectURL(blob);

      // Download
      const link = document.createElement("a");
      link.href = url;
      link.download = `converted-${sourceVideoFile.name.split(".")[0]}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Video converted successfully!");
      setIsExporting(false);
      setProgressPercentage(100);
    };

    processVideo.addEventListener("play", () => {
      mediaRecorder.start();
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    });

    processVideo.addEventListener("ended", () => {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    });

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
    <main className="min-h-screen text-gray-100 font-sans flex flex-col">
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
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12 min-h-[50vh] md:min-h-[65vh]">

          {/* LEFT: Video Preview Area (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] flex flex-col relative overflow-hidden shadow-2xl p-4 md:p-6 justify-center items-center">

            {/* Empty Upload State */}
            {!videoPreviewUrl ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-xl py-12 md:py-20 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${isDragOver
                  ? "border-cyan-500 bg-cyan-500/5 scale-[1.02]"
                  : "border-zinc-800 bg-[#0a0a0a] hover:border-zinc-700 hover:bg-[#0c0c0f]"
                  }`}
              >
                <UploadCloud className="h-16 w-16 mb-6 text-zinc-600 animate-pulse" />
                <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">Video Converter & Compressor</h1>
                <p className="text-zinc-400 max-w-md mb-6 text-sm leading-relaxed px-4">
                  Drag and drop your video here, or click to browse. Convert formats and compress files locally.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> 100% In-Browser Transcoding
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-xs font-medium">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Max size: {isMobile ? "50MB" : "150MB"}
                  </div>
                </div>
              </div>
            ) : (
              /* Loaded Video Preview State */
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <div className="relative w-full max-h-[60vh] flex items-center justify-center flex-grow p-2">
                  <video
                    ref={previewVideoRef}
                    src={videoPreviewUrl}
                    className="max-h-[55vh] max-w-full rounded-xl border border-zinc-800 shadow-2xl bg-[#060608]"
                    controls={false}
                    playsInline
                    loop
                  />

                  {/* Absolute Delete overlay button */}
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={clearVideo}
                    className="absolute -top-1 -right-1 h-8 w-8 rounded-full shadow-lg bg-red-600 hover:bg-red-500 z-30 transition-transform active:scale-90"
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
                    Dimensions: {videoDimensions.width ? `${videoDimensions.width}x${videoDimensions.height}` : "--"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Control Board (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-[#0e0e0e] border border-zinc-800/80 rounded-2xl md:rounded-[2rem] p-5 md:p-6 flex flex-col shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Settings2 className="w-5 h-5 text-cyan-400" /> Transcode & Compress Panel
            </h2>

            {/* Inputs & Actions */}
            <div className="space-y-6 flex-grow">

              {/* Output Format Select */}
              <div>
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-2">
                  1. Target Output Format
                </Label>
                <Select
                  value={selectedFormat?.id || ""}
                  onValueChange={(val) => {
                    const found = supportedFormats.find(f => f.id === val);
                    if (found) setSelectedFormat(found);
                  }}
                  disabled={supportedFormats.length === 0}
                >
                  <SelectTrigger className="w-full bg-[#060608] border-zinc-800 text-zinc-300 rounded-xl focus:ring-cyan-500/50">
                    <SelectValue placeholder="Detecting supported formats..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-zinc-800 text-zinc-300">
                    {supportedFormats.map(fmt => (
                      <SelectItem key={fmt.id} value={fmt.id}>
                        {fmt.name} (.{fmt.extension})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {supportedFormats.length === 0 && (
                  <span className="text-[10px] text-red-400 mt-1 block">
                    No browser-supported export formats were detected.
                  </span>
                )}
              </div>

              {/* Video Bitrate Slider (Compression) */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    2. Video Bitrate
                  </Label>
                  <span className="text-cyan-400 font-mono text-xs font-bold">
                    {videoBitrate} Kbps
                  </span>
                </div>
                <Slider
                  min={200}
                  max={8000}
                  step={100}
                  value={[videoBitrate]}
                  onValueChange={(val) => setVideoBitrate(val[0])}
                  className="py-2"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  {getBitrateLabel(videoBitrate)}
                </span>
              </div>

              {/* Resolution Scaling Selector */}
              <div>
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-2.5">
                  3. Resolution Scale
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "100% (Original)", value: 100 },
                    { label: "75%", value: 75 },
                    { label: "50% (Compact)", value: 50 },
                    { label: "25% (Smallest)", value: 25 },
                  ].map((res) => (
                    <button
                      key={res.value}
                      onClick={() => setResolutionScale(res.value)}
                      className={`p-2.5 rounded-xl border text-center text-xs transition-all flex flex-col items-center justify-center ${resolutionScale === res.value
                        ? "bg-cyan-500/10 border-cyan-500 text-white font-semibold"
                        : "bg-[#060608] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                        }`}
                    >
                      <span className="text-[10px]">{res.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Bitrate Selector */}
              <div>
                <Label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block mb-2">
                  4. Audio Quality
                </Label>
                <Select
                  value={audioBitrate.toString()}
                  onValueChange={(val) => setAudioBitrate(parseInt(val))}
                >
                  <SelectTrigger className="w-full bg-[#060608] border-zinc-800 text-zinc-300 rounded-xl focus:ring-cyan-500/50">
                    <SelectValue placeholder="Select audio quality" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-zinc-800 text-zinc-300">
                    <SelectItem value="64">64 Kbps - High Compression</SelectItem>
                    <SelectItem value="128">128 Kbps - Recommended Standard</SelectItem>
                    <SelectItem value="192">192 Kbps - High Fidelity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic Size Estimation Card */}
              {sourceVideoFile && (
                <div className="bg-[#060608] border border-zinc-800/80 rounded-xl p-3.5 space-y-2 mt-4 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Original File Size:</span>
                    <span className="text-xs font-bold text-white font-mono">{formatSize(sourceVideoFile.size)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                      Estimated Output Size: <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-500 rounded px-1">est.</span>
                    </span>
                    <span className="text-xs font-bold text-cyan-400 font-mono">{formatSize(getEstimatedSize())}</span>
                  </div>

                  {getCompressionRatio() > 0 ? (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-2 rounded-lg flex items-center justify-between text-[11px] text-emerald-400 font-medium">
                      <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Compression savings</span>
                      <span className="font-bold">~{getCompressionRatio().toFixed(0)}% smaller</span>
                    </div>
                  ) : (
                    <div className="bg-yellow-500/5 border border-yellow-500/10 p-2 rounded-lg flex items-center justify-between text-[11px] text-yellow-500 font-medium">
                      <span>Bitrate settings exceed original size</span>
                      <span>Increase compression</span>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Bottom Transcode Action Button */}
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
                  disabled={!selectedFormat}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold h-12 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Convert & Compress
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
                Client-Side Video <span className="text-cyan-400">Transcoder & Compressor</span>
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                Convert formats and compress video files securely inside your browser. Adjust dimensions and bitrates to shrink files for email, chat, or web publishing instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 relative z-10">
              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🔁</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Multi-Format Transcoding</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Export videos in MP4, WebM, or MKV containers depending on browser support. Convert unoptimized camera footage into web-native formats easily.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🗜️</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Smart File Compression</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Reduce file sizes by up to 90% by lowering bitrates or scaling resolution dimensions down to 50% or 25% for fast web and messaging uploads.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">🛡️</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Zero Network Uploads</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Unlike traditional online converters that upload huge media files to their cloud servers, all processing is done inside your local memory. 100% private.
                </p>
              </div>

              <div className="bg-[#0a0a0a]/60 border border-zinc-800/80 p-5 rounded-2xl hover:border-cyan-500/20 transition">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-lg mb-4">⚡</div>
                <h3 className="text-sm md:text-base font-bold text-white mb-2">Real-Time Size Estimator</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Calculate target file sizes dynamically as you adjust bitrate sliders. Know your exact compression savings before committing to an export.
                </p>
              </div>
            </div>
          </section>

          {/* System Requirements & Browser Compatibility */}
          <section className="p-6 md:p-8 rounded-[2rem] border border-zinc-800/50 bg-[#0e0e0e]/50 backdrop-blur-xl">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Cpu className="text-cyan-400 w-5 h-5" /> Local System Requirements
            </h2>
            <p className="text-zinc-400 text-xs md:text-sm mb-6 leading-relaxed">
              Because this tool runs canvas-based rendering and audio-mixing locally, support varies across browsers and hardware configurations.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Size limits & length limitations check */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" /> Size & Length Limits
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold text-white">Desktop Limits</span>
                      <span className="block text-[11px] text-zinc-500">Max 10 minutes length and 150MB file size. Prevents tab crash by keeping browser memory footprint low.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-semibold text-white">Mobile Limits</span>
                      <span className="block text-[11px] text-zinc-500">Max 3 minutes length and 50MB file size. Tailored for mobile sandboxed tab memory budgets.</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Browser support compatibility check */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" /> Codec Compatibility
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Chrome Desktop</span>
                    <span className="block text-[10px] text-zinc-500">Full WebM (VP9/VP8) & MP4 (H264) Support</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Safari Mac / iOS</span>
                    <span className="block text-[10px] text-zinc-500">MP4 (H264/AAC) Support</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Firefox Desktop</span>
                    <span className="block text-[10px] text-zinc-500">WebM (VP8/VP9) Support</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                    <span className="block text-xs font-bold text-white">Chrome Android</span>
                    <span className="block text-[10px] text-zinc-500">Supported (VP8/WebM default)</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

        </div>

      </div>

      {/* Export progress dialog */}
      <Dialog open={isExporting} onOpenChange={() => { }}>
        <DialogContent className="border-zinc-800 bg-[#0e0e0e] text-gray-200 max-w-md w-[95vw] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-xl font-bold">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              Transcoding & Compressing...
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs mt-1">
              Processing frames locally. Please do not close or minimize this tab.
            </DialogDescription>
          </DialogHeader>

          {/* Progress content */}
          <div className="flex flex-col items-center justify-center py-6">

            {/* Visual Circular progress */}
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