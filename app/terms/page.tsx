import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Terms() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans flex flex-col relative overflow-hidden">
      
      {/* Background Gradients */}
      <div className="absolute bottom-[-10%] right-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />

      <Navbar />
      
      <div className="flex-grow max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
        <div className="mb-12 border-b border-zinc-800 pb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Terms & Conditions</h1>
          <p className="text-zinc-400 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
        
        <div className="space-y-10 text-zinc-300 text-sm md:text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p>By creating an account, accessing, or using the AI Bazaars platform, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use this service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Virtual Credits & Cloud Compute</h2>
            <p className="mb-3">Accessing premium cloud computing tools on AI Bazaars requires the consumption of virtual credits ("Coins"). Regarding these credits:</p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
              <li>Coins are a digital license to access computing power, not a fiat currency, and hold no monetary value outside the platform.</li>
              <li>Purchases of coin bundles are final and non-refundable once computing resources have been allocated or consumed.</li>
              <li>We reserve the right to adjust the "cost per run" of any premium model based on server load and underlying API costs.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Acceptable Use & Open Source Licenses</h2>
            <p>AI Bazaars acts as a unified distribution and execution environment for both proprietary models and open-source models (e.g., MIT, Apache 2.0). You are strictly prohibited from using our cloud infrastructure or local tools to generate illegal content, distribute malware, or bypass API rate limits. You remain responsible for ensuring your commercial use of specific open-source models complies with their original creator licenses.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Disclaimer of Warranties</h2>
            <p>The service is provided on an "as is" and "as available" basis. AI outputs can be unpredictable. Baroi AI makes no warranties, expressed or implied, regarding the accuracy, reliability, or specific fitness of the generated content, and hereby disclaims all liability for server downtime or localized browser crashes resulting from hardware limitations.</p>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}