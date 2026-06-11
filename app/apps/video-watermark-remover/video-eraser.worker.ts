/// <reference lib="webworker" />

import { WebDemuxer } from "web-demuxer";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";

declare function importScripts(...urls: string[]): void;

const OPENCV_URL = "/js/opencv.js";
let cv: any = null;

// Helper to load OpenCV (Modified for module workers if needed, but works best as classic)
function loadOpenCV() {
  if (cv) return Promise.resolve();
  return new Promise((resolve, reject) => {
    // @ts-ignore
    self.Module = {
      onRuntimeInitialized: () => {
        // @ts-ignore
        cv = self.cv;
        resolve(null);
      },
    };
    try {
      importScripts(self.location.origin + OPENCV_URL);
    } catch (e) {
      reject(e);
    }
  });
}

self.onmessage = async (e) => {
  const { file, maskBitmap } = e.data;
  const post = (cmd: string, data?: any) => self.postMessage({ cmd, data });

  try {
    post("progress", { text: "Loading OpenCV AI...", percent: 5 });
    await loadOpenCV();
    if (!cv) throw new Error("OpenCV failed to initialize.");

    post("progress", { text: "Probing video...", percent: 10 });
    const demuxer = new WebDemuxer({
      wasmFilePath:
        "https://cdn.jsdelivr.net/npm/web-demuxer@latest/dist/wasm-files/web-demuxer.wasm",
    });
    await demuxer.load(file);

    const mediaInfo = await demuxer.getMediaInfo();
    const videoTrack = mediaInfo.streams.find(
      (s: any) => s.codec_type_string === "video",
    );
    const audioTrack = mediaInfo.streams.find(
      (s: any) => s.codec_type_string === "audio",
    );

    if (!videoTrack) throw new Error("No video track found.");

    const videoDecoderConfig = await demuxer.getDecoderConfig("video");
    const audioConfig = audioTrack
      ? await demuxer.getDecoderConfig("audio")
      : null;

    const duration = videoTrack.duration;
    const w = videoTrack.width ?? videoDecoderConfig.codedWidth ?? 1920;
    const h = videoTrack.height ?? videoDecoderConfig.codedHeight ?? 1080;
    const fps = 30;

    // --- PREPARE THE MASK ---
    post("progress", { text: "Preparing Mask...", percent: 15 });
    const maskCanvas = new OffscreenCanvas(w, h);
    const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true })!;
    maskCtx.drawImage(maskBitmap, 0, 0, w, h);
    const maskImgData = maskCtx.getImageData(0, 0, w, h);

    const maskMatRgba = cv.matFromImageData(maskImgData);
    const binaryMask = new cv.Mat();
    const rgbaPlanes = new cv.MatVector();
    cv.split(maskMatRgba, rgbaPlanes);
    rgbaPlanes.get(3).copyTo(binaryMask); // Extract alpha channel
    cv.threshold(binaryMask, binaryMask, 10, 255, cv.THRESH_BINARY); // Convert to pure black/white

    maskMatRgba.delete();
    rgbaPlanes.delete();

    // --- SETUP MUXER ---
    const target = new ArrayBufferTarget();
    const muxerOptions: any = {
      target,
      video: { codec: "avc", width: w, height: h },
      firstTimestampBehavior: "offset",
      fastStart: "in-memory",
    };
    if (audioConfig) {
      muxerOptions.audio = {
        codec: "aac",
        numberOfChannels: audioConfig.numberOfChannels,
        sampleRate: audioConfig.sampleRate,
      };
    }
    const muxer = new Muxer(muxerOptions);

    // --- BUILD PIPELINE ---
    post("progress", {
      text: "Erasing watermark (this takes time)...",
      percent: 20,
    });

    let frameCount = 0;
    const frameCanvas = new OffscreenCanvas(w, h);
    const frameCtx = frameCanvas.getContext("2d", {
      willReadFrequently: true,
    })!;

    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => console.error("Encoder error:", e),
    });
    encoder.configure({
      codec: "avc1.4d0034",
      width: w,
      height: h,
      bitrate: 2.5e6 * ((w * h) / (1280 * 720)),
      framerate: fps,
    });

    const decoder = new VideoDecoder({
      output: async (frame) => {
        // 1. Draw frame to canvas
        frameCtx.drawImage(frame, 0, 0);
        const imgData = frameCtx.getImageData(0, 0, w, h);

        // 2. Convert to OpenCV
        const srcMat = cv.matFromImageData(imgData);
        const rgbMat = new cv.Mat();
        cv.cvtColor(srcMat, rgbMat, cv.COLOR_RGBA2RGB); // Inpaint requires RGB

        // 3. Erase Watermark! (TELEA is faster for video than NS)
        const dstMat = new cv.Mat();
        cv.inpaint(rgbMat, binaryMask, dstMat, 5, cv.INPAINT_TELEA);

        // 4. Convert back to Canvas ImageData
        const dstRgba = new cv.Mat();
        cv.cvtColor(dstMat, dstRgba, cv.COLOR_RGB2RGBA);

        const outImgData = new ImageData(
          new Uint8ClampedArray(dstRgba.data),
          w,
          h,
        );
        frameCtx.putImageData(outImgData, 0, 0);

        // 5. Encode Frame
        const cleanFrame = new VideoFrame(frameCanvas, {
          timestamp: frame.timestamp,
          duration: frame.duration ?? Math.round(1000000 / fps),
        });

        encoder.encode(cleanFrame, { keyFrame: frameCount % 60 === 0 });

        // Cleanup Memory
        cleanFrame.close();
        frame.close();
        srcMat.delete();
        rgbMat.delete();
        dstMat.delete();
        dstRgba.delete();

        frameCount++;
        if (frameCount % 5 === 0) {
          const percent =
            20 + Math.floor((frame.timestamp / 1000000 / duration) * 75);
          post("progress", { text: `Erasing frame ${frameCount}...`, percent });
        }
      },
      error: (e) => console.error("Decoder error:", e),
    });
    decoder.configure(videoDecoderConfig);

    // Feed Video
    const chunkStream = demuxer.read(
      "video",
      0,
    ) as ReadableStream<EncodedVideoChunk>;
    const reader = chunkStream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      while (decoder.decodeQueueSize >= 15 || encoder.encodeQueueSize >= 15) {
        await new Promise((r) => setTimeout(r, 10));
      }
      decoder.decode(value);
    }

    await decoder.flush();
    decoder.close();
    await encoder.flush();
    encoder.close();

    // Pass Audio
    if (audioConfig) {
      post("progress", { text: "Muxing Audio...", percent: 96 });
      const audioStream = demuxer.read(
        "audio",
        0,
      ) as ReadableStream<EncodedAudioChunk>;
      const audioReader = audioStream.getReader();
      while (true) {
        const { done, value } = await audioReader.read();
        if (done) break;
        if (value.timestamp >= 0) muxer.addAudioChunk(value);
      }
    }

    post("progress", { text: "Finalizing MP4...", percent: 99 });
    muxer.finalize();
    binaryMask.delete(); // Final cleanup

    post("success", target.buffer);
  } catch (error: any) {
    console.error(error);
    post("error", error.message || "Unknown error occurred.");
  }
};
