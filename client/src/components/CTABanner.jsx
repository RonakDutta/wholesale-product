import React from "react";
import { ArrowRight, Store } from "lucide-react";

const CTABanner = () => {
  return (
    <div className="w-full bg-espresso rounded-2xl mt-5 overflow-hidden relative">
      {/* perforated top edge, ties to the "tear-off / invite" idea */}
      <div className="border-t border-dashed border-cream/20" />

      <div className="px-5 py-7 sm:px-10 sm:py-9 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 sm:gap-8">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left max-w-xl">
          <div className="flex items-center gap-1.5 text-clay text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2">
            <Store className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2.5} />
            <span>For sellers</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-cream leading-tight mb-2">
            List your inventory where wholesalers are already buying
          </h2>

          <p className="text-sm text-cream/60 leading-relaxed mb-4 sm:mb-5">
            Set your own price tiers, take orders directly, and get paid without
            a middleman.
          </p>

          {/* ledger-style trust stats, consistent with product card treatment */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 font-mono text-[11px] sm:text-xs text-cream/70">
            <span>
              <span className="text-clay font-bold">12,400+</span> buyers
            </span>
            <span className="text-cream/20">·</span>
            <span>
              <span className="text-clay font-bold">850+</span> sellers
            </span>
            <span className="text-cream/20">·</span>
            <span>
              <span className="text-clay font-bold">₹2.4Cr+</span> monthly GMV
            </span>
          </div>
        </div>

        <button className="group flex items-center justify-center gap-2 bg-clay text-cream px-6 py-3 rounded-sm font-semibold text-sm hover:bg-clay/90 transition-colors cursor-pointer w-full sm:w-auto shrink-0">
          <span>Become a seller</span>
          <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};

export default CTABanner;
