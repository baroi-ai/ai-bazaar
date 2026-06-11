import React from "react";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { 
  Monitor, 
  HardDrive, 
  Tag, 
  Coins, 
  Cpu, 
  Globe,
  Download
} from "lucide-react";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import ImageCarousel from "./components/ImageCarousel";
import PlatformWarningModal from "./components/PlatformWarningModal";

const PB_URL = "http://127.0.0.1:8090";

type Props = {
  params: Promise<{ slug: string }>;
};

// --- FORCE HTML DECODER ---
function decodeHtml(html: string) {
  if (!html) return "";
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// --- 1. Fetch Data ---
async function getAppDetails(slug: string) {
  try {
    const res = await fetch(`${PB_URL}/api/collections/apps/records?filter=(slug='${slug}')&expand=categoies`, {
      cache: "no-store" 
    });
    const data = await res.json();

    if (!data.items || data.items.length === 0) return null;
    return data.items[0];
  } catch (error) {
    console.error("Fetch failed:", error);
    return null;
  }
}

const getPbImageUrl = (collectionId: string, recordId: string, filename: string) => {
  if (!filename) return "";
  return `${PB_URL}/api/files/${collectionId}/${recordId}/${filename}`;
};

// --- 2. Advanced SEO Metadata ---
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params; 
  const appData = await getAppDetails(slug);
  if (!appData) return { title: "App Not Found | AI Bazaar" };

  const iconUrl = appData.icon ? getPbImageUrl(appData.collectionId, appData.id, appData.icon) : "";
  return {
    title: `${appData.Name} - AI Bazaar`, 
    description: appData.shortDescription,
    openGraph: {
      title: `${appData.Name} - AI Bazaar`,
      description: appData.shortDescription,
      images: iconUrl ? [{ url: iconUrl }] : [],
      type: "website",
    },
  };
}

