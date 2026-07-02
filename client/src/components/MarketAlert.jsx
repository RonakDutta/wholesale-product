import React from "react";
import { TrendingUp } from "lucide-react";

const MarketAlert = ({
  category = "Packaging Materials",
  region = "Delhi NCR",
  onActionClick,
}) => {
  return (
    <div className="bg-espresso text-cream p-3 sm:p-4 rounded-md flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-3 sm:gap-0">
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-1.5 bg-clay/20 rounded-full shrink-0">
          <TrendingUp className="w-5 h-5 text-clay" />
        </div>
        <div>
          <h2 className="text-sm font-bold">Market Alert</h2>
          <p className="text-xs text-cream/80 leading-tight mt-0.5">
            High demand detected in {category} for {region}.
          </p>
        </div>
      </div>
      <button
        onClick={onActionClick}
        className="text-xs font-bold bg-clay w-full sm:w-auto px-4 py-2 rounded-sm hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
      >
        View Deals
      </button>
    </div>
  );
};

export default MarketAlert;
