'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);

  // Helper to validate email format
  const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return;
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      setStep('otp');
      setTimer(360);
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-[#050508] flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-[340px] flex flex-col items-center">
        
        <div className="mb-10">
          <Link href="/" className="cursor-pointer">
            <img src="/logo.png" alt="AI Bazaar" className="w-14 h-14 object-contain" />
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-white mb-6">
          {step === 'email' ? 'Welcome To AI Bazaar' : 'Enter Verification Code'}
        </h1>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="w-full space-y-4">
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border border-zinc-800 text-white placeholder-zinc-600 rounded-xl h-12 px-4 focus:outline-none focus:border-sky-500/50 transition-colors text-sm"
            />
            
            <button 
              type="submit"
              // Button is enabled if email is valid and not currently loading
              disabled={isLoading || !isValidEmail(email)}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 disabled:opacity-30 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/25 flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? 'Sending...' : 'Continue with Email'}
            </button>
          </form>
        ) : (
          <div className="w-full space-y-4">
             <div className="flex justify-between items-center bg-[#0e0e0e] px-4 py-3 rounded-xl border border-zinc-800">
              <span className="text-xs text-zinc-400 truncate max-w-[150px]">{email}</span>
              <button onClick={() => setStep('email')} className="text-[10px] text-sky-400 hover:underline font-medium">Change</button>
            </div>
            <input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-transparent border border-zinc-800 text-white text-center text-2xl tracking-[1em] rounded-xl h-14 px-4 focus:outline-none focus:border-sky-500/50"
            />
            <button className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-bold rounded-xl text-sm">Verify Code</button>
          </div>
        )}

        {step === 'email' && (
          <>
            <div className="flex items-center gap-3 w-full my-6">
              <div className="flex-1 h-px bg-zinc-800/80"></div>
              <span className="text-[11px] text-zinc-600 uppercase font-medium tracking-widest">or</span>
              <div className="flex-1 h-px bg-zinc-800/80"></div>
            </div>

            <button 
              className="w-full h-12 bg-transparent border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-3 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </>
        )}
      </div>
    </main>
  );
}