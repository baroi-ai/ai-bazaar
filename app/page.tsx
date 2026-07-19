"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import PocketBase from "pocketbase";

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";

// Initialize PocketBase
export const pb = new PocketBase(POCKETBASE_URL);


// Helper function to assign sleek, dark-mode friendly colors to different badge types
const getBadgeStyles = (badge: string) => {
  const b = badge?.toLowerCase() || "";
  if (b === "free") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (b === "premium") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (b === "featured") return "bg-sky-500/10 text-sky-400 border-sky-500/20";
  if (b === "trending") return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  if (b === "new arrival") return "bg-violet-500/10 text-violet-400 border-violet-500/20";
  return "bg-black/60 text-white border-white/10"; // Fallback default
};

export default function Home() {
  // Data States
  const [carouselSlides, setCarouselSlides] = useState<any[]>([]);
  const [topCharts, setTopCharts] = useState<any[]>([]);
  const [latestModels, setLatestModels] = useState<any[]>([]);
  const [premiumApps, setPremiumApps] = useState<any[]>([]);
  const [localApps, setLocalApps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Refs & Carousel States
  const carouselRef = useRef<HTMLDivElement>(null);
  const topChartsRef = useRef<HTMLDivElement>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [topChartsIndex, setTopChartsIndex] = useState(0);

  // --- POCKETBASE DATA FETCHING ---
  useEffect(() => {
    async function fetchApps() {
      try {
        const formatApp = (record: any) => ({
          id: record.id,
          slug: record.slug || record.id, // Extract slug with a fallback to ID
          name: record.Name,
          title: record.Name,
          category: record.category?.[0] || "AI Model",
          size: record.size,
          coin: record.coin,
          type: record.type,
          iconUrl: pb.files.getURL(record, record.icon),
          badge: record.badge || "",
          description: record.shortDescription || "Experience powerful AI capabilities.",
          buttonText: record.is_free ? "Run Locally" : "Use Cloud Compute",
        });

        const formatCarousel = (record: any) => ({
          id: record.id,
          title: record.title,
          description: record.description,
          buttonText: record.buttonText,
          badge: record.badge || "",
          link: record.link || "/apps",
          iconUrl: pb.files.getURL(record, record.icon),
          bgImageUrl: pb.files.getURL(record, record.bg_image),
        });

        // Fetch all in parallel to avoid sequential network request waterfalls
        const [
          carouselRes,
          latestRes,
          premiumRes,
          localRes,
          topAppsRes
        ] = await Promise.all([
          pb.collection("carousel").getList(1, 5, { sort: "-created", requestKey: null }),
          pb.collection("apps").getList(1, 9, { sort: "-updated,-created", requestKey: null }),
          pb.collection("apps").getList(1, 9, { filter: "is_free=false", sort: "-updated,-created", requestKey: null }),
          pb.collection("apps").getList(1, 9, { filter: "type='local'", sort: "-updated,-created", requestKey: null }),
          pb.collection("top_apps").getList(1, 12, { expand: "relation", requestKey: null })
        ]);

        setCarouselSlides(carouselRes.items.map(formatCarousel));
        setLatestModels(latestRes.items.map(formatApp));
        setPremiumApps(premiumRes.items.map(formatApp));
        setLocalApps(localRes.items.map(formatApp));

        const formattedTopApps = topAppsRes.items.flatMap((item) =>
          item.expand?.relation ? [formatApp(item.expand.relation)] : []
        );
        setTopCharts(formattedTopApps);

      } catch (error: any) {
        if (!error.isAbort) {
          console.error("Error fetching data from PocketBase:", error);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchApps();
  }, []);

  // --- CAROUSEL LOGIC ---
  useEffect(() => {
    if (isLoading || carouselSlides.length === 0) return;
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          carouselRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          carouselRef.current.scrollBy({ left: clientWidth, behavior: "smooth" });
        }
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [isLoading, carouselSlides]);

  useEffect(() => {
    if (isLoading || topCharts.length === 0) return;
    const interval = setInterval(() => {
      if (topChartsRef.current && window.innerWidth < 768) {
        const { scrollLeft, scrollWidth, clientWidth } = topChartsRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          topChartsRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          topChartsRef.current.scrollBy({ left: clientWidth, behavior: "smooth" });
        }
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [isLoading, topCharts]);

  const handleHeroScroll = () => {
    if (carouselRef.current) {
      const scrollPosition = carouselRef.current.scrollLeft;
      const width = carouselRef.current.clientWidth;
      const currentIndex = Math.round(scrollPosition / width);
      setActiveIndex(currentIndex);
    }
  };

  const handleTopChartsScroll = () => {
    if (topChartsRef.current) {
      const scrollPosition = topChartsRef.current.scrollLeft;
      const childWidth = topChartsRef.current.firstElementChild?.clientWidth || topChartsRef.current.clientWidth;
      const currentIndex = Math.round(scrollPosition / childWidth);
      setTopChartsIndex(currentIndex);
    }
  };

  const scrollToSlide = (index: number) => {
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: index * carouselRef.current.clientWidth, behavior: "smooth" });
    }
  };

  const scrollPrev = () => {
    const newIndex = activeIndex === 0 ? carouselSlides.length - 1 : activeIndex - 1;
    scrollToSlide(newIndex);
  };

  const scrollNext = () => {
    const newIndex = activeIndex === carouselSlides.length - 1 ? 0 : activeIndex + 1;
    scrollToSlide(newIndex);
  };

  // Calculate how many dot indicators we need (since Top Charts are grouped by 3 rows)
  const topChartColumns = Math.ceil(topCharts.length / 3);

  // --- RENDER ---
  return (
    <main className="min-h-screen bg-transparent text-gray-100 font-sans">
      <Navbar />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {/* DYNAMIC AUTO-SCROLLING HERO CAROUSEL */}
        {isLoading ? (
          <div className="w-full h-[250px] md:h-[300px] rounded-2xl bg-zinc-900/10 border border-zinc-800/60 animate-pulse mb-12 flex flex-col justify-end p-6 md:p-12 relative overflow-hidden">
            <div className="space-y-4 max-w-xl relative z-10">
              <div className="h-8 bg-zinc-800/60 rounded w-3/4"></div>
              <div className="h-4 bg-zinc-800/40 rounded w-5/6"></div>
              <div className="h-10 bg-zinc-800/50 rounded w-1/3 mt-4"></div>
            </div>
            <div className="absolute top-6 right-6 md:right-12 w-16 h-16 md:w-24 md:h-24 bg-zinc-800/30 rounded-2xl border border-zinc-700/50"></div>
          </div>
        ) : carouselSlides.length > 0 ? (
          <section className="mb-12 relative group">
            {/* FIX: Added aria-label to previous button */}
            <button aria-label="Previous slide" onClick={scrollPrev} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/10 rounded-full items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>

            {/* FIX: Added aria-label to next button */}
            <button aria-label="Next slide" onClick={scrollNext} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/10 rounded-full items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>

            <div ref={carouselRef} onScroll={handleHeroScroll} className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-6 pb-4">
              {carouselSlides.map((item) => (
                <div key={item.id} style={{ backgroundImage: `url(${item.bgImageUrl})` }} className="snap-center shrink-0 w-[90vw] md:w-full h-[250px] md:h-[300px] bg-cover bg-center rounded-2xl px-6 pt-6 pb-14 md:p-12 md:pb-16 flex flex-col justify-end text-white shadow-xl border border-gray-800 relative overflow-hidden group/card cursor-pointer">
                  {/* Added a subtle gradient overlay to ensure text is always readable over bright backgrounds */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-[#0a0a0a]/30 pointer-events-none z-0"></div>

                  {item.badge ? (
                    <div className={`absolute top-6 left-6 md:left-12 z-10 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] md:text-xs font-semibold border uppercase tracking-wider ${getBadgeStyles(item.badge)}`}>
                      {item.badge}
                    </div>
                  ) : null}

                  <div className="absolute top-6 right-6 md:right-12 z-10 w-16 h-16 md:w-24 md:h-24 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center p-3 md:p-4">
                    <img src={item.iconUrl} alt={`${item.title} icon`} className="w-full h-full object-contain drop-shadow-lg" />
                  </div>

                  <div className="relative z-10">
                    <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-3 w-4/5 drop-shadow-md truncate">{item.title}</h2>
                    <p className="text-white/90 mb-4 md:mb-6 text-xs md:text-base max-w-xl drop-shadow line-clamp-2 md:line-clamp-none">{item.description}</p>
                    <Link href={item.link}>
                      <button className="bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-gray-900 font-bold px-5 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base w-fit hover:bg-gray-200 hover:scale-105 active:scale-95 transition-all shadow-lg">
                        {item.buttonText}
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute bottom-8 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2">
              {carouselSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollToSlide(index)}
                  className={`transition-all duration-300 rounded-full ${activeIndex === index ? "bg-sky-500 w-6 h-2" : "bg-white/40 hover:bg-white/70 w-2 h-2"}`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* TOP CHARTS */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-white">Top charts</h2>
            {!isLoading && (
              <Link href="/apps" className="text-sky-500 font-medium hover:text-sky-400 text-sm transition">
                See all
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="animate-pulse flex items-center p-2 rounded-xl bg-[#0e0e0e]/50 border border-zinc-800/40">
                  <span className="w-6 h-4 bg-zinc-800/60 rounded"></span>
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#0e0e0e] border border-zinc-900 flex-shrink-0 ml-2 p-2 relative z-0 flex items-center justify-center">
                    <div className="w-full h-full bg-zinc-800/40 rounded-lg"></div>
                  </div>
                  <div className="ml-3 md:ml-4 flex-grow space-y-2">
                    <div className="h-4 bg-zinc-800/60 rounded w-2/3"></div>
                    <div className="h-3 bg-zinc-800/40 rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : topCharts.length > 0 ? (
            <>
              <div ref={topChartsRef} onScroll={handleTopChartsScroll} className="grid grid-rows-3 grid-flow-col md:grid-rows-none md:grid-flow-row md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none hide-scrollbar pb-2 md:pb-0 scroll-smooth">
                {topCharts.map((app, index) => (
                  <Link key={app.id} href={`/apps/${app.slug}`} className="flex items-center group cursor-pointer p-2 rounded-xl hover:bg-zinc-800/50 border border-transparent hover:border-zinc-800 transition w-[85vw] sm:w-[350px] md:w-auto shrink-0 snap-center md:snap-align-none">
                    {/* FIX: Changed text-zinc-500 to text-zinc-400 */}
                    <span className="text-zinc-400 w-6 text-sm font-medium text-center">{index + 1}</span>

                    <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#0e0e0e] border border-zinc-800 flex items-center justify-center shadow-sm overflow-hidden ml-2 p-2.5 md:p-3 shrink-0">

                      <img src={app.iconUrl} alt={`${app.name} logo`} className="w-full h-full object-contain relative z-0" />
                    </div>

                    <div className="ml-3 md:ml-4 flex-grow min-w-0">
                      <h3 className="text-sm md:text-base font-medium text-gray-100 leading-tight group-hover:text-sky-400 transition truncate">{app.name}</h3>
                      <p className="text-xs md:text-sm text-zinc-400 truncate capitalize">{app.category}</p>
                      {/* FIX: Changed text-zinc-500 to text-zinc-400 */}
                      <span className="text-[10px] md:text-xs text-zinc-400 font-mono mt-1">
                        {app.size?.toLowerCase() === "cloud" || app.type?.toLowerCase() === "cloud" ? (
                          <span className="flex items-center gap-0.5">
                            {/* FIX: Changed text-zinc-500 to text-zinc-400 */}
                            <svg className="w-3 h-3 md:w-[14px] md:h-[14px] text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-2.5-8.5h5m-5 4h5" />
                            </svg>
                            {app.coin || 0}
                          </span>
                        ) : (
                          app.size
                        )}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination Dots for Top Charts on Mobile */}
              <div className="md:hidden flex items-center justify-center space-x-1.5 mt-4">
                {Array.from({ length: topChartColumns }).map((_, index) => (
                  <span
                    key={index}
                    className={`transition-all duration-300 rounded-full h-1.5 ${topChartsIndex === index ? "bg-sky-500 w-4" : "bg-zinc-700 w-1.5"
                      }`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </section>

        {/* LATEST APPS */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-white">Latest Apps</h2>
            {!isLoading && (
              <Link href="/apps" className="text-sky-500 font-medium hover:text-sky-400 text-sm transition">
                See all
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-row overflow-x-auto gap-4 md:gap-6 pb-6 hide-scrollbar">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="w-[28vw] sm:w-32 md:w-36 flex flex-col shrink-0 animate-pulse">
                  <div className="w-full aspect-square rounded-2xl md:rounded-3xl bg-zinc-900/10 border border-zinc-800/40"></div>
                  <div className="h-3 bg-zinc-800/60 rounded mt-3 w-3/4"></div>
                  <div className="h-2.5 bg-zinc-800/40 rounded mt-1.5 w-1/2"></div>
                </div>
              ))}
            </div>
          ) : latestModels.length > 0 ? (
            <div className="flex flex-row overflow-x-auto gap-4 md:gap-6 pb-6 hide-scrollbar snap-x snap-mandatory">
              {latestModels.map((app) => (
                <Link key={app.id} href={`/apps/${app.slug}`} className="w-[28vw] sm:w-32 md:w-36 flex flex-col group cursor-pointer shrink-0 snap-start">
                  <div className="relative w-full aspect-square rounded-2xl md:rounded-3xl bg-[#0e0e0e] border border-zinc-800 flex items-center justify-center shadow-sm group-hover:border-sky-500/50 transition mb-2 md:mb-3 overflow-hidden p-3.5 md:p-6">
                    {app.badge ? (
                      <span className={`absolute top-2 right-2 backdrop-blur-md text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider z-10 ${getBadgeStyles(app.badge)}`}>
                        {app.badge}
                      </span>
                    ) : null}
                    <img src={app.iconUrl} alt={`${app.name} logo`} className="w-full h-full object-contain drop-shadow-md relative z-0" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-100 line-clamp-2 leading-tight group-hover:text-sky-400 transition" title={app.name}>{app.name}</h3>
                  {/* FIX: Changed text-zinc-500 to text-zinc-400 */}
                  <span className="text-[9px] md:text-xs text-zinc-400 font-mono mt-1">
                    {app.size?.toLowerCase() === "cloud" || app.type?.toLowerCase() === "cloud" ? (
                      <span className="flex items-center gap-0.5">
                        {/* FIX: Changed text-zinc-500 to text-zinc-400 */}
                        <svg className="w-3 h-3 md:w-[14px] md:h-[14px] text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-2.5-8.5h5m-5 4h5" />
                        </svg>
                        {app.coin || 0}
                      </span>
                    ) : (
                      app.size
                    )}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        {/* Premium APPS */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-white">Premium Apps</h2>
            {!isLoading && (
              <Link href="/apps" className="text-sky-500 font-medium hover:text-sky-400 text-sm transition">
                See all
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-row overflow-x-auto gap-4 md:gap-6 pb-6 hide-scrollbar">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="w-[28vw] sm:w-32 md:w-36 flex flex-col shrink-0 animate-pulse">
                  <div className="w-full aspect-square rounded-2xl md:rounded-3xl bg-zinc-900/10 border border-zinc-800/40"></div>
                  <div className="h-3 bg-zinc-800/60 rounded mt-3 w-3/4"></div>
                  <div className="h-2.5 bg-zinc-800/40 rounded mt-1.5 w-1/2"></div>
                </div>
              ))}
            </div>
          ) : premiumApps.length > 0 ? (
            <div className="flex flex-row overflow-x-auto gap-4 md:gap-6 pb-6 hide-scrollbar snap-x snap-mandatory">
              {premiumApps.map((app) => (
                <Link key={app.id} href={`/apps/${app.slug}`} className="w-[28vw] sm:w-32 md:w-36 flex flex-col group cursor-pointer shrink-0 snap-start">
                  <div className="relative w-full aspect-square rounded-2xl md:rounded-3xl bg-[#0e0e0e] border border-zinc-800 flex items-center justify-center shadow-sm group-hover:border-sky-500/50 transition mb-2 md:mb-3 overflow-hidden p-3.5 md:p-6">
                    {app.badge ? (
                      <span className={`absolute top-2 right-2 backdrop-blur-md text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider z-10 ${getBadgeStyles(app.badge)}`}>
                        {app.badge}
                      </span>
                    ) : null}
                    <img src={app.iconUrl} alt={`${app.name} logo`} className="w-full h-full object-contain drop-shadow-md relative z-0" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-100 line-clamp-2 leading-tight group-hover:text-sky-400 transition" title={app.name}>{app.name}</h3>
                  {/* FIX: Changed text-zinc-500 to text-zinc-400 */}
                  <span className="text-[9px] md:text-xs text-zinc-400 font-mono mt-1">
                    {app.size?.toLowerCase() === "cloud" || app.type?.toLowerCase() === "cloud" ? (
                      <span className="flex items-center gap-0.5">
                        {/* FIX: Changed text-zinc-500 to text-zinc-400 */}
                        <svg className="w-3 h-3 md:w-[14px] md:h-[14px] text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-2.5-8.5h5m-5 4h5" />
                        </svg>
                        {app.coin || 0}
                      </span>
                    ) : (
                      app.size
                    )}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        {/* LOCAL APPS */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-white">Local Apps</h2>
            {!isLoading && (
              <Link href="/apps" className="text-sky-500 font-medium hover:text-sky-400 text-sm transition">
                See all
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-row overflow-x-auto gap-4 md:gap-6 pb-6 hide-scrollbar">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="w-[28vw] sm:w-32 md:w-36 flex flex-col shrink-0 animate-pulse">
                  <div className="w-full aspect-square rounded-2xl md:rounded-3xl bg-zinc-900/10 border border-zinc-800/40"></div>
                  <div className="h-3 bg-zinc-800/60 rounded mt-3 w-3/4"></div>
                  <div className="h-2.5 bg-zinc-800/40 rounded mt-1.5 w-1/2"></div>
                </div>
              ))}
            </div>
          ) : localApps.length > 0 ? (
            <div className="flex flex-row overflow-x-auto gap-4 md:gap-6 pb-6 hide-scrollbar snap-x snap-mandatory">
              {localApps.map((app) => (
                <Link key={app.id} href={`/apps/${app.slug}`} className="w-[28vw] sm:w-32 md:w-36 flex flex-col group cursor-pointer shrink-0 snap-start">
                  <div className="relative w-full aspect-square rounded-2xl md:rounded-3xl bg-[#0e0e0e] border border-zinc-800 flex items-center justify-center shadow-sm group-hover:border-sky-500/50 transition mb-2 md:mb-3 overflow-hidden p-3.5 md:p-6">
                    {app.badge ? (
                      <span className={`absolute top-2 right-2 backdrop-blur-md text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider z-10 ${getBadgeStyles(app.badge)}`}>
                        {app.badge}
                      </span>
                    ) : null}
                    <img src={app.iconUrl} alt={`${app.name} logo`} className="w-full h-full object-contain drop-shadow-md relative z-0" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-100 line-clamp-2 leading-tight group-hover:text-sky-400 transition" title={app.name}>{app.name}</h3>
                  {/* FIX: Changed text-zinc-500 to text-zinc-400 */}
                  <span className="text-[9px] md:text-xs text-zinc-400 font-mono mt-1">
                    {app.size?.toLowerCase() === "cloud" || app.type?.toLowerCase() === "cloud" ? (
                      <span className="flex items-center gap-0.5">
                        {/* FIX: Changed text-zinc-500 to text-zinc-400 */}
                        <svg className="w-3 h-3 md:w-[14px] md:h-[14px] text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-2.5-8.5h5m-5 4h5" />
                        </svg>
                        {app.coin || 0}
                      </span>
                    ) : (
                      app.size
                    )}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        {/* 4-CARD BENTO SEO SECTION */}
        <section className="mb-12 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-900/10 blur-[120px] pointer-events-none z-0"></div>

          <div className="text-center mb-10 md:mb-12 relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              One‑Click Install Local AI & <span className="text-sky-400">Open Source Apps</span>
            </h2>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto">
              Use free browser tools, scale with premium AI models, or run open-source apps directly on your local compute from GitHub in just one click.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 relative z-10">
            {/* 1. One Click Install */}
            <div className="bg-[#0e0e0e]/50 border border-zinc-800/80 p-6 md:p-8 rounded-2xl md:rounded-3xl hover:border-sky-500/30 transition duration-300 group flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-700 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm">🖱️</div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                One-Click Install
              </h3>
              <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                Skip the complex setups and Python environments. Install and launch AI apps instantly from your browser.
              </p>
            </div>

            {/* 2. Free & Local */}
            <div className="bg-[#0e0e0e]/50 border border-zinc-800/80 p-6 md:p-8 rounded-2xl md:rounded-3xl hover:border-emerald-500/30 transition duration-300 group flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-700 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm">⚡</div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-2 flex items-center gap-2 justify-center">
                <span>Free & Local</span>
              </h3>
              <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                100% private AI that runs securely on your device's hardware. Enjoy zero-latency generation.
              </p>
            </div>

            {/* 3. Make & Create */}
            <div className="bg-[#0e0e0e]/50 border border-zinc-800/80 p-6 md:p-8 rounded-2xl md:rounded-3xl hover:border-violet-500/30 transition duration-300 group flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-700 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm">🎨</div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                Make & Create
              </h3>
              <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                Generate stunning images, write code, or transcribe audio effortlessly. Build creative workflows faster.
              </p>
            </div>

            {/* 4. Pay-Per-Use Cloud */}
            <div className="bg-[#0e0e0e]/50 border border-zinc-800/80 p-6 md:p-8 rounded-2xl md:rounded-3xl hover:border-amber-500/30 transition duration-300 group flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-700 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm">☁️</div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-2 flex items-center gap-2 justify-center">
                <span>Premium Cloud</span>
              </h3>
              <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                Need massive 70B+ LLMs? Offload heavy compute tasks to our GPU clusters and pay coins only for what you use.
              </p>
            </div>
          </div>
        </section>

      </div>

      <Footer />

      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  );
}