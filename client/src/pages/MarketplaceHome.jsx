import React from "react";
import CategorySlider from "../components/CategorySlider";
import ProductCard from "../components/ProductCard";
import FilterBar from "../components/FilterBar";
import HeroCarousel from "../components/HeroCarousel";
import CTABanner from "../components/CTABanner";
import { TrendingUp } from "lucide-react";
import LoadMore from "../components/LoadMore";
import MarketAlert from "../components/MarketAlert";

const MarketplaceHome = () => {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <HeroCarousel />

      <MarketAlert
        category="Packaging Materials"
        region="Delhi NCR"
        onActionClick={() => console.log("Navigate to deals")}
      />

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
