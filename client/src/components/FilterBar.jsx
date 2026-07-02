import React from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";

const FilterBar = () => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 mb-2 border-b border-sage/30">
      <div className="text-sm font-medium text-espresso">
        <span className="text-sage mr-2">Results:</span>
        Showing 124 products
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <button className="flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-1.5 border border-sage/50 rounded-sm text-xs font-semibold text-espresso hover:bg-sage/10 transition-colors cursor-pointer">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
        </button>

        <button className="flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-1.5 border border-sage/50 rounded-sm text-xs font-semibold text-espresso hover:bg-sage/10 transition-colors cursor-pointer">
          Sort: Recommended
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
