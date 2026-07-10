import { useState, useRef, useEffect } from "react";
import {
  Search,
  MapPin,
  ShoppingCart,
  User,
  Heart,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Check,
  MessageSquare, // <-- Added this import
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import CartDrawer from "./CartDrawer";

const CITIES = [
  "Delhi NCR",
  "Mumbai",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Surat",
  "Jaipur",
];

const Navbar = () => {
  const { uniqueItemCount, setIsCartOpen } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const { isAuthenticated, user, logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Delhi NCR");
  const navRef = useRef(null);
  const navigate = useNavigate();

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    navigate("/");
  };

  // Reusable Profile Dropdown Menu
  const ProfileMenu = () => (
    <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <p className="text-sm font-bold text-slate-900 truncate">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
        <span className="inline-block mt-2 px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded">
          {user?.role} Account
        </span>
      </div>

      <div className="p-2 flex flex-col gap-1">
        {/* <-- Added Messages Link Here --> */}
        <Link
          to="/messages"
          onClick={() => setIsProfileOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-clay/5 hover:text-clay rounded-lg transition-colors cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          Messages
        </Link>

        {(user?.role === "seller" || user?.role === "both") && (
          <Link
            to="/dashboard"
            onClick={() => setIsProfileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-clay/5 hover:text-clay rounded-lg transition-colors cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            Supplier Dashboard
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors w-full text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </div>
  );

  // Self-contained Location Selector to prevent double-render ref bugs
  const LocationSelector = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (dropRef.current && !dropRef.current.contains(e.target)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 sm:gap-1.5 p-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors group cursor-pointer"
        >
          <MapPin className="w-5 h-5 group-hover:scale-110 transition-transform text-slate-500" />
          {/* Text hidden on mobile to save space */}
          <span className="hidden sm:inline whitespace-nowrap">
            {selectedCity}
          </span>
          <ChevronDown
            className={`hidden sm:block w-3 h-3 text-slate-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-clay" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Region
              </span>
            </div>
            <div className="max-h-60 overflow-y-auto p-1 hide-scrollbar">
              {CITIES.map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    setSelectedCity(city);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                    selectedCity === city
                      ? "bg-clay/10 text-clay"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {city}
                  {selectedCity === city && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const ActionIcons = () => (
    <>
      <LocationSelector />

      <Link
        to="/wishlist"
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors group cursor-pointer"
      >
        <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
        {wishlistCount > 0 && (
          <span className="absolute top-1.5 right-1.5 translate-x-1/2 -translate-y-1/2 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full ring-2 ring-white">
            {wishlistCount > 9 ? "9+" : wishlistCount}
          </span>
        )}
      </Link>

      <button
        onClick={() => setIsCartOpen(true)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors group cursor-pointer"
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
      <nav
        ref={navRef}
        className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto gap-3 md:gap-8">
          <div className="flex items-center justify-between w-full md:w-auto shrink-0">
            <Link
              to="/"
              className="text-xl sm:text-2xl font-black tracking-tighter text-slate-900 select-none"
            >
              market<span className="text-clay">place.</span>
            </Link>

            {/* Mobile Icons */}
            <div className="flex items-center gap-0.5 sm:gap-1 md:hidden -mr-2">
              <ActionIcons />
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="p-2 text-clay hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                  >
                    <User className="w-5 h-5" />
                  </button>
                  {isProfileOpen && <ProfileMenu />}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                >
                  <User className="w-5 h-5" />
                </Link>
              )}
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
              className="absolute right-3.5 top-3 text-slate-400 hover:text-clay transition-colors cursor-pointer"
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
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 hover:bg-slate-50 p-1.5 pr-2.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                  >
                    <div className="w-8 h-8 rounded-full bg-clay/10 text-clay flex items-center justify-center font-bold text-sm uppercase">
                      {user?.firstName?.charAt(0)}
                      {user?.lastName?.charAt(0)}
                    </div>
                    <div className="text-left hidden lg:block">
                      <p className="text-sm font-bold text-slate-800 leading-tight">
                        {user?.firstName}
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isProfileOpen && <ProfileMenu />}
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    className="text-sm font-bold bg-clay text-white px-4 py-2 rounded-md hover:bg-clay/90 transition-all cursor-pointer shadow-sm"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <CartDrawer />
    </>
  );
};

export default Navbar;
