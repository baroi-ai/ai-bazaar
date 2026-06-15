// components/ProtectedRoute.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PocketBase from "pocketbase";
import { Loader2 } from "lucide-react";

// Initialize PocketBase (Update URL for production)
const pb = new PocketBase("http://127.0.0.1:8090");

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check if the auth token exists and is valid
    if (!pb.authStore.isValid) {
      router.push("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  // Prevent UI flickering by showing a loading state while the check happens
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}