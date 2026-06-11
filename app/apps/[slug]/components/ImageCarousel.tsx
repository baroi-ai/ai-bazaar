"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ImageCarousel({ screenshots, appName }: { screenshots: string[], appName: string }) {
  const carouselRef = useRef<HTMLDivElement>(null);
  
  // Track scroll position state
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Check if we are at the beginning or the end
  const checkScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 5); // 5px buffer
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 5);
    }
  };

  // Run check on mount and when resizing
  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [screenshots]);

  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const clientWidth = carouselRef.current.clientWidth;
      carouselRef.current.scrollBy({
        left: direction === "left" ? -clientWidth : clientWidth,
        behavior: "smooth",
      });
    }
  };

  if (!screenshots || screenshots.length === 0) return null;

  return (
    <section className="w-full">
      <h2 className="text-2xl font-bold text-white mb-6">Screenshots</h2>
      
      {/* 1. Main visual container with landscape aspect ratio */}
      <div className="relative w-full group rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden bg-[#0a0a0a]">
        
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-black text-white p-3 rounded-full transition-all duration-300 items-center justify-center backdrop-blur-sm shadow-xl ${
            canScrollLeft ? "opacity-0 group-hover:opacity-100 hidden md:flex" : "opacity-0 hidden pointer-events-none"
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Carousel Container */}
        <div
          ref={carouselRef}
          onScroll={checkScroll} 
          className="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {screenshots.map((url, index) => (
            <div key={index} className="min-w-full snap-center relative aspect-video flex-shrink-0 overflow-hidden flex items-center justify-center">
              
              {/* 2. Blurred Background (Fills space for 9:16 vertical images, invisible for 16:9 images) */}
              <Image
                src={url}
                alt=""
                fill
                className="object-cover opacity-30 blur-2xl scale-110 pointer-events-none"
                unoptimized
              />
              
              {/* 3. Main Foreground Image (Uses object-contain to support ANY aspect ratio without cropping) */}
              <Image
                src={url}
                alt={`${appName} Screenshot ${index + 1}`}
                fill
                className="object-contain p-2 md:p-4 z-10"
                priority={index === 0}
                unoptimized
              />
              
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-black text-white p-3 rounded-full transition-all duration-300 items-center justify-center backdrop-blur-sm shadow-xl ${
            canScrollRight ? "opacity-0 group-hover:opacity-100 hidden md:flex" : "opacity-0 hidden pointer-events-none"
          }`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
}