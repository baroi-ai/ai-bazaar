'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PocketBase from 'pocketbase';

// Initialize PocketBase
const pb = new PocketBase("http://127.0.0.1:8090");

const COMPUTE_TYPES = ["All", "Local", "Cloud"];
const PRICING_TYPES = ["All", "Free", "Paid"];
const PLATFORM_TYPES = ["All", "Web", "Windows", "Mac OS", "Linux", "Android", "IOS"];
const SORT_OPTIONS = ["Recently Released", "Recently Updated", "Price: Low to High", "Price: High to Low"];
const ITEMS_PER_PAGE = 12;

// Quick relative time helper
const timeAgo = (dateStr: string) => {
  const days = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
};

// Dynamic Icon Mapper based on Category Name keywords
const getTaskIcon = (taskName: string) => {
  if (!taskName) return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z" /></svg>;
  
  const lower = taskName.toLowerCase();
  if (lower.includes("image") || lower.includes("vision") || lower.includes("photo")) {
    return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
  }
  if (lower.includes("video") || lower.includes("media")) {
    return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
  }
  if (lower.includes("audio") || lower.includes("tts") || lower.includes("voice") || lower.includes("sound")) {
    return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>;
  }
  if (lower.includes("text") || lower.includes("llm") || lower.includes("chat")) {
    return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
  }
  if (lower.includes("bg") || lower.includes("background") || lower.includes("remover")) {
    return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
  }
  
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z" /></svg>;
};

