import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Refund() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans flex flex-col relative overflow-hidden">
      
      {/* Background Gradients - Swapped to a subtle rose color for the refund page */}
      <div className="absolute bottom-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full bg-rose-500/5 blur-[150px] pointer-events-none" />

      <Navbar />
      
      <div className="flex-grow max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
        <div className="mb-12 border-b border-zinc-800 pb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Refund & Cancellation Policy</h1>
          <p className="text-zinc-400 text-sm">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
        
        <div className="space-y-10 text-zinc-300 text-sm md:text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Digital Goods & Virtual Credits</h2>
            <p>AI Bazaars operates on a pay-as-you-go model using virtual credits ("Coins"). Because cloud compute resources are instantly allocated and consumed upon generating a request, all purchases of Coins are final and non-refundable once they have been successfully added to your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Coin Expiration Policy</h2>
            <p>To align with our upstream cloud providers and maintain active platform resources, <strong>all purchased Coins will expire 12 months (365 days) from the date of your last account activity</strong>.</p>
            <p className="mt-3">If you do not log in or generate any content for 12 consecutive months, your Coin balance will be reset to zero. We are unable to restore or refund expired Coins. Active users who regularly log in will not lose their balance.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Failed AI Generations</h2>
            <p>We understand that AI can sometimes be unpredictable. If a premium cloud compute generation fails entirely due to a server-side error, timeout, or network issue on our end, the Coins deducted for that specific generation will be automatically refunded to your virtual wallet. However, generations that complete successfully but produce subjective, unexpected, or unsatisfactory artistic results are not eligible for refunds.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Payment Processing Errors</h2>
            <p>If you are charged for a transaction by your bank or credit card provider, but the Coins are not credited to your AI Bazaars account due to a technical error, please contact us within 7 days. We will verify the transaction with our payment processor and manually credit the missing Coins to your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Contact Us</h2>
            <p>If you have any questions about this policy or need assistance with a billing issue, please contact our support team at <strong>support@aibazaars.store</strong>.</p>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}