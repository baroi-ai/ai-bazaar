"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PocketBase from "pocketbase";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// Initialize PocketBase (Update URL for production)
const pb = new PocketBase("http://127.0.0.1:8090");

export default function ProfilePage() {
  const router = useRouter();

  // --- USER DATA STATE ---
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    avatar: string | null;
    credits: number;
    initials: string;
    subscription?: {
      planId: string;
      subscriptionId: string;
      status: string; 
      currentPeriodEnd: string;
    } | null;
  } | null>(null);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // --- UI STATES ---
  const [couponCode, setCouponCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Modals
  const [isCancelSubModalOpen, setIsCancelSubModalOpen] = useState(false);
  const [isCancellingSub, setIsCancellingSub] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  const CONFIRMATION_PHRASE = "delete my account";

  // --- 1. Load Real Profile & Protect Route ---
  useEffect(() => {
    if (!pb.authStore.isValid || !pb.authStore.model) {
      router.push("/login");
    } else {
      const model = pb.authStore.model;
      
      // Generate initials for fallback
      const initials = model.name 
        ? model.name.substring(0, 2).toUpperCase() 
        : model.email.substring(0, 2).toUpperCase();

      // Resolve the actual avatar URL from PocketBase
      const avatarUrl = model.avatar 
        ? pb.files.getURL(model, model.avatar) 
        : null;

      setCurrentUser({
        name: model.name || "",
        email: model.email,
        avatar: avatarUrl,
        credits: model.credits || 0,
        initials: initials,
        // Using mock data for subscription until you add a Subscriptions collection
        subscription: null 
      });
      
      setIsLoadingProfile(false);
    }
  }, [router]);

  // --- 2. Coupon Handler ---
  const handleRedeemCoupon = () => {
    if (!couponCode.trim()) return;
    setIsRedeeming(true);
    
    // Fake network request
    setTimeout(() => {
      setIsRedeeming(false);
      if (couponCode.toLowerCase() === "free500" && currentUser) {
        setCurrentUser({ ...currentUser, credits: currentUser.credits + 500 });
        setCouponCode("");
        alert("Successfully redeemed 500 credits!");
      } else {
        alert("Invalid coupon code.");
      }
    }, 1500);
  };

  // --- 3. Cancel Subscription Handler ---
  const proceedWithSubscriptionCancellation = () => {
    setIsCancellingSub(true);
    
    setTimeout(() => {
      setIsCancellingSub(false);
      setIsCancelSubModalOpen(false);
      if (currentUser) {
        setCurrentUser({ ...currentUser, subscription: null });
      }
      alert("Subscription cancelled successfully.");
    }, 1500);
  };

  // --- 4. Delete Account Handlers ---
  const handleDeleteAccountModalOpen = () => {
    setDeleteConfirmationText("");
    setIsDeleteDialogOpen(true);
  };

  const proceedWithAccountDeletion = () => {
    if (deleteConfirmationText.toLowerCase() !== CONFIRMATION_PHRASE) return;
    
    setIsDeletingAccount(true);
    setTimeout(async () => {
      setIsDeletingAccount(false);
      setIsDeleteDialogOpen(false);
      
      try {
        if (pb.authStore.model?.id) {
           await pb.collection('users').delete(pb.authStore.model.id);
        }
        pb.authStore.clear();
        alert("Account deleted. Logging out...");
        router.push("/");
      } catch (error) {
        alert("Failed to delete account. Please try again.");
      }
    }, 1500);
  };

  // --- 5. Logout Handler ---
  const handleLogout = () => {
    pb.authStore.clear();
    router.push("/login");
  };

  // Helper
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoadingProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0a]">
        <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 animate-spin text-sky-500" stroke="currentColor" strokeWidth="2"><circle className="opacity-25" cx="12" cy="12" r="10"></circle><path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      </div>
    );
  }

  if (!currentUser) return null; // Safe fallback since useEffect handles the redirect

  return (
    <main className="min-h-screen bg-[#050508] text-gray-100 font-sans flex flex-col relative">
      <Navbar />

      <div className="flex-grow space-y-6 pb-20 px-4 md:px-8 pt-8 w-full max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-white text-center md:text-left mb-8">
          My Profile
        </h1>

        <div className="border border-zinc-800 bg-[#0e0e0e] shadow-2xl transition-all duration-300 ease-in-out w-full mx-auto rounded-[2rem] overflow-hidden">
          
          {/* HEADER */}
          <div className="flex flex-col items-center justify-center text-center pb-8 pt-10 border-b border-zinc-800/80 relative">
            <div className="h-24 w-24 mb-5 border-2 border-sky-500/50 shadow-[0_0_20px_rgba(14,165,233,0.3)] rounded-full bg-[#0a0a0a] flex items-center justify-center text-3xl font-bold text-sky-400 overflow-hidden">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="Profile Avatar" className="w-full h-full object-cover" />
              ) : (
                currentUser.initials
              )}
            </div>
            <h2 className="text-2xl font-bold text-white break-all px-4">
              {currentUser.name || currentUser.email.split("@")[0]}
            </h2>
            <p className="text-zinc-400 text-sm mt-1 break-all px-4">
              {currentUser.email}
            </p>
          </div>

          <div className="space-y-8 pt-8 px-6 md:px-10 pb-10">
            
            {/* Email & Credits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-4 rounded-xl border border-zinc-800/80 bg-[#0a0a0a] overflow-hidden">
                <svg className="h-5 w-5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span className="text-sm font-medium text-zinc-200 truncate">
                  {currentUser.email}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800/80 bg-[#0a0a0a]">
                <div className="flex items-center space-x-3">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-sky-400 shrink-0" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="12" r="5" /><circle cx="15" cy="12" r="5" /></svg>
                  <span className="text-sm font-medium text-zinc-200">
                    Balance
                  </span>
                </div>
                <span className="font-bold text-sky-400 text-lg">
                  {currentUser.credits.toLocaleString()}
                </span>
              </div>
            </div>

            {/* SUBSCRIPTION STATUS BOX */}
            <div className="space-y-3">
              <label className="text-zinc-300 font-medium ml-1 text-sm">
                Subscription Status
              </label>

              {currentUser.subscription && currentUser.subscription.status === "active" ? (
                <div className="p-5 rounded-xl border border-sky-500/30 bg-sky-500/10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                        Plan:{" "}
                        <span className="uppercase text-sky-400 tracking-wide">
                          {currentUser.subscription.planId}
                        </span>
                      </h3>
                      <p className="text-xs md:text-sm text-zinc-400 flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Active • Renews on{" "}
                        <span className="text-zinc-200">
                          {formatDate(currentUser.subscription.currentPeriodEnd)}
                        </span>
                      </p>
                    </div>

                    <button
                      onClick={() => setIsCancelSubModalOpen(true)}
                      className="border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors w-full md:w-auto px-4 h-10 rounded-lg bg-transparent text-sm font-medium"
                    >
                      Cancel Plan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-zinc-800 bg-[#0a0a0a] text-center flex flex-col items-center justify-center gap-3">
                  <p className="text-sm text-zinc-400">
                    You are currently on the Free Tier.
                  </p>
                  <Link href="/pricing" className="w-full md:w-auto">
                    <button className="bg-sky-500 hover:bg-sky-400 transition-colors text-[#0a0a0a] font-bold w-full md:w-auto px-5 h-11 rounded-lg flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                      Upgrade to Pro
                    </button>
                  </Link>
                </div>
              )}
            </div>

            {/* Coupon Section */}
            <div className="space-y-3 pt-6 border-t border-zinc-800/80">
              <label htmlFor="coupon-code" className="flex items-center gap-2 text-zinc-300 font-medium ml-1 text-sm">
                <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                Redeem Coupon
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="coupon-code"
                  type="text"
                  placeholder="Enter code (Try 'free500')"
                  value={couponCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCouponCode(e.target.value)}
                  disabled={isRedeeming}
                  className="flex-1 bg-[#0a0a0a] border border-zinc-800 text-white focus:outline-none focus:border-sky-500/50 h-11 px-3 rounded-lg transition-colors"
                />
                <button
                  onClick={handleRedeemCoupon}
                  disabled={isRedeeming || !couponCode.trim()}
                  className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white border-0 sm:w-auto w-full shrink-0 h-11 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center"
                >
                  {isRedeeming && (
                    <svg className="mr-2 h-4 w-4 animate-spin text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="opacity-25" /><path d="M21 12c0-4.97-4.03-9-9-9" className="opacity-75" /></svg>
                  )}
                  Redeem
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col-reverse md:flex-row justify-between gap-3 py-6 px-6 md:px-10 border-t border-zinc-800/80 bg-[#0a0a0a]/50">
            <button
              onClick={handleDeleteAccountModalOpen}
              disabled={isDeletingAccount}
              className="w-full md:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-colors h-11 px-5 rounded-lg flex items-center justify-center text-sm font-medium"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              Delete Account
            </button>
            <button
              onClick={handleLogout}
              className="w-full md:w-auto border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors bg-transparent h-11 px-5 rounded-lg flex items-center justify-center text-sm font-medium"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      <Footer />

      {/* --- MODAL 1: CANCEL SUBSCRIPTION (IMMEDIATE) --- */}
      {isCancelSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0e0e0e] border border-zinc-800 text-zinc-200 w-full max-w-[425px] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-2 mx-auto sm:mx-0">
                <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h2 className="text-xl font-bold text-white text-center sm:text-left">
                Cancel Subscription?
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed text-center sm:text-left pb-2">
                Are you sure you want to cancel?
                <br /><br />• Your plan will be cancelled <strong>immediately</strong>.
                <br />• You will keep your current credits, but they will not auto-renew next month.
                <br />• You can <strong>subscribe again</strong> at any time.
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
              <button
                onClick={() => setIsCancelSubModalOpen(false)}
                className="w-full sm:w-auto flex-1 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 bg-transparent h-11 rounded-lg text-sm font-medium transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={proceedWithSubscriptionCancellation}
                disabled={isCancellingSub}
                className="w-full sm:w-auto flex-1 bg-red-600 hover:bg-red-700 text-white border-none h-11 rounded-lg font-semibold transition-colors flex items-center justify-center"
              >
                {isCancellingSub ? (
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="opacity-25" /><path d="M21 12c0-4.97-4.03-9-9-9" className="opacity-75" /></svg>
                ) : (
                  "Cancel Immediately"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: DELETE ACCOUNT --- */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0e0e0e] border border-red-500/30 text-zinc-200 w-full max-w-[425px] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2 mx-auto sm:mx-0">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <h2 className="text-xl font-bold text-white text-center sm:text-left">
                Delete Account
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed text-center sm:text-left">
                This action represents a <strong>permanent data loss</strong>. We cannot recover your account, credits, or history once deleted.
              </p>
            </div>
            
            <div className="py-5 space-y-4">
              <div className="text-sm text-zinc-300 bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-center sm:text-left">
                Type <span className="font-bold text-red-400">"{CONFIRMATION_PHRASE}"</span> below to confirm.
              </div>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirmationText(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-zinc-800 text-white focus:outline-none focus:border-red-500/50 h-11 px-3 rounded-lg transition-colors text-center sm:text-left"
                placeholder={CONFIRMATION_PHRASE}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="w-full sm:w-auto flex-1 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 bg-transparent h-11 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={proceedWithAccountDeletion}
                disabled={isDeletingAccount || deleteConfirmationText.toLowerCase() !== CONFIRMATION_PHRASE}
                className="w-full sm:w-auto flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white h-11 rounded-lg font-semibold transition-colors flex items-center justify-center"
              >
                {isDeletingAccount ? (
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="opacity-25" /><path d="M21 12c0-4.97-4.03-9-9-9" className="opacity-75" /></svg>
                ) : (
                  "Delete Account"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}