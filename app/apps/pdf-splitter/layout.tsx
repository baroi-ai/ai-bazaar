import type { Metadata } from "next";
import PDFSplitterPage from "./page";

export const metadata: Metadata = {
  title: "PDF Splitter | Split PDF Files Online (Free & Private)",
  description: "Combine PDF files online for free. PDF Splitter works 100% locally in your browser, allowing you to extract specific pages, split page ranges, and save files privately.",
  keywords: [
    "pdf splitter", "split pdf", "extract pdf pages", "split pdf online",
    "free pdf splitter", "separate pdf pages", "pdf range splitter",
    "pdf page extractor", "private pdf splitter", "split pdf by ranges"
  ],
  openGraph: {
    title: "PDF Splitter | Split PDF Files Online (Free & Private)",
    description: "Extract specific pages or split your PDF documents into ranges locally in your browser. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/pdf-splitter",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF Splitter | Split PDF Files Online (Free & Private)",
    description: "Extract pages or split your PDF documents into ranges locally in your browser. 100% private and free.",
  }
};

export default function PDFSplitterLayout() {
  return <PDFSplitterPage />;
}
