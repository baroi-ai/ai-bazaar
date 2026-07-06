import type { Metadata } from "next";
import PDFMergerPage from "./page";

export const metadata: Metadata = {
  title: "PDF Merger | Merge PDF Files Online (Free & Private)",
  description: "Combine PDF files online for free. PDF Merger works 100% locally in your browser, allowing you to merge PDF documents, reorder files, and bind pages privately.",
  keywords: [
    "pdf merger", "merge pdf", "combine pdf", "merge pdf online",
    "pdf joiner", "merge pdf files", "combine pdf files",
    "free pdf merger", "private pdf merger", "pdf binder"
  ],
  openGraph: {
    title: "PDF Merger | Merge PDF Files Online (Free & Private)",
    description: "Combine PDF files online for free. PDF Merger works 100% locally in your browser, allowing you to merge PDF documents, reorder files, and bind pages privately.",
    type: "website",
    url: "https://aibazaars.store/apps/pdf-merger",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF Merger | Merge PDF Files Online (Free & Private)",
    description: "Combine PDF files online for free. PDF Merger works 100% locally in your browser.",
  }
};

export default function PDFMergerLayout() {
  return <PDFMergerPage />;
}
