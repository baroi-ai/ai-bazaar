import type { Metadata } from "next";
import PDFToImagePage from "./page";

export const metadata: Metadata = {
  title: "PDF to Image | Convert PDF to JPG & PNG Online Free",
  description: "Convert PDF pages to high-quality JPG or PNG images online for free. Process pages locally in your browser with 100% privacy.",
  keywords: [
    "pdf to image", "pdf to jpg", "pdf to png", "convert pdf to image",
    "pdf to jpeg", "free pdf to image", "local pdf to jpg", "private pdf to png"
  ],
  openGraph: {
    title: "PDF to Image | Convert PDF to JPG & PNG Online Free",
    description: "Convert your PDF pages to high-quality JPG or PNG images locally in your browser. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/pdf-to-image",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Image | Convert PDF to JPG & PNG Online Free",
    description: "Convert your PDF pages to high-quality JPG or PNG images locally in your browser. 100% private.",
  }
};

export default function PDFToImageLayout() {
  return <PDFToImagePage />;
}
