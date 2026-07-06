import type { Metadata } from "next";
import ImageSizeReducerPage from "./page";

export const metadata: Metadata = {
  title: "Free Image Size Reducer | Online, Local & Private",
  description: "Reduce image file sizes online. Resize dimensions, adjust compression quality, and convert images to JPG, PNG, WebP, or PDF formats locally in your browser with 100% privacy.",
  keywords: [
    "image size reducer", "compress image online", "resize image dimensions",
    "convert image to pdf", "convert png to jpg", "free photo resizer",
    "png size compressor", "webp converter", "private image editor"
  ],
  openGraph: {
    title: "Free Image Size Reducer | Online, Local & Private",
    description: "Resize, compress, and convert images locally in your browser. 100% private and free processing with support for PDF, JPG, PNG, and WebP.",
    type: "website",
    url: "https://aibazaars.store/apps/image-size-reducer",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Image Size Reducer | Online, Local & Private",
    description: "Resize, compress, and convert images locally in your browser. 100% private.",
  }
};

export default function ImageSizeReducerLayout() {
  return <ImageSizeReducerPage />;
}
