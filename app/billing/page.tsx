'use client';

import React, { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// --- CONSTANTS ---
const COINS_PER_DOLLAR = 35;
const MIN_CUSTOM_TOP_UP_USD = 5;

// --- SUBSCRIPTION DATA ---
const MONTHLY_PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceUSD: 9,
    credits: 400,
    features: [
      "Access to all Local Models",
      "400 Credits / month",
      "Generate up to 500 images",
      "Or upscale ~60 images to 4K",
      "Or perform ~30 Magic Edits",
      "Credits never expire",
    ],
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    priceUSD: 29,
    credits: 1500,
    features: [
      "Access to all Local Models",
      "1,500 Credits / month",
      "Generate up to 1,500 images",
      "Or upscale ~187 images to 4K",
      "Priority generation queue",
      "Rollover unused credits",
    ],
    popular: true,
  },
  {
    id: "elite",
    name: "Elite",
    priceUSD: 79,
    credits: 4200,
    features: [
      "Access to all Local Models",
      "4,200 Credits / month",
      "Generate up to 4,200 images",
      "Or upscale ~525 images to 4K",
      "Private Cloud & API Access",
      "Dedicated VIP support",
    ],
    popular: false,
  },
];

const YEARLY_PLANS = [
  {
    id: "starter_yearly",
    name: "Starter",
    priceUSD: 97,
    credits: 4800,
    features: [
      "Access to all Local Models",
      "4,800 Credits UPFRONT",
      "Generate up to 6,000 images",
      "Or upscale ~720 images to 4K",
      "Or perform ~360 Magic Edits",
      "Credits never expire",
    ],
    popular: false,
  },
  {
    id: "pro_yearly",
    name: "Pro",
    priceUSD: 313,
    credits: 18000,
    features: [
      "Access to all Local Models",
      "18,000 Credits UPFRONT",
      "Generate up to 18,000 images",
      "Or upscale ~2,244 images to 4K",
      "Priority generation queue",
      "Rollover unused credits",
    ],
    popular: true,
  },
  {
    id: "elite_yearly",
    name: "Elite",
    priceUSD: 853,
    credits: 50400,
    features: [
      "Access to all Local Models",
      "50,400 Credits UPFRONT",
      "Generate up to 50,400 images",
      "Or upscale ~6,300 images to 4K",
      "Private Cloud & API Access",
      "Dedicated VIP support",
    ],
    popular: false,
  },
];

// --- MOCK TRANSACTIONS ---
const MOCK_TRANSACTIONS = [
  {
    id: 1,
    date: "2026-06-01",
    type: "Subscription",
    credits: 1500,
    amount: 29.0,
    status: "completed",
  },
  {
    id: 2,
    date: "2026-05-15",
    type: "Top Up",
    credits: 350,
    amount: 10.0,
    status: "completed",
  },
  {
    id: 3,
    date: "2026-04-20",
    type: "Credit Use",
    credits: -45,
    amount: 0,
    status: "completed",
  },
];

