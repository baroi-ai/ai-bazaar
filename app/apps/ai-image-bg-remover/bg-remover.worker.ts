/// <reference lib="webworker" />

// Static import required to prevent Next.js Turbopack chunking network errors
import { pipeline, env, AutoModel, AutoProcessor, RawImage } from "@huggingface/transformers";

// @ts-ignore
delete globalThis.SharedArrayBuffer;
// @ts-ignore
self.SharedArrayBuffer = undefined;

// Configure environment
env.allowLocalModels = false;
try {
  env.useBrowserCache = typeof caches !== "undefined";
} catch (e) {
  console.warn("Cache API disabled.");
  env.useBrowserCache = false;
}

// Memory caches
let modnetPipeline: any = null;
let briaModel: any = null;
let briaProcessor: any = null;

self.onmessage = async (event: MessageEvent) => {
  const { action, imageBlob, modelName } = event.data;

  if (action === "process" || imageBlob) {
    try {
      const blob = imageBlob || event.data.imageBlob;
      const targetModel = modelName || "briaai/RMBG-1.4";

      self.postMessage({
        status: "progress",
        key: "Loading AI Engine...",
        percent: 10,
      });

      // --- BRANCH 1: FAST MOBILE MODEL (MODNET) ---
      if (targetModel === "Xenova/modnet") {
        if (!modnetPipeline) {
          modnetPipeline = await pipeline("image-segmentation", targetModel, {
            device: "wasm",
            progress_callback: (data: any) => {
              if (data.status === "progress") {
                self.postMessage({
                  status: "progress",
                  key: "Downloading Fast Model...",
                  percent: Math.round(data.progress || 0),
                });
              }
            },
          });
        }

        self.postMessage({ status: "progress", key: "Analyzing...", percent: 50 });
        const image = await RawImage.fromBlob(blob);
        const output = await modnetPipeline(image);

        self.postMessage({ status: "progress", key: "Compositing...", percent: 80 });
        const mask = Array.isArray(output) ? output[0].mask : output.mask || output;

        const canvas = new OffscreenCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d")!;
        const originalBitmap = await createImageBitmap(blob);
        
        ctx.drawImage(originalBitmap, 0, 0);
        const pixelData = ctx.getImageData(0, 0, image.width, image.height);

        for (let i = 0; i < mask.data.length; i++) {
          pixelData.data[i * 4 + 3] = mask.data[i];
        }
        ctx.putImageData(pixelData, 0, 0);
        
        const resultBlob = await canvas.convertToBlob({ type: "image/png" });
        self.postMessage({ status: "success", blob: resultBlob });
        
        originalBitmap.close();
      }

      // --- BRANCH 2: HIGH QUALITY DESKTOP MODEL (BRIA AI) ---
      else if (targetModel === "briaai/RMBG-1.4") {
        if (!briaModel) {
          briaModel = await AutoModel.from_pretrained(targetModel, {
            device: "wasm",
            progress_callback: (data: any) => {
              if (data.status === "progress") {
                self.postMessage({
                  status: "progress",
                  key: "Downloading HD Model...",
                  percent: Math.round(data.progress || 0),
                });
              }
            },
          });
          briaProcessor = await AutoProcessor.from_pretrained(targetModel);
        }

        self.postMessage({ status: "progress", key: "Analyzing...", percent: 50 });
        const image = await RawImage.fromBlob(blob);
        const inputs = await briaProcessor(image);

        const results = await briaModel({ input: inputs.pixel_values });

        self.postMessage({ status: "progress", key: "Compositing...", percent: 80 });
        const outTensor = Object.values(results)[0] as any;
        const outData = outTensor.data;
        const maskW = outTensor.dims[3];
        const maskH = outTensor.dims[2];

        const maskPixels = new Uint8ClampedArray(maskW * maskH * 4);
        for (let i = 0; i < outData.length; i++) {
          const val = Math.max(0, Math.min(255, Math.round(outData[i] * 255)));
          maskPixels[i * 4 + 0] = val;
          maskPixels[i * 4 + 1] = val;
          maskPixels[i * 4 + 2] = val;
          maskPixels[i * 4 + 3] = 255; 
        }

        const maskCanvas = new OffscreenCanvas(maskW, maskH);
        maskCanvas.getContext("2d")!.putImageData(new ImageData(maskPixels, maskW, maskH), 0, 0);

        const originalBitmap = await createImageBitmap(blob);
        const origW = originalBitmap.width;
        const origH = originalBitmap.height;

        const resizedMaskCanvas = new OffscreenCanvas(origW, origH);
        const resizedCtx = resizedMaskCanvas.getContext("2d")!;
        resizedCtx.drawImage(maskCanvas, 0, 0, origW, origH);
        const resizedMaskData = resizedCtx.getImageData(0, 0, origW, origH);

        const finalCanvas = new OffscreenCanvas(origW, origH);
        const finalCtx = finalCanvas.getContext("2d")!;
        finalCtx.drawImage(originalBitmap, 0, 0);
        const pixelData = finalCtx.getImageData(0, 0, origW, origH);

        for (let i = 0; i < pixelData.data.length / 4; i++) {
          pixelData.data[i * 4 + 3] = resizedMaskData.data[i * 4 + 0];
        }

        finalCtx.putImageData(pixelData, 0, 0);
        const resultBlob = await finalCanvas.convertToBlob({ type: "image/png" });
        
        self.postMessage({ status: "success", blob: resultBlob });

        originalBitmap.close();
      }
    } catch (e: any) {
      console.error("Processing Error:", e);
      self.postMessage({ status: "error", error: e.message || String(e) });
    }
  }
};