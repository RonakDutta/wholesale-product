import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <>
      <footer className="bg-blue-900 text-blue-100 pt-12 pb-8 border-t-4 border-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-white text-blue-900 p-1 rounded text-sm">
                  🛒
                </span>
                <span className="text-xl font-bold text-white tracking-wider">
                  BulkTrade
                </span>
              </div>
              <p className="text-sm text-blue-200 mb-4">
                Your trusted B2B wholesale partner. Sourcing premium inventory
                with dynamic, location-based pricing.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">
                Categories
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/category/electronics"
                    className="hover:text-white transition-colors"
                  >
                    Electronics
                  </Link>
                </li>
                <li>
                  <Link
                    to="/category/apparel"
                    className="hover:text-white transition-colors"
                  >
                    Apparel & Textiles
                  </Link>
                </li>
                <li>
                  <Link
                    to="/category/groceries"
                    className="hover:text-white transition-colors"
                  >
                    Bulk Groceries
                  </Link>
                </li>
                <li>
                  <Link
                    to="/category/hardware"
                    className="hover:text-white transition-colors"
                  >
                    Hardware & Tools
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">
                Support
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/help"
                    className="hover:text-white transition-colors"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shipping"
                    className="hover:text-white transition-colors"
                  >
                    Shipping & Delivery
                  </Link>
                </li>
                <li>
                  <Link
                    to="/returns"
                    className="hover:text-white transition-colors"
                  >
                    Return Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin"
                    className="hover:text-white transition-colors"
                  >
                    Supplier Portal
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">
                100% Secure Payments
              </h4>
              <p className="text-xs text-blue-200 mb-3">
                All transactions are processed securely via UPI.
              </p>
              <div className="flex items-center gap-2">
                <div className="bg-white px-2 py-1 rounded text-blue-900 font-bold text-xs">
                  UPI
                </div>
                <div className="bg-white px-2 py-1 rounded text-blue-900 font-bold text-xs">
                  GPay
                </div>
                <div className="bg-white px-2 py-1 rounded text-blue-900 font-bold text-xs">
                  PhonePe
                </div>
                <div className="bg-white px-2 py-1 rounded text-blue-900 font-bold text-xs">
                  Paytm
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-blue-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-blue-300">
            <p>
              &copy; {new Date().getFullYear()} BulkTrade Wholesale. All rights
              reserved.
            </p>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-white">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-white">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <a
        href="https://wa.me/YOUR_BUSINESS_NUMBER"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform hover:scale-110 group"
        aria-label="Chat on WhatsApp"
      >
        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964 1.005-3.588c-.608-1.065-.928-2.294-.928-3.568 0-5.145 4.184-9.329 9.328-9.329 5.14 0 9.324 4.183 9.324 9.329 0 5.145-4.184 9.329-9.334 9.329z" />
        </svg>
        <span className="hidden group-hover:block ml-2 font-bold whitespace-nowrap">
          Chat with us
        </span>
      </a>
    </>
  );
};

export default Footer;
