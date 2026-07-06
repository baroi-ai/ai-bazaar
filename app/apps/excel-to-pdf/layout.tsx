import type { Metadata } from "next";
import ExcelToPDFPage from "./page";

export const metadata: Metadata = {
  title: "Excel to PDF | Convert XLSX & CSV to PDF Online Free",
  description: "Convert Excel spreadsheets (.xlsx, .csv) to PDF documents online for free. Process sheets locally in your browser with 100% privacy.",
  keywords: [
    "excel to pdf", "xlsx to pdf", "convert excel to pdf", "csv to pdf",
    "convert xlsx to pdf", "free excel to pdf", "local xlsx to pdf", "private excel to pdf"
  ],
  openGraph: {
    title: "Excel to PDF | Convert XLSX & CSV to PDF Online Free",
    description: "Convert Excel (.xlsx) and CSV sheets to clean PDF documents locally in your browser. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/excel-to-pdf",
  },
  twitter: {
    card: "summary_large_image",
    title: "Excel to PDF | Convert XLSX & CSV to PDF Online Free",
    description: "Convert Excel (.xlsx) and CSV sheets to clean PDF documents locally in your browser. 100% private.",
  }
};

export default function ExcelToPDFLayout() {
  return <ExcelToPDFPage />;
}
