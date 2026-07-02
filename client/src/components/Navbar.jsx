import React from "react";
import { Search, MapPin, ShoppingCart } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 w-full bg-cream border-b border-sage/30">
      <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
        <div className="text-xl font-black tracking-tighter text-espresso cursor-pointer">
          market<span className="text-clay">place</span>
        </div>

        <div className="hidden md:flex flex-1 mx-8 relative">
          <input
            type="text"
            placeholder="Search products or wholesalers..."
            className="w-full bg-cream border border-sage/50 rounded-xl py-2 pl-4 pr-10 text-sm text-espresso placeholder-espresso/50 focus:ring-1 focus:ring-clay focus:border-clay focus:outline-none"
          />
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-espresso/60" />
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 text-sm font-semibold text-espresso cursor-pointer hover:text-clay transition-colors">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Delhi NCR</span>
          </button>

          <button className="relative p-2 hover:bg-sage/20 rounded-sm transition-colors">
            <ShoppingCart className="w-5 h-5 text-espresso" />
            <span className="absolute top-0 right-0 bg-clay text-cream text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              0
            </span>
          </button>
        </div>
      </div>

      <div className="md:hidden px-4 pb-3">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search products..."
            className="w-full bg-cream border border-sage/50 rounded-sm py-2 pl-4 pr-10 text-sm text-espresso placeholder-espresso/50 focus:ring-1 focus:ring-clay focus:border-clay focus:outline-none"
          />
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-espresso/60" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
