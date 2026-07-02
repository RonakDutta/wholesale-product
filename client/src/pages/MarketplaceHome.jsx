import React from "react";
import CategorySlider from "../components/CategorySlider";
import ProductCard from "../components/ProductCard";
import FilterBar from "../components/FilterBar";
import HeroCarousel from "../components/HeroCarousel";
import CTABanner from "../components/CTABanner";
import { TrendingUp } from "lucide-react";
import LoadMore from "../components/LoadMore";

const MarketplaceHome = () => {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <HeroCarousel />

      <div className="bg-espresso text-cream p-3 sm:p-4 rounded-md flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-3 sm:gap-0">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-1.5 bg-clay/20 rounded-full shrink-0">
            <TrendingUp className="w-5 h-5 text-clay" />
          </div>
          <div>
            <h2 className="text-sm font-bold">Market Alert</h2>
            <p className="text-xs text-cream/80 leading-tight mt-0.5">
              High demand detected in Packaging Materials for Delhi NCR.
            </p>
          </div>
        </div>
        <button className="text-xs font-bold bg-clay w-full sm:w-auto px-4 py-2 rounded-sm hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer">
          View Deals
        </button>
      </div>

      <CategorySlider />

      <div className="flex flex-col gap-2">
        <FilterBar />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <ProductCard key={item} />
          ))}
        </div>
      </div>
      <LoadMore />

      <CTABanner />
    </div>
  );
};

export default MarketplaceHome;