export default function RepositoryPage() {
  const [categories, setCategories] = useState<any[]>([]); 
  const [models, setModels] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [activeCompute, setActiveCompute] = useState("All");
  const [activePricing, setActivePricing] = useState("All");
  const [activePlatform, setActivePlatform] = useState("All");
  const [activeSort, setActiveSort] = useState("Recently Released");
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => setActiveTooltip(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeCategoryId, activeCompute, activePricing, activePlatform, activeSort]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const records = await pb.collection('categories').getFullList({
          sort: 'name', 
          requestKey: null,
        });
        
        const formattedCats = [
          { id: "all", name: "All" },
          ...records.map(r => ({ id: r.id, name: r.Name || r.name || "Unnamed" }))
        ];
        
        setCategories(formattedCats);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories([{ id: "all", name: "All" }]);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchModels() {
      setIsLoading(true);
      try {
        let filterArr = [];
        
        if (debouncedSearch) {
          filterArr.push(`(Name ~ "${debouncedSearch}" || author ~ "${debouncedSearch}")`);
        }
        
        if (activeCategoryId !== "all") {
          filterArr.push(`categoies ~ "${activeCategoryId}"`);
        }
        
        if (activeCompute !== "All") {
          filterArr.push(`type = "${activeCompute.toLowerCase()}"`);
        }
        
        if (activePricing !== "All") {
          filterArr.push(`is_free = ${activePricing === "Free" ? true : false}`);
        }

        if (activePlatform !== "All") {
          filterArr.push(`platforms ~ "${activePlatform}"`);
        }
        
        const filterString = filterArr.join(" && ");

        let sortString = "-created";
        if (activeSort === "Recently Released") sortString = "-created";
        else if (activeSort === "Recently Updated") sortString = "-updated";
        else if (activeSort === "Price: Low to High") sortString = "coin";
        else if (activeSort === "Price: High to Low") sortString = "-coin";

        const res = await pb.collection("apps").getList(currentPage, ITEMS_PER_PAGE, {
          filter: filterString,
          sort: sortString,
          expand: 'categoies', 
          requestKey: null
        });

        const formattedModels = res.items.map((record) => {
          const expandedCats = record.expand?.categoies;
          const categoryName = expandedCats && expandedCats.length > 0 
            ? (expandedCats[0].Name || expandedCats[0].name) 
            : "Utility";

          return {
            id: record.id,
            slug: record.slug || record.id, // Extract slug with a fallback to ID
            name: record.Name,
            author: record.author || "Community",
            iconUrl: pb.files.getURL(record, record.icon),
            task: categoryName,
            compute: record.type?.toLowerCase() === "cloud" ? "Cloud" : "Local",
            pricing: record.is_free ? "Free" : "Paid",
            cost: record.coin || 0,
            updated: timeAgo(record.updated),
            size: record.size,
            description: record.shortDescription || "Experience powerful AI capabilities.",
            sourceUrl: record.source_url || ""
          };
        });

        setModels(formattedModels);
        setTotalPages(res.totalPages);
        setTotalItems(res.totalItems);

      } catch (error: any) {
        if (!error.isAbort) {
          console.error("Error fetching repository data:", error);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchModels();
  }, [currentPage, debouncedSearch, activeCategoryId, activeCompute, activePricing, activePlatform, activeSort]);

  return (
    <main className="min-h-screen bg-[#050508] text-gray-100 font-sans flex flex-col">
      <Navbar />

      <div className="flex-grow w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-8 pb-24 md:pb-12">
        
        <button 
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="md:hidden w-full bg-[#0e0e0e] border border-zinc-800 text-white rounded-xl py-3 px-4 flex justify-between items-center font-medium"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
            Filters & Categories
          </span>
          <svg className={`w-5 h-5 transition-transform ${showMobileFilters ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>

        <aside className={`${showMobileFilters ? "block" : "hidden"} md:block w-full md:w-64 shrink-0 space-y-8`}>
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    activeCategoryId === cat.id 
                      ? "bg-sky-500/10 border-sky-500/50 text-sky-400" 
                      : "bg-[#0a0a0a] border-zinc-800 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1">Environment</h3>
            <div className="flex flex-col gap-2">
              {COMPUTE_TYPES.map(compute => (
                <button
                  key={compute}
                  onClick={() => setActiveCompute(compute)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all text-left ${
                    activeCompute === compute 
                      ? "bg-sky-500/10 border-sky-500/50 text-sky-400" 
                      : "bg-[#0a0a0a] border-transparent hover:border-zinc-800 text-zinc-300"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${activeCompute === compute ? "border-sky-400" : "border-zinc-600"}`}>
                    {activeCompute === compute && <div className="w-2 h-2 bg-sky-400 rounded-full" />}
                  </div>
                  {compute}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1">Pricing</h3>
            <div className="flex flex-col gap-2">
              {PRICING_TYPES.map(price => (
                <button
                  key={price}
                  onClick={() => setActivePricing(price)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all text-left ${
                    activePricing === price 
                      ? "bg-sky-500/10 border-sky-500/50 text-sky-400" 
                      : "bg-[#0a0a0a] border-transparent hover:border-zinc-800 text-zinc-300"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${activePricing === price ? "border-sky-400 bg-sky-500/20" : "border-zinc-600"}`}>
                    {activePricing === price && <svg className="w-3 h-3 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  {price}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1">Platforms</h3>
            <div className="flex flex-col gap-2">
              {PLATFORM_TYPES.map(platform => (
                <button
                  key={platform}
                  onClick={() => setActivePlatform(platform)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all text-left ${
                    activePlatform === platform 
                      ? "bg-sky-500/10 border-sky-500/50 text-sky-400" 
                      : "bg-[#0a0a0a] border-transparent hover:border-zinc-800 text-zinc-300"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${activePlatform === platform ? "border-sky-400 bg-sky-500/20" : "border-zinc-600"}`}>
                    {activePlatform === platform && <svg className="w-3 h-3 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  {platform}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex-1 min-w-0 flex flex-col">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Models</h1>
              <span className="text-zinc-500 font-mono text-sm px-2 py-0.5 bg-[#0e0e0e] border border-zinc-800 rounded-md">
                {totalItems.toLocaleString()}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-3">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#0e0e0e] border border-zinc-800 text-white focus:outline-none focus:border-sky-500/50 rounded-lg text-sm transition-colors placeholder:text-zinc-600"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              </div>

              <div className="relative w-full sm:w-auto shrink-0">
                <select 
                  value={activeSort}
                  onChange={(e) => setActiveSort(e.target.value)}
                  className="w-full appearance-none bg-[#0e0e0e] border border-zinc-800 text-zinc-300 text-sm py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:border-sky-500/50 cursor-pointer"
                >
                  {SORT_OPTIONS.map(opt => <option key={opt} value={opt}>Sort: {opt}</option>)}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {isLoading ? (
             <div className="w-full py-32 flex justify-center flex-grow">
               <svg className="w-8 h-8 text-sky-500 animate-spin" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
             </div>
          ) : models.length === 0 ? (
            <div className="w-full py-32 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl bg-[#0a0a0a] flex-grow">
              <p className="text-zinc-500 font-medium">No models found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-grow content-start">
              {models.map(model => (
                <Link 
                  href={`/apps/${model.slug}`} 
                  key={model.id}
                  className="relative group bg-[#0e0e0e] border border-zinc-800/80 hover:border-zinc-600 rounded-xl p-4 flex flex-col justify-between transition-all hover:bg-[#12141a]"
                >
                  
                  <div 
                    className="absolute top-4 right-4 z-20"
                    onMouseEnter={() => setActiveTooltip(model.id)}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <span 
                      onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        setActiveTooltip(activeTooltip === model.id ? null : model.id);
                      }} 
                      className="inline-flex w-6 h-6 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-sky-400 items-center justify-center border border-zinc-700/50 backdrop-blur-md transition-colors cursor-help"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    
                    <div 
                      className={`absolute right-0 top-full pt-2 w-64 z-30 transition-all duration-200 ${
                        activeTooltip === model.id 
                          ? 'opacity-100 visible translate-y-0 pointer-events-auto' 
                          : 'opacity-0 invisible translate-y-2 pointer-events-none'
                      }`}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    >
                      <div className="p-3.5 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl cursor-default">
                        <p className="text-xs text-zinc-300 leading-relaxed mb-3 whitespace-normal">
                          {model.description}
                        </p>
                        {model.sourceUrl && (
                          <span 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(model.sourceUrl, '_blank', 'noopener,noreferrer');
                            }}
                            className="w-fit text-sky-400 text-xs hover:text-sky-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            Source Link
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-3 pr-6">
                    <div className="shrink-0">
                      {model.iconUrl ? (
                        <img 
                          src={model.iconUrl} 
                          alt={model.name} 
                          className="w-16 h-16 rounded-xl object-contain bg-zinc-900 border border-zinc-800 p-2 shadow-sm" 
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 flex items-center justify-center uppercase font-bold tracking-tighter font-mono shadow-sm">
                          {model.author.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                      <h2 className="text-lg font-bold text-white truncate group-hover:text-sky-400 transition-colors leading-tight">
                        {model.name}
                      </h2>
                      <span className="text-xs text-zinc-500 truncate mt-1 font-medium">
                        {model.author}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2 mb-4">
                    {model.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-400">
                      {getTaskIcon(model.task)} {model.task}
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 border rounded text-xs ${model.compute === 'Local' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}>
                       {model.compute}
                    </div>
                    {model.pricing === 'Paid' ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded text-xs font-medium">
                        Paid
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-xs font-medium">
                        Free
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono mt-auto pt-3 border-t border-zinc-800/50">
                    <span className="flex items-center gap-1.5 text-zinc-400 bg-zinc-900 border border-zinc-800/60 px-2 py-0.5 rounded font-bold" title={model.compute === "Cloud" ? "Coin Cost" : "Model Size"}>
                      {model.compute === "Cloud" ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-2.5-8.5h5m-5 4h5" />
                          </svg>
                          {model.cost}
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          {model.size}
                        </>
                      )}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                    <span>Updated {model.updated}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 pt-6 border-t border-zinc-800/50">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1 || isLoading}
                className="px-4 py-2 rounded-lg bg-[#0e0e0e] border border-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-800 hover:text-white disabled:opacity-50 disabled:hover:bg-[#0e0e0e] disabled:hover:text-zinc-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Prev
              </button>
              
              <div className="px-4 py-2 text-sm font-medium text-zinc-400">
                Page <span className="text-white">{currentPage}</span> of {totalPages}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages || isLoading}
                className="px-4 py-2 rounded-lg bg-[#0e0e0e] border border-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-800 hover:text-white disabled:opacity-50 disabled:hover:bg-[#0e0e0e] disabled:hover:text-zinc-300 transition-colors flex items-center gap-1"
              >
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}

        </section>
      </div>

      <Footer />
    </main>
  );
}