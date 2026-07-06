import type { Metadata } from "next";
import VideoConverterPage from "./page"

export const metadata: Metadata = {
  title: "Free Video Format Converter & Compressor | Local & Private",
  description: "Convert video formats (MP4, WebM, MKV) and compress file sizes online. Adjust video bitrates, audio tracks, and resolutions locally inside your browser with 100% privacy.",
  keywords: [
    "video format converter", "video compressor online", "mp4 to webm",
    "webm to mp4", "compress video file size", "reduce video size online",
    "free video transcoder", "private video compressor", "local video resizer"
  ],
  openGraph: {
    title: "Free Video Format Converter & Compressor | Local & Private",
    description: "Convert and compress your videos locally in your browser. Adjust bitrates and formats with 100% private and free processing.",
    type: "website",
    url: "https://aibazaars.store/apps/video-converter-compressor",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Video Format Converter & Compressor | Local & Private",
    description: "Convert and compress your videos locally in your browser. 100% private.",
  }
};

export default function VideoConverterLayout() {
  return <VideoConverterPage />;
}
