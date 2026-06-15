"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import PocketBase from "pocketbase";

// Initialize PocketBase (Update URL for production)
const pb = new PocketBase("http://127.0.0.1:8090");

export default function Navbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState<any>(null); // Track authenticated user
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Set the initial user state from the auth store
    setUser(pb.authStore.model);

    // 2. Listen for auth changes (like logging in or out in another tab)
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model);
    });

    // 3. Handle clicking outside the dropdown to close it
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    
    // Cleanup listeners
    return () => {
      unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = () => {
    pb.authStore.clear(); // Clear local PocketBase session
    setIsDropdownOpen(false);
    router.push("/"); // Optional: Redirect to home on logout
    router.refresh();
  };

  const getDropdownLinkStyle = (path: string) => {
    return pathname === path
      ? "flex items-center space-x-2.5 px-2.5 py-2 text-xs font-medium text-white bg-zinc-800/60 rounded-md transition-colors"
      : "flex items-center space-x-2.5 px-2.5 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/40 rounded-md transition-colors";
  };

  // Dynamically resolve avatar: PB custom avatar -> Dicebear Seed -> Guest Fallback
  const avatarUrl = user?.avatar
    ? pb.files.getURL(user, user.avatar)
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || user?.email || "Guest"}`;

  return (
    <header className="sticky top-0 w-full z-50 pt-4 pb-2 px-4 sm:px-6 lg:px-8 bg-[#0a0a0a]/90 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        {/* Left Side: Logo */}
        <Link
          href="/"
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <img
            src="/logo.png"
            alt="AI Bazaar Logo"
            className="w-10 h-10 object-contain group-hover:scale-105 transition"
          />
          <h1 className="hidden sm:block text-2xl font-bold tracking-tight text-white group-hover:text-sky-400 transition">
            AI Bazaar
          </h1>
        </Link>

        {/* Right Side: Action Icons */}
        <div className="flex items-center space-x-4 md:space-x-5">
          <Link
            href="/apps"
            className="text-zinc-400 hover:text-white transition focus:outline-none"
            aria-label="Manager"
          >
            {/* Search Icon */}
            <button
              className="text-zinc-400 hover:text-white transition focus:outline-none hidden md:block"
              aria-label="Search apps"
            >
              <svg
                className="w-[1.25rem] h-[1.25rem]"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </Link>

          {/* Manager / Download Icon (Hidden on Mobile) */}
          <div className="hidden md:block">
            <Link
              href="/manager"
              className="text-zinc-400 hover:text-white transition focus:outline-none"
              aria-label="Manager"
            >
              <svg
                className="w-[1.25rem] h-[1.25rem]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
            </Link>
          </div>

          {/* Coin Balance Button */}
          <Link
            href="/pricing"
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <button className="flex items-center space-x-2 border border-sky-500/40 rounded-full px-3 py-1.5 bg-zinc-900/50 hover:bg-sky-500/10 transition group focus:outline-none">
              {/* Optimized Coin Icon */}
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                className="w-[1.1rem] h-[1.1rem] text-sky-400 group-hover:text-sky-300 transition" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v12" />
                <path d="M9 9h6" />
                <path d="M9 15h6" />
                <path d="M12 6c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z" />
                <path d="M12 12c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z" />
              </svg>
              {/* Example fallback if you implement coins later, else hardcode */}
              <span className="text-white text-sm font-medium pr-1">{user?.credits || 0}</span>
            </button>
          </Link>

          {/* User Avatar Dropdown Area */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={toggleDropdown}
              className="flex items-center justify-center p-0.5 rounded-full ring-1 ring-zinc-700/50 hover:ring-sky-500/50 focus:outline-none transition-all"
              aria-expanded={isDropdownOpen}
              aria-label="Toggle user menu"
            >
              <img
                src={avatarUrl}
                alt="User Profile"
                className="w-8 h-8 rounded-full object-cover bg-zinc-800"
              />
            </button>

            {/* Compact Dropdown Panel */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2.5 w-52 bg-[#0e0e0e] border border-zinc-800/80 rounded-lg shadow-2xl py-1 px-1.5 transition-all animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2.5 py-2 border-b border-zinc-800/60 mb-1">
                  <p className="text-xs font-semibold text-white tracking-wide">
                    {user ? (user.name || "User") : "Guest User"}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                    {user ? user.email : "guest@gmail.com"}
                  </p>
                </div>

                <nav className="space-y-0.5">
                  <Link
                    href="/profile"
                    className={getDropdownLinkStyle("/profile")}
                    onClick={toggleDropdown}
                  >
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-zinc-400"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                    <span>Profile</span>
                  </Link>

                  <Link
                    href="/assets"
                    className={getDropdownLinkStyle("/assets")}
                    onClick={toggleDropdown}
                  >
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-zinc-400"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>
                    <span>Assets</span>
                  </Link>

                  <Link
                    href="/pricing"
                    className={getDropdownLinkStyle("/pricing")}
                    onClick={toggleDropdown}
                  >
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-zinc-400"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>
                    <span>Pricing</span>
                  </Link>

                  <Link
                    href="/support"
                    className={getDropdownLinkStyle("/support")}
                    onClick={toggleDropdown}
                  >
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-zinc-400"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                    <span>Support</span>
                  </Link>
                </nav>

                <div className="my-1 border-t border-zinc-800" />

                {/* Conditional Rendering for Login/Logout Button */}
                {user ? (
                  <button
                    className="w-full flex items-center space-x-2.5 px-2.5 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors focus:outline-none"
                    onClick={handleLogout}
                  >
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>
                    <span>Logout</span>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="w-full flex items-center space-x-2.5 px-2.5 py-2 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-md transition-colors focus:outline-none"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25" /></svg>
                    <span>Login</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}