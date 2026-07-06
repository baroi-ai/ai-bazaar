import type { Metadata } from "next";
import PDFToExcelPage from "./page";

export const metadata: Metadata = {
  title: "PDF to Excel | Convert PDF to XLSX Online Free",
  description: "Convert PDF documents to Excel spreadsheets online for free. Extract tables and tabular layouts locally in your browser with 100% privacy.",
  keywords: [
    "pdf to excel", "pdf to xlsx", "convert pdf to excel", "extract table from pdf",
    "pdf table to xlsx", "free pdf to excel", "local pdf to excel", "private pdf to excel"
  ],
  openGraph: {
    title: "PDF to Excel | Convert PDF to XLSX Online Free",
    description: "Extract tables and tabular data from PDF files to Excel (.xlsx) spreadsheets locally. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/pdf-to-excel",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Excel | Convert PDF to XLSX Online Free",
    description: "Extract tables and tabular data from PDF files to Excel (.xlsx) spreadsheets locally. 100% private.",
  }
};

export default function PDFToExcelLayout() {
  return <PDFToExcelPage />;
}
