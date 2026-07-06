import type { Metadata } from "next";
import PDFLockPage from "./page";

export const metadata: Metadata = {
  title: "Lock PDF | Password Protect PDF Online Free & Private",
  description: "Lock PDF files online for free. Add password protection and encrypt your PDF documents locally in your browser with 100% privacy.",
  keywords: [
    "lock pdf", "password protect pdf", "encrypt pdf", "pdf lock online",
    "pdf password online", "free pdf locker", "local pdf encrypt", "private pdf lock"
  ],
  openGraph: {
    title: "Lock PDF | Password Protect PDF Online Free & Private",
    description: "Encrypt and password-protect your PDF documents locally in your browser. 100% private and free processing with zero cloud uploads.",
    type: "website",
    url: "https://aibazaars.store/apps/pdf-lock",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lock PDF | Password Protect PDF Online Free & Private",
    description: "Encrypt and password-protect your PDF documents locally in your browser. 100% private.",
  }
};

export default function PDFLockLayout() {
  return <PDFLockPage />;
}
