import type { Metadata } from "next";
import PDFRotatePage from "./page";

export const metadata: Metadata = {
  title: "Rotate PDF | Rotate PDF Pages Online Free & Private",
  description: "Rotate PDF pages online for free. Rotate individual pages or all pages clockwise or counter-clockwise locally in your browser with 100% privacy.",
  keywords: [
    "rotate pdf", "rotate pdf pages", "spin pdf online",
    "turn pdf pages", "clockwise rotate pdf", "counter clockwise pdf",
    "free pdf rotator", "local pdf rotation", "private pdf rotation"
  ],
  openGraph: {
    title: "Rotate PDF | Rotate PDF Pages Online Free & Private",
    description: "Rotate individual pages or all pages of your PDF document locally in your browser. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/pdf-rotate",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rotate PDF | Rotate PDF Pages Online Free & Private",
    description: "Rotate individual pages or all pages of your PDF document locally in your browser. 100% private.",
  }
};

export default function PDFRotateLayout() {
  return <PDFRotatePage />;
}
