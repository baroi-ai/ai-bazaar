import type { Metadata } from "next";
import TextToPDFPage from "./page";

export const metadata: Metadata = {
  title: "Text to PDF | Convert Text & TXT to PDF Online Free",
  description: "Convert plain text or TXT files to PDF online. Customize font sizing, margins, and page layouts locally and privately.",
  keywords: [
    "text to pdf", "txt to pdf", "convert text to pdf", "plain text to pdf",
    "convert txt to pdf", "free text to pdf", "local text to pdf", "private txt to pdf"
  ],
  openGraph: {
    title: "Text to PDF | Convert Text & TXT to PDF Online Free",
    description: "Convert plain text or TXT files to PDF documents locally in your browser. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/text-to-pdf",
  },
  twitter: {
    card: "summary_large_image",
    title: "Text to PDF | Convert Text & TXT to PDF Online Free",
    description: "Convert plain text or TXT files to PDF documents locally in your browser. 100% private.",
  }
};

export default function TextToPDFLayout() {
  return <TextToPDFPage />;
}
