import type { Metadata, Viewport } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import MobileNav from "./components/MobileNav"; // Import Mobile Nav
import CookieBanner from "./components/CookieBanner";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner"; 
import { SpeedInsights } from '@vercel/speed-insights/next';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

// Viewport settings (separated from metadata in Next.js 14+)
export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  // REMOVED: maximumScale: 1 (This allows users to pinch-to-zoom for accessibility)
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
  // REMOVED: alternates: { canonical: "/" } (This lets Next.js handle canonical URLs per-page correctly)
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
      <head>
        {/* Umami Analytics Tracking Script */}
        <script 
          defer 
          src="https://cloud.umami.is/script.js" 
          data-website-id="b775028b-e753-4f70-89b1-705ca339fd7e"
        />
      </head>
      <body className={`${inter.className} bg-[#050508] text-gray-100 antialiased overflow-x-hidden`}>
        {/* Global Fixed Background (Spotlights & Dot Mesh) */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 dot-grid opacity-30"></div>
          <div className="absolute top-1/4 left-1/4 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-blue-600/10 rounded-full blur-[130px] animate-glow-1"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-sky-500/10 rounded-full blur-[110px] animate-glow-2"></div>
        </div>

        {/* Main Page Content */}
        <div className="relative z-10 min-h-screen flex flex-col bg-transparent">
          {children}
        </div>

        {/* Global UI Overlays */}
        <CookieBanner />
        <MobileNav />
        
        {/* 2. Add Toaster globally */}
        <Toaster position="top-right" theme="dark" richColors closeButton />
        <SpeedInsights />
      </body>
    </html>
  );
}