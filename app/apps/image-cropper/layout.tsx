import type { Metadata } from "next";
import ImageCropperPage from "./page";

export const metadata: Metadata = {
  title: "Free Image Cropper & Corner Rounder | Online & Private",
  description: "Crop images and round borders online for free. Adjust crop dimensions, lock aspect ratios, and choose corner radius rounding. Export to JPG, PNG, WebP, or PDF format locally with 100% privacy.",
  keywords: [
    "image cropper", "crop image online", "round image corners",
    "circle image maker", "convert cropped to pdf", "resize crop box",
    "free image crop tool", "png cropper", "private image cropper"
  ],
  openGraph: {
    title: "Free Image Cropper & Corner Rounder | Online & Private",
    description: "Crop and apply corner rounding to your images locally in your browser. 100% private and free processing with support for PDF, JPG, PNG, and WebP.",
    type: "website",
    url: "https://aibazaars.store/apps/image-cropper",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Image Cropper & Corner Rounder | Online & Private",
    description: "Crop and apply corner rounding to your images locally in your browser. 100% private.",
  }
};

export default function ImageCropperLayout() {
  return <ImageCropperPage />;
}
