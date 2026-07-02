import { Search, MapPin, ShoppingCart } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 w-full bg-cream/80 backdrop-blur-md border-b border-sage/30 shadow-sm font-dmsans">
      <div className="px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Top Row: Logo, Desktop Search, Actions */}
        <div className="flex items-center justify-between py-3.5 sm:py-4">
          <div className="text-2xl font-raleway font-black tracking-tighter text-espresso cursor-pointer select-none">
            market<span className="text-clay">place</span>
          </div>

          {/* Desktop Search (hidden on mobile) */}
          <div className="hidden md:flex flex-1 mx-8 relative group">
            <input
              type="text"
              placeholder="Search products or wholesalers..."
              className="w-full bg-white/50 border border-sage/50 rounded-xl py-2.5 pl-4 pr-10 text-sm text-espresso placeholder-espresso/50 focus:ring-2 focus:ring-clay focus:border-clay focus:outline-none focus:bg-white transition-all duration-300 font-inter"
            />
            <Search className="absolute right-4 top-3 w-4 h-4 text-espresso/60 group-focus-within:text-clay transition-colors" />
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <button className="flex items-center gap-2 text-sm font-semibold text-espresso cursor-pointer hover:text-clay transition-colors group">
              <MapPin className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Delhi NCR</span>
            </button>

            <button className="cursor-pointer relative p-2 hover:bg-sage/20 rounded-lg transition-colors group">
              <ShoppingCart className="w-5 h-5 text-espresso group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 bg-clay text-cream text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ring-2 ring-cream">
                0
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Row (shows below main nav) */}
        <div className="md:hidden pb-3 relative group">
          <input
            type="text"
            placeholder="Search products or wholesalers..."
            className="w-full bg-white/50 border border-sage/50 rounded-xl py-2.5 pl-4 pr-10 text-sm text-espresso placeholder-espresso/50 focus:ring-2 focus:ring-clay focus:border-clay focus:outline-none focus:bg-white transition-all duration-300 font-inter"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/60 group-focus-within:text-clay transition-colors" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
