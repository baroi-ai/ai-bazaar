import type { Metadata } from "next";
import PDFToWordPage from "./page";

export const metadata: Metadata = {
  title: "PDF to Word | Convert PDF to DOCX Online Free",
  description: "Convert PDF documents to Microsoft Word DOCX files online for free. Extract layout text contents locally in your browser with 100% privacy.",
  keywords: [
    "pdf to word", "pdf to docx", "convert pdf to word", "pdf to doc",
    "convert pdf to docx", "free pdf to word", "local pdf to docx", "private pdf to word"
  ],
  openGraph: {
    title: "PDF to Word | Convert PDF to DOCX Online Free",
    description: "Extract text layouts from PDF files to editable Microsoft Word (.docx) documents. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/pdf-to-word",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Word | Convert PDF to DOCX Online Free",
    description: "Extract text layouts from PDF files to editable Microsoft Word (.docx) documents. 100% private.",
  }
};

export default function PDFToWordLayout() {
  return <PDFToWordPage />;
}
