import { Search, MapPin, ShoppingCart, User } from "lucide-react";
import { Link } from "react-router";
import { useCart } from "../context/CartContext";
import CartDrawer from "./CartDrawer";

const Navbar = () => {
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

	return (
		<nav className="sticky top-0 z-50 w-full bg-cream/80 backdrop-blur-md border-b border-sage/30 shadow-sm">
			<div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
				{/* Logo */}
				<div className="text-2xl font-black tracking-tighter text-espresso cursor-pointer select-none flex-shrink-0">
					market<span className="text-clay">place</span>
				</div>

				{/* Desktop Search */}
				<div className="hidden md:flex flex-1 mx-8 relative group">
					<input
						type="text"
						placeholder="Search products or wholesalers..."
						className="w-full bg-white/50 border border-sage/50 rounded-xl py-2.5 pl-4 pr-10 text-sm text-espresso placeholder-espresso/50 focus:ring-2 focus:ring-clay focus:border-clay focus:outline-none focus:bg-white transition-all duration-300"
					/>
					<Search className="absolute right-4 top-3 w-4 h-4 text-espresso/60 group-focus-within:text-clay transition-colors" />
				</div>

				{/* Right Side Actions */}
				<div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
					{/* Mobile Search Toggle */}
					<button
						onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
						className="md:hidden p-2 hover:bg-sage/20 rounded-lg transition-colors text-espresso"
					>
						{isMobileSearchOpen ? (
							<X className="w-5 h-5" />
						) : (
							<Search className="w-5 h-5" />
						)}
					</button>

<<<<<<< HEAD
					{/* Location (Hidden on very small screens) */}
					<button className="hidden lg:flex items-center gap-2 text-sm font-semibold text-espresso cursor-pointer hover:text-clay transition-colors group">
						<MapPin className="w-4 h-4 group-hover:scale-110 transition-transform" />
						<span>Delhi NCR</span>
					</button>

					{/* Cart */}
					<button className="cursor-pointer relative p-2 hover:bg-sage/20 rounded-lg transition-colors group">
						<ShoppingCart className="w-5 h-5 text-espresso group-hover:scale-110 transition-transform" />
						<span className="absolute -top-0.5 -right-0.5 bg-clay text-cream text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ring-2 ring-cream">
							0
						</span>
					</button>

					{/* Auth Buttons (Desktop) */}
					<div className="hidden sm:flex items-center gap-3">
						<Link
							to="login"
							className="text-sm font-semibold text-espresso hover:text-clay transition-colors cursor-pointer whitespace-nowrap"
						>
							Log in
						</Link>
						<Link
							to="signup"
							className="text-sm font-semibold bg-espresso text-cream px-4 py-2 rounded-lg hover:bg-clay transition-all duration-300 cursor-pointer whitespace-nowrap shadow-sm"
						>
							Sign up
						</Link>
					</div>

					{/* Auth Icon (Mobile) */}
					<button className="sm:hidden p-2 hover:bg-sage/20 rounded-lg transition-colors text-espresso">
						<User className="w-5 h-5" />
					</button>
				</div>
			</div>

			{/* Mobile Search Dropdown */}
			{isMobileSearchOpen && (
				<div className="md:hidden px-4 pb-4 bg-cream/95 backdrop-blur-md border-t border-sage/30 animate-in slide-in-from-top duration-300">
					<div className="relative mt-3">
						<input
							type="text"
							autoFocus
							placeholder="Search products or wholesalers..."
							className="w-full bg-white border border-sage/50 rounded-xl py-3 pl-4 pr-10 text-sm text-espresso placeholder-espresso/50 focus:ring-2 focus:ring-clay focus:border-clay focus:outline-none transition-all duration-300 shadow-sm"
						/>
						<Search className="absolute right-4 top-3.5 w-4 h-4 text-espresso/60" />
					</div>
				</div>
			)}
		</nav>
	);
=======
            {/* id is the fly-to-cart animation's landing target — keep it on this element */}
            <button
              id="cart-icon-target"
              onClick={() => setIsCartOpen(true)}
              className="cursor-pointer relative p-2 hover:bg-sage/20 rounded-lg transition-colors group"
              aria-label={`Open cart, ${uniqueItemCount} item${uniqueItemCount === 1 ? "" : "s"}`}
            >
              <ShoppingCart className="w-5 h-5 text-espresso group-hover:scale-110 transition-transform" />
              {uniqueItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-clay text-cream text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ring-2 ring-cream">
                  {uniqueItemCount > 9 ? "9+" : uniqueItemCount}
                </span>
              )}
            </button>

            {/* Auth Buttons (Desktop) */}
            <div className="hidden sm:flex items-center gap-3">
              <Link
                to="login"
                className="text-sm font-semibold text-espresso hover:text-clay transition-colors cursor-pointer whitespace-nowrap"
              >
                Log in
              </Link>
              <Link
                to="signup"
                className="text-sm font-semibold bg-espresso text-cream px-4 py-2 rounded-lg hover:bg-clay transition-all duration-300 cursor-pointer whitespace-nowrap shadow-sm"
              >
                Sign up
              </Link>
            </div>

            {/* Auth Icon (Mobile) */}
            <button className="sm:hidden p-2 hover:bg-sage/20 rounded-lg transition-colors text-espresso">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>
      <CartDrawer />
    </>
  );
>>>>>>> 9c10a8484ad83efd506ff4478f360ae94cc5e406
};

export default Navbar;
