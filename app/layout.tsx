import type { Metadata, Viewport } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import MobileNav from "./components/MobileNav"; // Import Mobile Nav
import CookieBanner from "./components/CookieBanner";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

// Viewport settings (separated from metadata in Next.js 14+)
export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// GOD-TIER SEO METADATA
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://aibazaars.store"),
  title: {
    default: "AI Bazaars | Run Free AI Models in Your Browser",
    template: "%s | AI Bazaars",
  },
  description: "The world's first purely in-browser marketplace for local AI models. Experience zero-latency, private, and free AI inference powered by ONNX and WebGPU.",
  keywords: [
    "AI", "ONNX", "Transformers.js", "WebAssembly", "WebGPU", 
    "Local AI", "Browser AI", "AI Marketplace", "Free LLM", 
    "Private AI", "Generative AI", "AI App Store"
  ],
  authors: [{ name: "Baroi AI", url: "https://aibazaars.store" }],
  creator: "Baroi AI",
  publisher: "Baroi AI",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aibazaars.store", 
    title: "AI Bazaars | Zero-Latency Browser AI",
    description: "Run LLMs, Vision, and Audio AI models entirely locally in your browser. 100% private and free.",
    siteName: "AI Bazaars",
    images: [
      {
        url: "/og-image.png", // Ensure you put an og-image.png in your public folder
        width: 1200,
        height: 630,
        alt: "AI Bazaars Preview Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Bazaars | In-Browser AI Models",
    description: "Run AI models locally in your browser with zero latency. 100% private.",
    creator: "@baroi_ai", // Update with your actual X handle
    images: ["/og-image.png"], 
  },
  icons: {
    icon: "/logos.png",
    shortcut: "/logos.png",
    apple: "/logos.png", 
  },
  manifest: "/site.webmanifest", // Optional: Add a manifest for PWA support
  formatDetection: {
    telephone: false, // Prevents mobile browsers from turning random numbers into blue links
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("scroll-smooth", "font-sans", geist.variable)}>
      <body className={`${inter.className} bg-[#0a0a0a] text-gray-100 antialiased overflow-x-hidden`}>
        {/* Main Page Content */}
        {children}

        {/* Global UI Overlays */}
        <CookieBanner />
        <MobileNav />
      </body>
    </html>
  );
}