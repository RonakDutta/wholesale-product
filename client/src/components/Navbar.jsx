import React from "react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="shrink-0 flex items-center cursor-pointer">
            <span className="text-2xl font-extrabold text-teal-600 tracking-tight">
              Trade<span className="text-slate-800">B2B</span>
            </span>
          </div>

          {/* Center Search Bar (Crucial for Grocery/Wholesale layouts) */}
          <div className="flex-1 max-w-2xl mx-8 hidden md:block">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-slate-400 group-focus-within:text-teal-600 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 sm:text-sm"
                placeholder="Search products, SKUs, or categories..."
              />
            </div>
          </div>

          {/* Right Actions Section */}
          <div className="flex items-center space-x-6">
            {/* Account / User */}
            <button className="flex items-center text-slate-600 hover:text-teal-600 transition-colors">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="ml-2 text-sm font-medium hidden lg:block">
                Account
              </span>
            </button>

            {/* Cart with Notification Badge */}
            <button className="relative p-2 text-slate-600 hover:text-teal-600 transition-colors">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {/* Teal Badge */}
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-teal-600 rounded-full">
                12
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
