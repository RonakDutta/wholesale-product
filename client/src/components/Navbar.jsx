import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 bg-blue-600 text-white shadow-md">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              className="rounded-lg p-1.5 text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <Link
              to="/"
              className="text-xl font-bold tracking-wider flex items-center gap-2"
            >
              <span className="bg-white text-blue-800 p-1.5 rounded-lg text-sm leading-none">
                🛒
              </span>
              <span className="tracking-tight">Wholesale market.</span>
            </Link>
          </div>

          <div className="flex-1 max-w-3xl hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for bulk items, categories, or SKUs..."
                className="w-full bg-white text-blue-900 placeholder:text-gray-400 rounded-full py-2.5 pl-5 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
              <button
                type="button"
                aria-label="Search"
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-blue-800"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden lg:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-blue-100 hover:bg-blue-700 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Enter Pincode</span>
            </button>

            <Link
              to="/cart"
              aria-label="Cart, 0 items"
              className="relative rounded-full p-1.5 text-white hover:bg-blue-700 hover:text-blue-100 transition-colors"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 bg-yellow-400 text-blue-900 font-bold text-xs rounded-full h-4 w-4 flex items-center justify-center">
                0
              </span>
            </Link>

            <Link
              to="/admin"
              aria-label="Account"
              className="text-white hover:text-blue-200 transition-colors"
            >
              <svg
                className="h-8 w-8 bg-blue-700 rounded-full p-1 border border-blue-500 hover:border-blue-300 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </Link>
          </div>
        </div>

        <div className="md:hidden pb-3 pt-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-white text-blue-900 placeholder:text-gray-400 rounded-full py-2.5 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
            <button
              type="button"
              aria-label="Search"
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-500"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
