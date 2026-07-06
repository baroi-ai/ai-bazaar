import type { Metadata } from "next";
import PDFRearrangePage from "./page";

export const metadata: Metadata = {
  title: "Rearrange PDF Pages | Reorder PDF Pages Online Free & Private",
  description: "Rearrange PDF pages online for free. Reorder pages, duplicate sheets, delete specific pages, and combine them locally in your browser with 100% privacy.",
  keywords: [
    "rearrange pdf", "reorder pdf pages", "move pages in pdf",
    "duplicate pdf pages", "delete page from pdf", "pdf page organizer",
    "free pdf page order", "local pdf rearranger", "private pdf reorder"
  ],
  openGraph: {
    title: "Rearrange PDF Pages | Reorder PDF Pages Online Free & Private",
    description: "Reorder, duplicate, or delete pages from your PDF files locally in your browser. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/pdf-rearrange",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rearrange PDF Pages | Reorder PDF Pages Online Free & Private",
    description: "Reorder, duplicate, or delete pages from your PDF files locally in your browser. 100% private.",
  }
};

export default function PDFRearrangeLayout() {
  return <PDFRearrangePage />;
}
