/// <reference lib="webworker" />

// 1. MUST IMPORT THIS FIRST to polyfill Turbopack's missing environment
import "./env"; 

// 2. Now safe to import Transformers
import { pipeline, env } from "@huggingface/transformers";

// 3. Configuration
env.allowLocalModels = false;

// 🚨 TEMPORARY OVERRIDE: Force cache OFF to flush the corrupted model from your browser
env.useBrowserCache = false;

class TranscriptionSingleton {
  static instance: any = null;
  static model_id = "Xenova/whisper-tiny"; 

  static async getInstance(progressCallback: any) {
    if (!this.instance) {
      this.instance = await pipeline("automatic-speech-recognition", this.model_id, {
        device: "wasm", 
        // ✅ FORCE full 32-bit precision. This completely bypasses the broken ONNX 8-bit quantization nodes!
        dtype: "fp32", 
        progress_callback: (data: any) => {
          // 📡 Status Updates
          if (data.status === "progress") {
            const p = data.progress ? Math.round(data.progress) : 0;
            progressCallback({ 
                status: "downloading", 
                message: data.file === 'config.json' ? 'Checking Cache...' : `Downloading AI Model...`, 
                percent: p 
            });
          }
          if (data.status === "done") {
             progressCallback({ status: "downloading", message: "Model Ready!", percent: 100 });
          }
        },
      });
    }
    return this.instance;
  }
}

self.onmessage = async (event: MessageEvent) => {
  const { audio } = event.data;

  try {
    // Immediately tell the frontend the worker is alive
    self.postMessage({ status: "downloading", message: "Starting AI Engine...", percent: 0 });

    // 1. Load Model (with visual feedback)
    const transcriber = await TranscriptionSingleton.getInstance((msg: any) => {
      self.postMessage(msg);
    });

    // 2. Start Processing
    self.postMessage({ status: "processing", message: "Transcribing Audio..." });

    const output = await transcriber(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: "english",
      task: "transcribe",
      return_timestamps: true,
    });

    // 3. Success
    self.postMessage({ status: "success", result: output });

  } catch (e: any) {
    console.error("Worker Error:", e);
    
    let errorMsg = e.message || String(e);
    if (errorMsg.includes("Cache")) {
        errorMsg = "Storage Full or Private Mode. Cannot save model.";
    }

    self.postMessage({ status: "error", error: errorMsg });
  }
};