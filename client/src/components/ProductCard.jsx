import React from "react";
import { MessageCircle, CreditCard, TrendingDown } from "lucide-react";

const ProductCard = () => {
  return (
    <div className="bg-cream border border-sage/30 rounded-md overflow-hidden flex flex-col h-full transition-shadow hover:shadow-md">
      <div className="relative w-full aspect-4/3 bg-sage/10">
        <img
          src="https://placehold.co/400x300/e2e8f0/1e293b?text=Image"
          alt="Product placeholder"
          className="object-cover w-full h-full"
        />
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-cream/95 text-espresso text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-sm uppercase tracking-wide border border-sage/20 shadow-sm max-w-[90%] truncate">
          Apex Traders
        </div>
      </div>

      <div className="p-2 sm:p-3 flex flex-col flex-1 gap-1.5 sm:gap-2">
        <h3 className="text-xs sm:text-sm font-semibold text-espresso line-clamp-2 leading-tight">
          Premium Industrial Packaging Cartons
        </h3>

        <div className="flex items-center justify-between mt-auto pt-1 sm:pt-2">
          <div className="flex items-baseline gap-0.5 sm:gap-1">
            <span className="text-sm sm:text-base font-black text-clay">
              ₹45
            </span>
            <span className="text-[10px] sm:text-xs text-sage">/unit</span>
          </div>
          <div className="flex items-center gap-1 bg-sage/10 text-espresso text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-sm shrink-0">
            <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-clay" />
            <span className="hidden sm:inline">High Supply</span>
            <span className="sm:hidden">Supply</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-1 sm:mt-2">
          <button className="flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 border border-sage/50 text-espresso text-[10px] sm:text-xs font-semibold rounded-sm hover:bg-sage/10 transition-colors cursor-pointer">
            <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>Chat</span>
          </button>
          <button className="flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 bg-clay text-cream text-[10px] sm:text-xs font-semibold rounded-sm hover:opacity-90 transition-opacity cursor-pointer">
            <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>Buy</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
