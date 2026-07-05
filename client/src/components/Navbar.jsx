import { useState } from "react";
import { Search, MapPin, ShoppingCart, User, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import CartDrawer from "./CartDrawer";

const Navbar = () => {
  const { uniqueItemCount, setIsCartOpen } = useCart();
  const { itemCount: wishlistCount } = useWishlist();

  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();

    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Reusable icon group
  const ActionIcons = () => (
    <>
      <button className="flex items-center gap-1.5 p-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors group cursor-pointer">
        <MapPin className="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span className="hidden xl:inline">Delhi NCR</span>
      </button>

      <Link
        to="/wishlist"
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors group cursor-pointer"
        aria-label={`Open wishlist, ${wishlistCount} item${
          wishlistCount === 1 ? "" : "s"
        }`}
      >
        <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
        {wishlistCount > 0 && (
          <span className="absolute top-1.5 right-1.5 translate-x-1/2 -translate-y-1/2 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full ring-2 ring-white">
            {wishlistCount > 9 ? "9+" : wishlistCount}
          </span>
        )}
      </Link>

      <button
        id="cart-icon-target"
        onClick={() => setIsCartOpen(true)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors group cursor-pointer"
        aria-label={`Open cart, ${uniqueItemCount} item${
          uniqueItemCount === 1 ? "" : "s"
        }`}
      >
        <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
        {uniqueItemCount > 0 && (
          <span className="absolute top-1.5 right-1.5 translate-x-1/2 -translate-y-1/2 bg-clay text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full ring-2 ring-white">
            {uniqueItemCount > 9 ? "9+" : uniqueItemCount}
          </span>
        )}
      </button>
    </>
  );

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto gap-3 md:gap-8">
          {/* Logo */}
          <div className="flex items-center justify-between w-full md:w-auto shrink-0">
            <Link
              to="/"
              className="text-xl sm:text-2xl font-black tracking-tighter text-slate-900 select-none"
            >
              market<span className="text-clay">place.</span>
            </Link>

            {/* Mobile Icons */}
            <div className="flex items-center gap-1 md:hidden -mr-2">
              <ActionIcons />
              <Link
                to="/login"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors"
              >
                <User className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Search */}
          <form
            onSubmit={handleSearch}
            className="w-full md:flex-1 relative group order-last md:order-0"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, categories, or wholesalers..."
              className="w-full bg-slate-100 border border-transparent rounded-lg py-2.5 pl-4 pr-10 text-sm text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-clay/20 focus:border-clay focus:outline-none focus:bg-white transition-all duration-300"
            />

            <button
              type="submit"
              className="absolute right-3.5 top-3 text-slate-400 hover:text-clay transition-colors"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4 shrink-0">
            <div className="flex items-center gap-1">
              <ActionIcons />
            </div>

            <div className="hidden lg:block w-px h-6 bg-slate-200 mx-1"></div>

            <div className="flex items-center gap-4 ml-2">
              <Link
                to="/login"
                className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                Log in
              </Link>

              <Link
                to="/signup"
                className="text-sm font-bold bg-clay text-white px-4 py-2 rounded-md hover:bg-clay/90 transition-all duration-200 whitespace-nowrap shadow-sm"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <CartDrawer />
    </>
  );
};

export default Navbar;
