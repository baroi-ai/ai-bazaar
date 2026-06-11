/// <reference lib="webworker" />

declare function importScripts(...urls: string[]): void;

// ✅ Load OpenCV from your public folder
const OPENCV_URL = "/js/opencv.js";

// Renamed from 'cv' to 'cvInstance' to prevent shadowing the global OpenCV variable!
let cvInstance: any = null;

// Foolproof helper to load OpenCV regardless of the WASM build format
function loadOpenCV() {
  if (cvInstance) return Promise.resolve();

  return new Promise((resolve, reject) => {
    // Timeout to prevent hanging forever if the file is missing
    const timeout = setTimeout(() => {
      reject(new Error("OpenCV load timed out. Check if /js/opencv.js exists."));
    }, 15000);

    try {
      // 1. Setup the WASM runtime callback BEFORE importing
      (self as any).Module = {
        onRuntimeInitialized: () => {
          clearTimeout(timeout);
          console.log("Worker: OpenCV Ready (WASM)");
          cvInstance = (self as any).cv;
          resolve(null);
        },
      };

      // 2. Fetch the script
      importScripts(self.location.origin + OPENCV_URL);

      const globalCv = (self as any).cv;

      // 3. Fallback 1: If it's a synchronous build
      if (globalCv && typeof globalCv.Mat === "function") {
        clearTimeout(timeout);
        console.log("Worker: OpenCV Ready (Sync)");
        cvInstance = globalCv;
        resolve(null);
      } 
      // 4. Fallback 2: If the build returns a Promise
      else if (globalCv instanceof Promise) {
        globalCv.then((resolved: any) => {
          clearTimeout(timeout);
          console.log("Worker: OpenCV Ready (Promise)");
          cvInstance = resolved;
          resolve(null);
        }).catch(reject);
      }
      // 5. Fallback 3: Emscripten Modularized Function
      else if (typeof globalCv === 'function') {
        globalCv().then((resolved: any) => {
          clearTimeout(timeout);
          console.log("Worker: OpenCV Ready (Function)");
          cvInstance = resolved;
          resolve(null);
        }).catch(reject);
      }

    } catch (e) {
      clearTimeout(timeout);
      console.error("Worker: Failed to load OpenCV. Ensure it is in public/js/opencv.js", e);
      reject(e);
    }
  });
}

self.onmessage = async (event: MessageEvent) => {
  const { action, imageBitmap, maskBitmap } = event.data;

  // --- 1. PRELOAD ---
  if (action === "preload") {
    try {
      await loadOpenCV();
      self.postMessage({ status: "ready" });
    } catch (e) {
      console.error(e);
      self.postMessage({ status: "error", error: "Failed to load OpenCV" });
    }
    return;
  }

  // --- 2. PROCESS ---
  if (action === "process") {
    try {
      if (!cvInstance) await loadOpenCV();

      // 1. Convert Bitmaps to OpenCV Matrices (RGBA format)
      const srcRgba = await bitmapToMat(imageBitmap);
      const maskRgba = await bitmapToMat(maskBitmap);

      // 2. Convert Source to RGB (OpenCV inpaint crashes on RGBA images)
      const srcRgb = new cvInstance.Mat();
      cvInstance.cvtColor(srcRgba, srcRgb, cvInstance.COLOR_RGBA2RGB);

      // 3. Prepare Mask (Extract the Alpha channel where the user drew)
      const maskGray = new cvInstance.Mat();
      const rgbaPlanes = new cvInstance.MatVector();
      cvInstance.split(maskRgba, rgbaPlanes);
      rgbaPlanes.get(3).copyTo(maskGray); // Get Alpha channel
      rgbaPlanes.delete();

      // Ensure the mask is strictly binary (Black and White)
      cvInstance.threshold(maskGray, maskGray, 10, 255, cvInstance.THRESH_BINARY);

      // 4. Run OpenCV Inpainting
      const dstRgb = new cvInstance.Mat();

      // USING INPAINT_NS (Navier-Stokes) for smoother, higher quality fills.
      cvInstance.inpaint(srcRgb, maskGray, dstRgb, 10, cvInstance.INPAINT_NS);

      // 5. Convert Result back to RGBA for Browser Canvas
      const dstRgba = new cvInstance.Mat();
      cvInstance.cvtColor(dstRgb, dstRgba, cvInstance.COLOR_RGB2RGBA);

      // Restore original alpha channel from the source image
      const finalPlanes = new cvInstance.MatVector();
      const originalPlanes = new cvInstance.MatVector();
      cvInstance.split(dstRgba, finalPlanes);
      cvInstance.split(srcRgba, originalPlanes);
      originalPlanes.get(3).copyTo(finalPlanes.get(3)); // Copy original alpha
      cvInstance.merge(finalPlanes, dstRgba);

      // 6. Export to ImageData
      const imgData = new ImageData(
        new Uint8ClampedArray(dstRgba.data),
        dstRgba.cols,
        dstRgba.rows,
      );

      // 7. Cleanup Memory (CRITICAL: Prevents browser tab from crashing)
      srcRgba.delete();
      maskRgba.delete();
      srcRgb.delete();
      maskGray.delete();
      dstRgb.delete();
      dstRgba.delete();
      finalPlanes.delete();
      originalPlanes.delete();

      // 8. Return to UI
      self.postMessage({ status: "done", result: imgData }, [
        imgData.data.buffer,
      ]);
    } catch (e: any) {
      let msg = e;
      if (typeof e === "number") {
        try {
          msg = cvInstance.exceptionFromPtr(e).msg;
        } catch (x) {}
      }
      console.error("OpenCV Error:", msg);
      self.postMessage({ status: "error", error: "Processing Failed" });
    }
  }
};

// --- HELPER: ImageBitmap to cvInstance.Mat ---
async function bitmapToMat(bitmap: ImageBitmap) {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  return cvInstance.matFromImageData(imageData);
}