// --- 3. Main Listing Page ---
export default async function AppListingPage({ params }: Props) {
  const { slug } = await params;
  const appData = await getAppDetails(slug);

  if (!appData) notFound(); 

  const screenshotUrls = appData.screenshots?.map((filename: string) => 
    getPbImageUrl(appData.collectionId, appData.id, filename)
  ) || [];
  const iconUrl = appData.icon ? getPbImageUrl(appData.collectionId, appData.id, appData.icon) : "";
  
  const expandedCategory = appData.expand?.categoies;
  const categoryLabel = Array.isArray(expandedCategory)
    ? expandedCategory.map((c: any) => c.Name || c.name || "Category").join(", ")
    : "";

  const cleanDescriptionHTML = decodeHtml(appData.description);
  
  // Link Logic
  const hasWebsite = Boolean(appData.source_url || appData.web_url);
  const hasGithub = Boolean(appData.github_url);
  const hasExternalLinks = hasWebsite || hasGithub;

  // Extract Download Links safely (INCLUDING IOS AND DESKTOP)
  const downloadLinks = appData.download_links || {};
  const hasApk = Boolean(downloadLinks.apk);
  const hasPlaystore = Boolean(downloadLinks.playstore);
  const hasIos = Boolean(downloadLinks.ios);
  const hasDesktop = Boolean(downloadLinks.desktop);
  const hasAnyDownloads = hasApk || hasPlaystore || hasIos || hasDesktop;

  // Format platforms safely into an array so our modal can read it
  const platformsArray = Array.isArray(appData.platforms) 
    ? appData.platforms 
    : appData.platforms ? [appData.platforms] : [];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans flex flex-col">
      
      {/* RENDER THE WARNING MODAL HERE */}
      <PlatformWarningModal platforms={platformsArray} />

      <Navbar />

      <article className="w-full max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-20 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* LEFT SIDEBAR */}
          <aside className="lg:col-span-4 flex flex-col items-center bg-zinc-900/40 border border-zinc-800/80 p-6 md:p-8 rounded-3xl lg:sticky lg:top-24 shadow-2xl">
            {appData.badge && (
              <span className="mb-4 px-3 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold uppercase tracking-widest rounded-full">
                {appData.badge}
              </span>
            )}

            <div className="w-32 h-32 bg-[#1a1a1a] rounded-3xl shadow-xl flex items-center justify-center mb-6 border border-zinc-700/50 overflow-hidden shrink-0">
              {iconUrl ? (
                <Image src={iconUrl} alt={`${appData.Name} Logo`} width={128} height={128} className="object-contain w-full h-full p-4" priority unoptimized />
              ) : (
                <span className="text-4xl font-black text-zinc-700">{appData.Name?.charAt(0)}</span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold text-white text-center mb-1 leading-tight">
              {appData.Name}
            </h1>
            
            {appData.author && (
              <p className="text-zinc-400 text-center text-sm mb-6 font-medium">By {appData.author}</p>
            )}

            {/* ACTION BUTTONS WRAPPER */}
            <div className="w-full flex flex-col gap-3">
              
              {/* --- DOWNLOAD LINKS --- */}
              {hasApk && (
                <a href={downloadLinks.apk} download className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95">
                  <Download className="w-5 h-5" /> Download APK
                </a>
              )}

              {hasIos && (
                <a href={downloadLinks.ios} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-4 bg-black border border-zinc-700 hover:border-zinc-500 rounded-xl px-4 py-3 transition-all group">
                  <svg className="w-8 h-8 text-zinc-200 fill-current group-hover:scale-105 transition-transform shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.126 3.753 3.056 1.469-.068 2.048-.95 3.829-.95 1.764 0 2.302.95 3.851.922 1.579-.028 2.62-1.488 3.626-2.954 1.156-1.69 1.631-3.328 1.652-3.411-.038-.016-3.193-1.226-3.216-4.854-.02-3.045 2.483-4.512 2.597-4.578-1.417-2.072-3.612-2.355-4.404-2.416-1.922-.16-3.791 1.121-4.746 1.121zm-1.066-5.465c1.111-1.346 1.86-3.215 1.656-5.086-1.594.064-3.528 1.058-4.665 2.396-1.017 1.196-1.844 3.102-1.611 4.935 1.776.138 3.51-1.034 4.62-2.245z"/>
                  </svg>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-zinc-300 font-semibold uppercase leading-tight tracking-wider">Download on the</span>
                    <span className="text-lg font-bold text-white leading-tight">App Store</span>
                  </div>
                </a>
              )}

              {hasPlaystore && (
                <a href={downloadLinks.playstore} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-4 bg-black border border-zinc-700 hover:border-zinc-500 rounded-xl px-4 py-3 transition-all group">
                  <svg className="w-8 h-8 text-emerald-500 fill-current group-hover:scale-105 transition-transform shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.026 1.106a1.48 1.48 0 0 0-.426 1.054v19.676a1.485 1.485 0 0 0 .445 1.058l11.458-11.385L1.026 1.106zM13.511 12.519L2.247 23.684l10.155-5.746 2.122-2.118-1.013-3.301zM2.21 .316L13.511 11.48l1.042-3.327L2.21.316z"/>
                  </svg>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-zinc-300 font-semibold uppercase leading-tight tracking-wider">Get it on</span>
                    <span className="text-lg font-bold text-white leading-tight">Google Play</span>
                  </div>
                </a>
              )}

              {hasDesktop && (
                <a href={downloadLinks.desktop} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-4 bg-black border border-zinc-700 hover:border-zinc-500 rounded-xl px-4 py-3 transition-all group">
                  <Monitor className="w-8 h-8 text-blue-400 group-hover:scale-105 transition-transform shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-zinc-300 font-semibold uppercase leading-tight tracking-wider">Download for</span>
                    <span className="text-lg font-bold text-white leading-tight">Desktop OS</span>
                  </div>
                </a>
              )}

              {/* DIVIDER: Show only if we have both downloads AND external links */}
              {(hasAnyDownloads && hasExternalLinks) && (
                <hr className="border-zinc-800/80 my-2 w-full" />
              )}

              {/* --- EXTERNAL LINKS --- */}
              {hasWebsite && (
                <a 
                  href={appData.source_url || appData.web_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-white font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  <Globe className="w-4 h-4 shrink-0" /> 
                  {appData.execution_type === 'native_binary' ? 'Visit Website' : 'Launch Web App'}
                </a>
              )}
              
              {hasGithub && (
                <a href={appData.github_url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-colors border border-zinc-700/50">
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.068.069-.068 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  View Source Code
                </a>
              )}
            </div>

          </aside>

          {/* RIGHT SIDE */}
          <div className="lg:col-span-8 flex flex-col gap-10">
            
            {/* 1. Short Description & Badges */}
            {(appData.shortDescription || categoryLabel) && (
              <section className="w-full flex flex-col gap-4">
                {appData.shortDescription && (
                  <p className="text-xl text-zinc-300 leading-relaxed font-medium">
                    {appData.shortDescription}
                  </p>
                )}
                {/* CATEGORY BADGES */}
                {categoryLabel && (
                  <div className="flex flex-wrap gap-2">
                    {categoryLabel.split(", ").map((cat: string) => (
                      <span key={cat} className="px-3 py-1 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 text-sky-400 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-lg shadow-sky-900/10">
                        <Tag className="w-3 h-3" />
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            )}

            {screenshotUrls.length > 0 && <hr className="border-zinc-800" />}

            {/* 2. Interface */}
            <ImageCarousel screenshots={screenshotUrls} appName={appData.Name} />
            
            {screenshotUrls.length > 0 && cleanDescriptionHTML && <hr className="border-zinc-800" />}

            {/* 5. App Information */}
            <section className="w-full">
              <h3 className="text-xl font-bold text-white mb-6">App Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {appData.type && (
                  <div className="flex flex-col p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
                    <Cpu className="w-5 h-5 text-zinc-500 mb-2" />
                    <span className="text-xs text-zinc-500 uppercase font-semibold mb-1">Environment</span>
                    <span className="text-sm text-zinc-200 capitalize truncate">{appData.type}</span>
                  </div>
                )}
                {appData.size && (
                  <div className="flex flex-col p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
                    <HardDrive className="w-5 h-5 text-zinc-500 mb-2" />
                    <span className="text-xs text-zinc-500 uppercase font-semibold mb-1">Size</span>
                    <span className="text-sm text-zinc-200 truncate">{appData.size}</span>
                  </div>
                )}
                {(appData.coin !== undefined && appData.coin !== null) && (
                  <div className="flex flex-col p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
                    <Coins className="w-5 h-5 text-zinc-500 mb-2" />
                    <span className="text-xs text-zinc-500 uppercase font-semibold mb-1">Cost</span>
                    <span className="text-sm text-zinc-200 truncate">{appData.coin === 0 ? "Free" : `${appData.coin} Coins / run`}</span>
                  </div>
                )}
                {platformsArray.length > 0 && (
                  <div className="flex flex-col p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
                    <Monitor className="w-5 h-5 text-zinc-500 mb-2" />
                    <span className="text-xs text-zinc-500 uppercase font-semibold mb-1">Platforms</span>
                    <span className="text-sm text-zinc-200 truncate">
                      {platformsArray.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* 3. About This App */}
            {cleanDescriptionHTML && (
              <section className="w-full">
                <h2 className="text-2xl font-bold text-white mb-6">About this app</h2>
                <div className="relative group">
                  <input type="checkbox" id="read-more-toggle" className="peer hidden" />
                  <div 
                    className="prose prose-invert max-w-none text-zinc-300 leading-relaxed custom-html-styling line-clamp-6 peer-checked:line-clamp-none transition-all duration-300"
                    dangerouslySetInnerHTML={{ __html: cleanDescriptionHTML }} 
                  />
                  {/* FADE GRADIENT */}
                  <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent peer-checked:hidden pointer-events-none transition-opacity duration-500"></div>
                  
                  <label htmlFor="read-more-toggle" className="text-sky-400 hover:text-sky-300 text-sm font-bold cursor-pointer mt-4 inline-flex items-center gap-1 peer-checked:hidden relative z-20 transition-colors">
                    Read more ▼
                  </label>
                  
                  <label htmlFor="read-more-toggle" className="text-sky-400 hover:text-sky-300 text-sm font-bold cursor-pointer mt-6 hidden peer-checked:inline-flex items-center gap-1 relative z-20 transition-colors">
                    Show less ▲
                  </label>
                </div>
              </section>
            )}

            {cleanDescriptionHTML && appData.system_reqs && <hr className="border-zinc-800" />}

            {/* 4. Requirements */}
            {appData.system_reqs && (
              <section className="w-full p-6 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <Monitor className="w-5 h-5 text-sky-400" />
                  <h3 className="text-lg font-bold text-white m-0">System Requirements</h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">{appData.system_reqs}</p>
              </section>
            )}
          </div>
        </div>
      </article>
      <Footer />
    </main>
  );
}