export default function Billing() {
  // --- STATE ---
  const [amount, setAmount] = useState<string>(MIN_CUSTOM_TOP_UP_USD.toString());
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [billingMode, setBillingMode] = useState<"one-time" | "monthly" | "yearly">("one-time");

  // --- HELPERS ---
  const calculatedCoins = useMemo(() => {
    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) return 0;
    return Math.floor(val * COINS_PER_DOLLAR);
  }, [amount]);

  // --- HANDLERS (Mocked for pure UI) ---
  const handleOneTimePayment = () => {
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 1500);
  };

  const handleSubscription = (planId: string) => {
    setSubscribingId(planId);
    setTimeout(() => setSubscribingId(null), 1500);
  };

  // --- COMPONENT: Plan Cards ---
  const renderPlanCards = (plans: typeof MONTHLY_PLANS, isYearly = false) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-2">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={`relative bg-[#0a0b10] flex flex-col rounded-2xl p-6 md:p-8 transition-all duration-300 ${
            plan.popular
              ? "border border-sky-500/50 shadow-[0_0_30px_-10px_rgba(14,165,233,0.15)] md:scale-105 z-10"
              : "border border-zinc-800/80 hover:border-zinc-700"
          }`}
        >
          {plan.popular && (
            <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
              <div className="bg-sky-500 text-[#0a0a0a] text-[11px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Most Popular
              </div>
            </div>
          )}

          <div className="text-center pb-6 pt-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">{plan.name}</h3>
            <div className="flex items-center justify-center gap-1 mt-3">
              <span className="text-4xl font-extrabold text-white">
                ${plan.priceUSD}
              </span>
              <span className="text-zinc-500 text-sm font-medium mt-2">
                {isYearly ? "/yr" : "/mo"}
              </span>
            </div>
          </div>

          <div className="flex-grow space-y-6">
            <div className="text-center bg-zinc-900/40 rounded-xl py-3 border border-zinc-800/60">
              <p className="text-sky-400 font-bold text-lg flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-sky-400" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="12" r="5" /><circle cx="15" cy="12" r="5" /></svg>
                {plan.credits.toLocaleString()} Credits
              </p>
            </div>

            <ul className="space-y-3.5 pb-8">
              {plan.features.map((feature, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 text-sm text-zinc-300"
                >
                  <svg className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto">
            <button
              onClick={() => handleSubscription(plan.id)}
              disabled={subscribingId === plan.id}
              className={`w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                plan.popular
                  ? "bg-[#252836] hover:bg-[#2d303f] text-white border border-zinc-700/50" // Matched to deepshark dark button style
                  : "bg-zinc-800 hover:bg-zinc-700 text-white"
              }`}
            >
              {subscribingId === plan.id ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.996 2.001L2 7.828l9.996 5.827 9.996-5.827-9.996-5.827zm0 13.655L3.896 10.93v2.898L11.996 19.655l8.1-5.827V10.93l-8.1 4.726z"/></svg>
                  Subscribe Now
                </>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <main className="min-h-screen bg-[#050508] text-gray-100 font-sans flex flex-col">
      <Navbar />

      <div className="flex-grow w-full max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 py-10 md:py-16">
        
        {/* --- HEADER --- */}
        <div className="text-center space-y-3 md:space-y-4 mb-8 md:mb-10 px-4">
          <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight flex items-center justify-center gap-3">
            <div className="p-1.5 border border-sky-500 rounded-md bg-sky-500/10">
               <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-sky-400" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg>
            </div>
            Simple Transparent Pricing
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto">
            Fuel your creativity with flexible credit packs or professional subscriptions.
          </p>
        </div>

        {/* --- PERFECT MOBILE INLINE TOGGLE SWITCH --- */}
        <div className="flex justify-center mb-10 px-4">
          {/* Strictly enforced whitespace-nowrap and precise padding so it never breaks to a new line on mobile */}
          <div className="bg-[#0e0e0e] border border-zinc-800 p-1 md:p-1.5 rounded-full flex items-center justify-between w-full max-w-[500px]">
            <button
              onClick={() => setBillingMode("one-time")}
              className={`flex-1 flex justify-center items-center px-1 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs md:text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                billingMode === "one-time"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              Pay as you go
            </button>
            <button
              onClick={() => setBillingMode("monthly")}
              className={`flex-1 flex justify-center items-center px-1 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs md:text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                billingMode === "monthly"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingMode("yearly")}
              className={`flex-1 flex justify-center items-center px-1 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs md:text-sm font-medium whitespace-nowrap transition-all duration-300 gap-1 sm:gap-1.5 ${
                billingMode === "yearly"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              Yearly
              <span className={`text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap ${
                billingMode === "yearly" ? "bg-sky-500 text-[#0a0a0a]" : "bg-sky-500/20 text-sky-400"
              }`}>
                1 Month Free
              </span>
            </button>
          </div>
        </div>

        {/* --- DYNAMIC VIEWS --- */}
        <div className="min-h-[400px] w-full">
          {/* VIEW 1: ONE-TIME PAYMENT */}
          {billingMode === "one-time" && (
            <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 px-4">
              <div className="w-full max-w-md bg-[#0a0b10] border border-zinc-800/80 rounded-[2rem] overflow-hidden shadow-2xl relative p-8">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Top-up Credits
                  </h2>
                  <p className="text-zinc-400 text-sm mt-1">
                    Enter USD amount to calculate credits
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="relative max-w-[200px] mx-auto">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500 text-xl font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={MIN_CUSTOM_TOP_UP_USD}
                      className="w-full pl-8 text-center text-2xl font-bold bg-[#050508] border border-zinc-800 rounded-xl text-white h-14 focus:outline-none focus:border-sky-500/50 transition-colors"
                    />
                  </div>

                  <div className="text-center space-y-1 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/60">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                      You Get
                    </p>
                    <p className="text-4xl font-extrabold text-sky-400 flex items-center justify-center gap-2 pt-2 pb-1">
                      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-sky-400" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="12" r="5" /><circle cx="15" cy="12" r="5" /></svg>
                      {calculatedCoins.toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Premium cloud credits (Lifetime Validity)
                    </p>
                  </div>

                  <button
                    onClick={handleOneTimePayment}
                    disabled={isProcessing}
                    className="w-full bg-[#252836] hover:bg-[#2d303f] border border-zinc-700/50 text-white font-bold h-12 text-base rounded-xl transition-all flex items-center justify-center"
                  >
                    {isProcessing ? (
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                      "Continue to Checkout"
                    )}
                  </button>
                  <p className="text-[10px] text-zinc-500 text-center">
                    Secure global checkout. Minimum purchase $
                    {MIN_CUSTOM_TOP_UP_USD}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2 & 3: SUBSCRIPTION PLANS */}
          {billingMode === "monthly" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {renderPlanCards(MONTHLY_PLANS, false)}
            </div>
          )}
          {billingMode === "yearly" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {renderPlanCards(YEARLY_PLANS, true)}
            </div>
          )}
        </div>

        {/* --- TRANSACTION HISTORY (RESTORED & OPTIMIZED) --- */}
        <section className="mt-20 pt-10 border-t border-zinc-800/60 max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
            <svg
              className="h-5 w-5 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-white">
              Transaction History
            </h2>
          </div>

          <div className="bg-[#0e0e0e] border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto hide-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-[#0a0a0a] border-b border-zinc-800">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">
                      Credits
                    </th>
                    <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">
                      Amount
                    </th>
                    <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {MOCK_TRANSACTIONS.map((txn) => (
                    <tr
                      key={txn.id}
                      className="hover:bg-zinc-900/30 transition-colors"
                    >
                      <td className="p-4 text-sm text-zinc-300 font-mono">
                        {txn.date}
                      </td>
                      <td className="p-4 text-sm text-zinc-200">{txn.type}</td>
                      <td
                        className={`p-4 text-sm text-right font-bold ${txn.credits > 0 ? "text-emerald-400" : "text-zinc-400"}`}
                      >
                        {txn.credits > 0 ? "+" : ""}
                        {txn.credits}
                      </td>
                      <td className="p-4 text-sm text-zinc-400 text-right">
                        {txn.amount > 0 ? `$${txn.amount.toFixed(2)}` : "-"}
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <Footer />

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </main>
  );
}