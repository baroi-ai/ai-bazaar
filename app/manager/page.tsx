'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import data from '../data.json'; 

// --- MAPPING JSON DATA ---
// Using the same data structure as the main repository
const ALL_MODELS = [
  ...data.topCharts.map((item, index) => ({
    id: `tc-${item.id}-${index}`,
    author: "Community",
    name: item.name,
    iconUrl: item.iconUrl,
    task: item.category === "Text Generation" ? "Text Generation" : item.category === "Speech Recognition" ? "Audio Processing" : "Vision",
    compute: "Local",
    pricing: "Free",
    cost: 0,
    updated: "1 day ago",
    size: item.size
  })),
  ...data.latestModels.map((item, index) => ({
    id: `lm-${item.id}-${index}`,
    author: item.author,
    name: item.name,
    iconUrl: item.iconUrl,
    task: "Text Generation",
    compute: "Local",
    pricing: "Free",
    cost: 0,
    updated: "Just now",
    size: item.size
  })),
  ...data.premiumApps.map((item, index) => ({
    id: `pa-${item.id}-${index}`,
    author: item.author,
    name: item.name,
    iconUrl: item.iconUrl,
    task: "Image Generation",
    compute: "Cloud",
    pricing: "Paid",
    cost: 15, 
    updated: "2 days ago",
    size: item.size
  }))
];

const ITEMS_PER_PAGE = 12;

export default function ManagerPage() {
  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // --- SEARCH LOGIC ONLY ---
  const filteredModels = useMemo(() => {
    let result = ALL_MODELS;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.author.toLowerCase().includes(q)
      );
    }

    return result;
  }, [searchQuery]);

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(filteredModels.length / ITEMS_PER_PAGE);
  const paginatedModels = filteredModels.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const TaskIcons: Record<string, React.ReactNode> = {
    "Text Generation": <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
    "Image Generation": <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>,
    "Vision": <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    "Audio Processing": <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
  };

  return (
    <main className="min-h-screen bg-[#050508] text-gray-100 font-sans flex flex-col">
      <Navbar />

      <div className="flex-grow w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-8 flex flex-col pb-24 md:pb-12">
        
        {/* Header & Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Model Manager</h1>
            <span className="text-zinc-500 font-mono text-sm px-2 py-0.5 bg-[#0e0e0e] border border-zinc-800 rounded-md">
              {filteredModels.length.toLocaleString()} Apps
            </span>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search installed models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0e0e0e] border border-zinc-800 text-white focus:outline-none focus:border-sky-500/50 rounded-xl text-sm transition-colors placeholder:text-zinc-600"
            />
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          </div>
        </div>

        {/* Full Width Grid */}
        <section className="flex-1 min-w-0 flex flex-col">
          {paginatedModels.length === 0 ? (
            <div className="w-full py-32 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl bg-[#0a0a0a] flex-grow">
              <p className="text-zinc-500 font-medium text-lg mb-2">No models found</p>
              <p className="text-zinc-600 text-sm">Try adjusting your search query.</p>
            </div>
          ) : (
            // Switched to grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 for full-width layout
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-grow content-start">
              {paginatedModels.map(model => (
                <Link 
                  href={`/models/${model.id}`} 
                  key={model.id}
                  className="group bg-[#0e0e0e] border border-zinc-800/80 hover:border-zinc-600 rounded-xl p-4 flex flex-col justify-between transition-all hover:bg-[#12141a]"
                >
                  <div className="flex items-center gap-4 mb-5">
                    <div className="shrink-0">
                      {model.iconUrl ? (
                        <img 
                          src={model.iconUrl} 
                          alt={model.name} 
                          className="w-12 h-12 rounded-xl object-contain bg-zinc-900 border border-zinc-800 p-1.5 shadow-sm" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 flex items-center justify-center uppercase font-bold tracking-tighter font-mono shadow-sm">
                          {model.author.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                      <h2 className="text-lg font-bold text-white truncate group-hover:text-sky-400 transition-colors leading-tight">
                        {model.name}
                      </h2>
                      <span className="text-xs text-zinc-500 truncate mt-0.5 font-medium">
                        {model.author}
                      </span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-400">
                      {TaskIcons[model.task] || TaskIcons["Text Generation"]} {model.task}
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 border rounded text-xs ${model.compute === 'Local' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}>
                       {model.compute}
                    </div>
                    {model.pricing === 'Paid' ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                        Paid
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-xs font-medium">
                        Free
                      </div>
                    )}
                  </div>

                  {/* Clean Bottom Metadata Row */}
                  <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono mt-auto pt-3 border-t border-zinc-800/50">
                    <span className="flex items-center gap-1.5 text-zinc-400 bg-zinc-900 border border-zinc-800/60 px-2 py-0.5 rounded font-bold" title="Model Size">
                      {/* Download Icon */}
                      <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      {model.size}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                    <span>Updated {model.updated}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* --- PAGINATION CONTROLS --- */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 pt-6 border-t border-zinc-800/50">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
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
                disabled={currentPage === totalPages}
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