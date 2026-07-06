import type { Metadata } from "next";
import PDFToTextPage from "./page";

export const metadata: Metadata = {
  title: "PDF to Text | Extract Text from PDF Online Free",
  description: "Extract plain text from PDF documents online for free. Read and copy text contents locally in your browser with 100% privacy.",
  keywords: [
    "pdf to text", "extract text from pdf", "pdf text extractor", "pdf text reader",
    "pdf to txt", "free pdf to text", "local pdf text extractor", "private pdf to text"
  ],
  openGraph: {
    title: "PDF to Text | Extract Text from PDF Online Free",
    description: "Extract plain text from PDF documents locally in your browser. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/pdf-to-text",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Text | Extract Text from PDF Online Free",
    description: "Extract plain text from PDF documents locally in your browser. 100% private.",
  }
};

export default function PDFToTextLayout() {
  return <PDFToTextPage />;
}
