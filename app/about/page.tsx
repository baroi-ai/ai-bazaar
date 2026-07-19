import type { Metadata } from 'next';
import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// SEO Metadata updated for the Hybrid Marketplace strategy
export const metadata: Metadata = {
  title: 'About AI Bazaar | The Ultimate AI App Store for Local & Cloud Models',
  description: 'Our mission is to bring the fragmented AI ecosystem into one platform. Run free private models directly in your browser, or scale up to elite cloud compute.',
  keywords: ['About AI Bazaar', 'AI App Store', 'Free Local AI', 'Cloud AI Models', 'Baroi AI', 'Transformers.js browser', 'WebGPU AI'],
};

export default function About() {
  return (
    <main className="min-h-screen text-gray-100 font-sans flex flex-col relative overflow-hidden">
      
      {/* Subtle Premium Background Glows */}
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full bg-sky-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />

      <Navbar />
      
      <div className="flex-grow max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
        
        {/* Header & Mission Section */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <div className="inline-block mb-4 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-sky-400 text-xs font-semibold tracking-wide uppercase">
            Built by Baroi AI
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            The Ultimate AI App Store
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 leading-relaxed mb-8">
            The AI landscape is fragmented. Our mission is simple: to bring the world's most powerful AI models and creative tools together into one unified workspace. Whether you need free local inference or massive cloud compute, it all lives here.
          </p>
          <div className="inline-flex flex-col items-center justify-center p-6 rounded-2xl border border-zinc-800/80 bg-[#0a0a0a]/30 backdrop-blur-md max-w-2xl mx-auto shadow-lg hover:border-sky-500/20 transition-all duration-300">
            <span className="text-xs md:text-sm font-bold text-sky-400 uppercase tracking-wider mb-2">
              One‑Click Install Local AI & Open Source Apps
            </span>
            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
              Use free browser tools, scale with premium cloud compute, or run open-source apps directly on your local compute from GitHub in just one click.
            </p>
          </div>
        </div>

        {/* The Hybrid Ecosystem: Core Pillars Grid */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-20">
          
          {/* Pillar 1: Local & Free */}
          <div className="bg-gradient-to-b from-zinc-900/50 to-zinc-950/50 border border-zinc-800/80 p-8 rounded-3xl hover:border-sky-500/30 transition-all duration-300 group">
            <div className="w-12 h-12 bg-[#0a0a0a]/50 border border-zinc-800 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
              💻
            </div>
            <div className="flex items-center space-x-2 mb-3">
              <h3 className="text-xl font-semibold text-white">Local AI Models</h3>
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Free</span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Run optimized AI models completely free. Inference happens locally inside your browser sandbox using your own device's hardware (via ONNX & WebGPU), meaning zero latency, zero server costs, and 100% total privacy.
            </p>
          </div>
          
          {/* Pillar 2: Cloud & Premium */}
          <div className="bg-gradient-to-b from-zinc-900/50 to-zinc-950/50 border border-zinc-800/80 p-8 rounded-3xl hover:border-indigo-500/30 transition-all duration-300 group">
            <div className="w-12 h-12 bg-[#0a0a0a]/50 border border-zinc-800 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
              ⚡
            </div>
            <div className="flex items-center space-x-2 mb-3">
              <h3 className="text-xl font-semibold text-white">Cloud Compute</h3>
              <span className="bg-cyan-500/10 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Premium</span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              When you need to do heavy lifting, tap into our premium cloud APIs. Generate high-fidelity images, run massive LLMs, and process video without needing a $3,000 GPU on your desk.
            </p>
          </div>
          
          {/* Pillar 3: All-in-One Workspace */}
          <div className="bg-gradient-to-b from-zinc-900/50 to-zinc-950/50 border border-zinc-800/80 p-8 rounded-3xl hover:border-zinc-600 transition-all duration-300 group">
            <div className="w-12 h-12 bg-[#0a0a0a]/50 border border-zinc-800 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
              🛒
            </div>
            <div className="flex items-center space-x-2 mb-3">
              <h3 className="text-xl font-semibold text-white">Open Source Apps</h3>
              <span className="bg-violet-500/10 text-violet-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Open Source</span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Stop managing twenty different subscriptions and compiling complex Github code. From background removers to video watermark tools, run fully open-source applications and custom web engines in one click.
            </p>
          </div>
        </div>

        {/* The Technology Section */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-[#0a0a0a] border border-zinc-800 p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden shadow-2xl backdrop-blur-xl">
          {/* Internal section glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-900/10 blur-[120px] pointer-events-none"></div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 relative z-10">Under the Hood: How it Works</h2>
          
          <div className="grid md:grid-cols-2 gap-12 relative z-10">
            
            {/* Tech 1: Local Architecture */}
            <div className="space-y-5">
              <div className="inline-flex items-center space-x-2 bg-[#0a0a0a] border border-zinc-800 px-3 py-1.5 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                <span className="text-xs font-medium text-zinc-300 uppercase tracking-wide">The Local Engine</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-100">ONNX & WebGPU</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                To run complex AI directly on your machine, we utilize the Open Neural Network Exchange (ONNX) format. Powered by Hugging Face's <span className="text-zinc-200 font-medium">Transformers.js</span>, our free apps bypass traditional backend servers completely. By tapping into WebAssembly (WASM) and WebGPU APIs, AI Bazaar securely utilizes your device's raw graphical processing power directly through the browser.
              </p>
            </div>
            
            {/* Tech 2: Cloud Architecture */}
            <div className="space-y-5">
              <div className="inline-flex items-center space-x-2 bg-[#0a0a0a] border border-zinc-800 px-3 py-1.5 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
                <span className="text-xs font-medium text-zinc-300 uppercase tracking-wide">The Cloud Engine</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-100">Scalable Serverless Compute</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Not every model can fit on a laptop. For our premium paid tools, AI Bazaar routes your generations through high-performance serverless cloud clusters. We handle the complex infrastructure, API load balancing, and GPU provisioning behind the scenes. You simply click a button, spend a few coins, and get enterprise-grade inference delivered instantly to your screen.
              </p>
            </div>

          </div>
        </div>

      </div>

      <Footer />
    </main>
  );
}