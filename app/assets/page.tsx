"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// --- Types ---
interface DisplayItem {
  id: string;
  previewUrl: string;
  width: number;
  height: number;
  ratioType: string;
  createdAt: string;
  modelName: string;
  prompt: string;
}

// --- DUMMY DATA GENERATOR ---
// Generates 16 random images with varied heights for the Pinterest-style masonry grid
const DUMMY_ASSETS: DisplayItem[] = Array.from({ length: 16 }).map((_, i) => {
  const heights = [800, 1024, 1200, 600]; // varied heights
  const h = heights[i % 4];
  return {
    id: `gen-dummy-${i}`,
    previewUrl: `https://picsum.photos/seed/${i + 50}/800/${h}`,
    width: 800,
    height: h,
    ratioType: "Custom",
    createdAt: new Date(Date.now() - i * 86400000).toISOString(), // Past dates
    modelName: i % 2 === 0 ? "Flux Klein 9B" : "SDXL Turbo Premium",
    prompt: `A highly detailed, cinematic shot of a futuristic sci-fi scene, trending on artstation, neon lighting, 8k resolution, photorealistic concept art variation ${i + 1}.`,
  };
});

export default function AssetsPage() {
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DisplayItem | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DisplayItem | null>(null);

  // --- Load Dummy Data ---
  useEffect(() => {
    setTimeout(() => {
      setItems(DUMMY_ASSETS);
      setIsLoading(false);
    }, 1000); // Simulate network load
  }, []);

  // --- Search Logic ---
  const filteredItems = items.filter((item) =>
    item.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Handlers ---
  const handleViewDetails = (item: DisplayItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleOpenDeleteConfirm = (item: DisplayItem) => {
    setItemToDelete(item);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
    setIsDeleteConfirmOpen(false);
    if (selectedItem?.id === itemToDelete.id) setIsModalOpen(false);
    alert("Image deleted successfully.");
  };

  const handleDownload = (item: DisplayItem) => {
    // Fake download logic for UI
    alert(`Downloading ${item.id}...`);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans flex flex-col">
      <Navbar />

      <div className="flex-grow w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* --- HEADER & SEARCH --- */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10 w-full border-b border-zinc-800/80 pb-8">
          <div className="w-full md:w-auto text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center justify-center md:justify-start gap-3 text-white">
              <svg className="h-8 w-8 text-sky-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              My Assets
            </h1>
            <p className="text-zinc-400 mt-2 text-sm">Manage and download your generated images.</p>
          </div>

          <div className="relative w-full md:w-[350px]">
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 bg-[#0e0e0e] border border-zinc-800 text-white focus:outline-none focus:border-sky-500/50 rounded-full h-12 transition-colors text-sm"
            />
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-6 w-6 text-zinc-500 hover:text-white flex items-center justify-center rounded-full bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                onClick={() => setSearchQuery("")}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* --- PINTEREST MASONRY GRID --- */}
        <div className="min-h-[400px] w-full">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 animate-spin text-sky-500" stroke="currentColor" strokeWidth="2"><circle className="opacity-25" cx="12" cy="12" r="10"></circle><path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-32 text-zinc-500 border border-dashed border-zinc-800 rounded-3xl bg-[#0e0e0e]">
              <p className="text-lg font-medium">No assets found matching your search.</p>
            </div>
          ) : (
            <div className="flex flex-row gap-4 md:gap-6 items-start w-full">
              {[
                ...Array(
                  typeof window !== "undefined" && window.innerWidth < 768 ? 2 : 4
                ),
              ].map((_, colIndex, cols) => (
                <div key={colIndex} className="flex flex-col gap-4 md:gap-6 flex-1 min-w-0">
                  {filteredItems
                    .filter((_, idx) => idx % cols.length === colIndex)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="group relative bg-[#0e0e0e] rounded-2xl overflow-hidden hover:shadow-[0_0_30px_rgba(14,165,233,0.15)] transition-all duration-300 border border-zinc-800"
                      >
                        <div
                          className="cursor-zoom-in relative w-full h-full"
                          onClick={() => handleViewDetails(item)}
                        >
                          <Image
                            src={item.previewUrl}
                            alt="Generation"
                            width={item.width}
                            height={item.height}
                            className="w-full h-auto block"
                            loading="lazy"
                            unoptimized={true} // Needed for external picsum URLs
                          />
                          {/* Hover Gradient & Text */}
                          <div className="hidden md:flex absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-col justify-end p-4">
                            <p className="text-white text-xs line-clamp-3 mb-10 font-medium opacity-90 leading-relaxed">
                              {item.prompt}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="absolute top-3 right-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(item);
                            }}
                            className="h-8 w-8 rounded-full bg-black/60 hover:bg-sky-500 text-white border border-white/10 backdrop-blur-md flex items-center justify-center transition-colors"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteConfirm(item);
                            }}
                            className="hidden md:flex h-8 w-8 rounded-full bg-black/60 hover:bg-red-500 text-white border border-white/10 backdrop-blur-md items-center justify-center transition-colors"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* --- Detail View Modal --- */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-2 md:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-[1400px] h-[95vh] md:h-[90vh] bg-[#0e0e0e] border border-zinc-800 text-gray-100 flex flex-col md:flex-row rounded-3xl overflow-hidden shadow-2xl relative">
            
            {/* Close Button Top Right (Mobile Only) */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="md:hidden absolute top-4 right-4 z-50 h-10 w-10 bg-black/60 rounded-full border border-zinc-800 flex items-center justify-center"
            >
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Left: Image Viewer */}
            <div className="flex-1 w-full h-[50vh] md:h-full bg-black flex items-center justify-center p-2 md:p-8">
              <img
                src={selectedItem.previewUrl}
                alt="Preview"
                className="max-w-full max-h-full w-auto h-auto object-contain drop-shadow-2xl rounded-lg"
              />
            </div>

            {/* Right: Sidebar Details */}
            <div className="w-full md:w-[400px] flex flex-col border-t md:border-t-0 md:border-l border-zinc-800 bg-[#0e0e0e] h-[50vh] md:h-full shrink-0">
              <div className="p-6 md:p-8 border-b border-zinc-800 shrink-0 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Image Details</h2>
                <button onClick={() => setIsModalOpen(false)} className="hidden md:flex h-8 w-8 hover:bg-zinc-800 rounded-full items-center justify-center transition-colors">
                   <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="flex-grow p-6 md:p-8 overflow-y-auto space-y-8 custom-scrollbar">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-sky-500 uppercase tracking-widest flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                    Prompt
                  </h4>
                  <div className="text-sm leading-relaxed text-zinc-300 bg-[#0a0a0a] p-4 rounded-xl border border-zinc-800">
                    {selectedItem.prompt}
                  </div>
                </div>
                
                <div className="space-y-4 pt-4 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                    <span className="text-zinc-500 flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
                      Model
                    </span>
                    <span className="text-sky-400 font-medium bg-sky-500/10 px-2.5 py-1 rounded-md">
                      {selectedItem.modelName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                    <span className="text-zinc-500 flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>
                      Created
                    </span>
                    <span className="text-zinc-200 font-medium">
                      {new Date(selectedItem.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-zinc-500 flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                      Resolution
                    </span>
                    <span className="text-zinc-200 font-medium">
                      {selectedItem.width} × {selectedItem.height}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-zinc-800 bg-[#0a0a0a] flex gap-3 shrink-0">
                <button
                  className="flex-1 border border-red-500/30 text-red-500 hover:bg-red-500/10 h-12 rounded-xl flex items-center justify-center font-semibold transition-colors"
                  onClick={() => {
                    setItemToDelete(selectedItem);
                    setIsDeleteConfirmOpen(true);
                  }}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                </button>
                <button
                  className="flex-[3] bg-sky-500 hover:bg-sky-400 text-[#0a0a0a] h-12 rounded-xl flex items-center justify-center font-bold transition-colors"
                  onClick={() => handleDownload(selectedItem)}
                >
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  Download HD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Delete Confirmation Dialog --- */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0e0e0e] border border-red-500/30 text-zinc-200 w-full max-w-[400px] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-500 mb-2">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <h2 className="text-xl font-bold">Delete Image?</h2>
            </div>
            <p className="text-zinc-400 text-sm mt-2 mb-6">
              This action cannot be undone. Are you sure you want to permanently delete this asset?
            </p>
            
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="w-full flex-1 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 h-11 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="w-full flex-1 bg-red-600 hover:bg-red-700 text-white h-11 rounded-lg font-bold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0e0e0e; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a; 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46; 
        }
      `}} />
    </main>
  );
}