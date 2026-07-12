import type { Metadata } from "next";
import ImageUpscalerClient from "./upscaler-client";

// GOD-TIER SEO METADATA
export const metadata: Metadata = {
  title: "AI Image Upscaler | 4K Ultra-Sharp Enhancement",
  description: "Enhance image quality, clear noise, and reconstruct natural textures up to ultra-sharp 4K resolution using advanced deep learning neural networks.",
  keywords: [
    "AI Image Upscaler", "Topaz Upscaler", "Deepshark Upscaler", 
    "4K Image Enhancer", "Super Resolution AI", "Enhance Photo Quality",
    "Image Detail Recovery"
  ],
  openGraph: {
    type: "website",
    url: "https://aibazaars.store/apps/image-upscaler", 
    title: "AI Image Upscaler | 4K Ultra-Sharp Enhancement",
    description: "Enhance image quality, clear noise, and reconstruct natural textures up to ultra-sharp 4K resolution using advanced deep learning neural networks.",
    siteName: "AI Bazaars",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AI Image Upscaler Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Image Upscaler | 4K Image Enhancer",
    description: "Enhance image quality, clear noise, and reconstruct natural textures up to ultra-sharp 4K resolution.",
    images: ["/og-image.png"], 
  },
};

export default function ImageUpscalerPage() {
  return <ImageUpscalerClient />;
}