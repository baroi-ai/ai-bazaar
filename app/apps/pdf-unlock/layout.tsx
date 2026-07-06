import type { Metadata } from "next";
import PDFUnlockPage from "./page";

export const metadata: Metadata = {
  title: "Unlock PDF | Remove PDF Password Online Free & Private",
  description: "Unlock password-protected PDF documents online for free. Remove PDF password locks locally in your browser with 100% privacy.",
  keywords: [
    "unlock pdf", "remove pdf password", "pdf unlocker", "pdf decrypt",
    "remove pdf password online", "free pdf unlocker", "local pdf decrypt", "private pdf unlock"
  ],
  openGraph: {
    title: "Unlock PDF | Remove PDF Password Online Free & Private",
    description: "Decrypt and remove password restrictions from your PDF documents locally in your browser. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/pdf-unlock",
  },
  twitter: {
    card: "summary_large_image",
    title: "Unlock PDF | Remove PDF Password Online Free & Private",
    description: "Decrypt and remove password restrictions from your PDF documents locally in your browser. 100% private.",
  }
};

export default function PDFUnlockLayout() {
  return <PDFUnlockPage />;
}
