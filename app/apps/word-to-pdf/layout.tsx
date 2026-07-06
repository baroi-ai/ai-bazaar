import type { Metadata } from "next";
import WordToPDFPage from "./page";

export const metadata: Metadata = {
  title: "Word to PDF | Convert DOCX to PDF Online Free",
  description: "Convert Word documents (.docx) to PDF online for free. Process pages locally in your browser with 100% privacy.",
  keywords: [
    "word to pdf", "docx to pdf", "convert docx to pdf", "doc to pdf",
    "convert word to pdf", "free docx to pdf", "local docx to pdf", "private word to pdf"
  ],
  openGraph: {
    title: "Word to PDF | Convert DOCX to PDF Online Free",
    description: "Convert Word (.docx) files to clean PDF documents locally in your browser. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/word-to-pdf",
  },
  twitter: {
    card: "summary_large_image",
    title: "Word to PDF | Convert DOCX to PDF Online Free",
    description: "Convert Word (.docx) files to clean PDF documents locally in your browser. 100% private.",
  }
};

export default function WordToPDFLayout() {
  return <WordToPDFPage />;
}
