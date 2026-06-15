// app/apps/media-to-text/env.ts

// This polyfill ensures process.env exists BEFORE transformers.js loads
if (typeof globalThis.process === 'undefined') {
  (globalThis as any).process = { env: {} };
} else if (typeof globalThis.process.env === 'undefined') {
  (globalThis as any).process.env = {};
}