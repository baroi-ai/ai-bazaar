import type { Metadata } from "next";
import PDFCompressPage from "./page";

export const metadata: Metadata = {
  title: "Compress PDF | Reduce PDF File Size Online Free",
  description: "Compress PDF files online for free. Reduce PDF document sizes locally in your browser with 100% privacy.",
  keywords: [
    "compress pdf", "reduce pdf size", "pdf compressor", "pdf size reducer",
    "free pdf compressor", "local pdf compressor", "private pdf size reducer"
  ],
  openGraph: {
    title: "Compress PDF | Reduce PDF File Size Online Free",
    description: "Reduce PDF document file sizes locally in your browser. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/pdf-compress",
  },
  twitter: {
    card: "summary_large_image",
    title: "Compress PDF | Reduce PDF File Size Online Free",
    description: "Reduce PDF document file sizes locally in your browser. 100% private.",
  }
};

export default function PDFCompressLayout() {
  return <PDFCompressPage />;
}
