import type { Metadata } from "next";
import VideoRatioChangerPage from "./page"

export const metadata: Metadata = {
  title: "Free Video Aspect Ratio Changer | Local & Private",
  description: "Change video aspect ratio (16:9, 9:16, 1:1, 4:5, 4:3, 21:9) online in your browser. crop, letterbox, or add blurred background with 100% private client-side processing.",
  keywords: [
    "video aspect ratio changer", "resize video online", "change video format",
    "vertical video maker", "instagram crop video", "tiktok video resizer",
    "free video crop tool", "letterbox video maker", "blurred background video"
  ],
  openGraph: {
    title: "Free Video Aspect Ratio Changer | Local & Private",
    description: "Crop, resize, and change aspect ratios of your videos locally in your browser. 100% private and free.",
    type: "website",
    url: "https://aibazaars.store/apps/video-ratio-changer",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Video Aspect Ratio Changer | Local & Private",
    description: "Crop, resize, and change aspect ratios of your videos locally in your browser. 100% private.",
  }
};

export default function VideoRatioChangerLayout() {
  return <VideoRatioChangerPage />;
}
