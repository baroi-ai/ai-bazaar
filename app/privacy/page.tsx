import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Privacy() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans flex flex-col relative overflow-hidden">
      
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full bg-sky-500/5 blur-[150px] pointer-events-none" />
      
      <Navbar />
      
      <div className="flex-grow max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
        <div className="mb-12 border-b border-zinc-800 pb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-zinc-400 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
        
        <div className="space-y-10 text-zinc-300 text-sm md:text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. The Hybrid Privacy Guarantee</h2>
            <p className="mb-3">AI Bazaars operates a hybrid architecture. Your privacy depends entirely on the type of tool you choose to run:</p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
              <li><strong className="text-zinc-200">Browser Native (Local) Tools:</strong> Designed with absolute privacy. Inputs (text, images, audio) processed by local tools never leave your device. The AI inference happens entirely within your browser sandbox.</li>
              <li><strong className="text-zinc-200">Premium Cloud Tools:</strong> When utilizing our premium, coin-based cloud engines, your prompts and uploaded assets are securely transmitted to our serverless clusters for processing. We do not use your private generations to train our models.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Account Data Collection</h2>
            <p>To provide you with our AI App Store ecosystem, we collect essential account information including your email address, authentication tokens, and virtual credit (coin) balances. We do not sell your personal usage data, user accounts, or tracking profiles to external data brokers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Local Caching & Storage</h2>
            <p>To ensure zero-latency performance for our free tools, AI Bazaars utilizes your browser's Cache API to store downloaded ONNX models and WebAssembly files locally. You retain full control and can purge these files at any time by clearing your browser cache.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Contact Us</h2>
            <p>If you have any questions regarding how your data is processed or wish to request account deletion, please contact the Baroi AI operations team at <a href="mailto:support@aibazaars.store" className="text-sky-400 hover:text-sky-300 transition">support@aibazaars.store</a>.</p>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}