import type { Metadata } from "next";
import ImageToPDFPage from "./page";

export const metadata: Metadata = {
  title: "Image to PDF | Convert JPG & PNG to PDF Online Free",
  description: "Convert PNG, JPG, and WebP images to a single PDF document online. Reorder images and compile locally in your browser.",
  keywords: [
    "image to pdf", "jpg to pdf", "png to pdf", "convert image to pdf",
    "jpeg to pdf", "free image to pdf", "local jpg to pdf", "private png to pdf"
  ],
  openGraph: {
    title: "Image to PDF | Convert JPG & PNG to PDF Online Free",
    description: "Convert PNG, JPG, and WebP images to a single PDF document locally in your browser. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/image-to-pdf",
  },
  twitter: {
    card: "summary_large_image",
    title: "Image to PDF | Convert JPG & PNG to PDF Online Free",
    description: "Convert PNG, JPG, and WebP images to a single PDF document locally in your browser. 100% private.",
  }
};

export default function ImageToPDFLayout() {
  return <ImageToPDFPage />;
}
