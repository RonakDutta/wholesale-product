import React from "react";
import { ArrowRight, Store } from "lucide-react";

const CTABanner = () => {
  return (
    <div className="w-full bg-white border border-espresso/10 rounded-xl mt-8 overflow-hidden relative shadow-sm hover:shadow-md transition-all duration-200 font-dmsans">
      {/* Subtle brand accent line */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-clay" />

      <div className="px-6 py-8 sm:px-10 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-8 sm:gap-12">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left max-w-2xl">
          {/* Tagline */}
          <div className="flex items-center gap-2 text-sage text-xs font-bold uppercase tracking-widest mb-3">
            <Store className="w-4 h-4 text-clay" strokeWidth={2.5} />
            <span>For Sellers</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-raleway font-bold text-espresso leading-tight mb-3">
            List your inventory where wholesalers are already buying
          </h2>

          <p className="text-sm sm:text-base text-espresso/70 leading-relaxed mb-5 font-inter">
            Set your own price tiers, take orders directly, and get paid without
            a middleman.
          </p>

          {/* Ledger-style trust stats */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-xs sm:text-sm text-espresso/60 font-inter">
            <span>
              <span className="text-clay font-bold">12,400+</span> buyers
            </span>
            <span className="text-espresso/20">•</span>
            <span>
              <span className="text-clay font-bold">850+</span> sellers
            </span>
            <span className="text-espresso/20">•</span>
            <span>
              <span className="text-clay font-bold">₹2.4Cr+</span> monthly GMV
            </span>
          </div>
        </div>

        <button className="group flex items-center justify-center gap-2 bg-clay text-cream px-7 py-3.5 rounded-lg font-bold text-sm hover:bg-clay/90 transition-all cursor-pointer w-full sm:w-auto shrink-0 shadow-sm hover:shadow-md hover:-translate-y-0.5">
          <span>Become a seller</span>
          <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};

export default CTABanner;
