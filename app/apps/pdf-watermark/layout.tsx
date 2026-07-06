import type { Metadata } from "next";
import PDFWatermarkPage from "./page";

export const metadata: Metadata = {
  title: "Watermark PDF | Add Text & Image Watermark to PDF Online",
  description: "Add text or image watermarks to PDF files online for free. Customize font, size, RGB color, opacity, scale, rotation, and alignment locally with 100% privacy.",
  keywords: [
    "watermark pdf", "add watermark to pdf", "pdf watermark online",
    "text watermark pdf", "image watermark pdf", "draft watermark pdf",
    "free pdf watermarker", "local pdf watermark", "private pdf watermark"
  ],
  openGraph: {
    title: "Watermark PDF | Add Text & Image Watermark to PDF Online",
    description: "Add text or image watermarks to your PDF documents locally in your browser. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/pdf-watermark",
  },
  twitter: {
    card: "summary_large_image",
    title: "Watermark PDF | Add Text & Image Watermark to PDF Online",
    description: "Add text or image watermarks to your PDF documents locally in your browser. 100% private.",
  }
};

export default function PDFWatermarkLayout() {
  return <PDFWatermarkPage />;
}
