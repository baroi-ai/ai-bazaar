import type { Metadata } from "next";
import PDFSignaturePage from "./page";

export const metadata: Metadata = {
  title: "PDF Signer | Sign PDF Online Free & Privately",
  description: "Sign PDF files online for free. Draw your signature, type your name in cursive fonts, or upload an image signature to sign PDF pages privately.",
  keywords: [
    "sign pdf", "pdf signer", "electronic signature pdf",
    "add signature to pdf", "free pdf signer", "local pdf sign",
    "private pdf signature", "e-sign pdf online", "sign document online"
  ],
  openGraph: {
    title: "PDF Signer | Sign PDF Online Free & Privately",
    description: "Draw, type, or upload your signature and e-sign your PDF documents locally in your browser. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/pdf-signature",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF Signer | Sign PDF Online Free & Privately",
    description: "Draw, type, or upload your signature and e-sign your PDF documents locally in your browser. 100% private.",
  }
};

export default function PDFSignatureLayout() {
  return <PDFSignaturePage />;
}
