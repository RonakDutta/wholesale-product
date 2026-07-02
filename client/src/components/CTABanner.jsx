import React from "react";
import { ArrowRight, Store } from "lucide-react";

const CTABanner = () => {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-lg mt-8 overflow-hidden relative shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Subtle brand accent line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-clay" />

      <div className="px-5 py-7 sm:px-8 sm:py-8 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-6 sm:gap-8">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left max-w-2xl">
          <div className="flex items-center gap-1.5 text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2">
            <Store className="w-3.5 h-3.5 text-clay" strokeWidth={2.5} />
            <span>For sellers</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight mb-2">
            List your inventory where wholesalers are already buying
          </h2>

          <p className="text-sm text-slate-500 leading-relaxed mb-4">
            Set your own price tiers, take orders directly, and get paid without
            a middleman.
          </p>

          {/* Ledger-style trust stats */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 font-mono text-[11px] sm:text-xs text-slate-500">
            <span>
              <span className="text-slate-900 font-bold">12,400+</span> buyers
            </span>
            <span className="text-slate-300">•</span>
            <span>
              <span className="text-slate-900 font-bold">850+</span> sellers
            </span>
            <span className="text-slate-300">•</span>
            <span>
              <span className="text-slate-900 font-bold">₹2.4Cr+</span> monthly
              GMV
            </span>
          </div>
        </div>

        <button className="group flex items-center justify-center gap-2 bg-clay text-white px-6 py-2.5 rounded-md font-semibold text-sm hover:bg-clay/90 transition-colors cursor-pointer w-full sm:w-auto shrink-0 shadow-sm">
          <span>Become a seller</span>
          <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};

export default CTABanner;
