import { Search, MapPin, ShoppingCart, User, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import CartDrawer from "./CartDrawer";

const Navbar = () => {
  const { uniqueItemCount, setIsCartOpen } = useCart();
  const { itemCount: wishlistCount } = useWishlist();

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-cream/80 backdrop-blur-md border-b border-sage/30 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="text-2xl font-black tracking-tighter text-espresso cursor-pointer select-none">
            market<span className="text-clay">place</span>
          </div>

          <div className="hidden md:flex flex-1 mx-8 relative group">
            <input
              type="text"
              placeholder="Search products or wholesalers..."
              className="w-full bg-white/50 border border-sage/50 rounded-xl py-2.5 pl-4 pr-10 text-sm text-espresso placeholder-espresso/50 focus:ring-2 focus:ring-clay focus:border-clay focus:outline-none focus:bg-white transition-all duration-300"
            />
            <Search className="absolute right-4 top-3 w-4 h-4 text-espresso/60 group-focus-within:text-clay transition-colors" />
          </div>

          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-sm font-semibold text-espresso cursor-pointer hover:text-clay transition-colors group">
              <MapPin className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Delhi NCR</span>
            </button>

            <Link
              to="/wishlist"
              className="cursor-pointer relative p-2 hover:bg-sage/20 rounded-lg transition-colors group"
              aria-label={`Open wishlist, ${wishlistCount} item${wishlistCount === 1 ? "" : "s"}`}
            >
              <Heart className="w-5 h-5 text-espresso group-hover:scale-110 transition-transform" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-cream text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ring-2 ring-cream">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </Link>

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
};

export default Navbar;
