import { useState } from "react";
import { Search, ShoppingCart, User, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import CartDrawer from "./CartDrawer";

const Navbar = () => {
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
	const [isCartOpen, setIsCartOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const { uniqueItemCount } = useCart();
	const navigate = useNavigate();

	const handleSearch = (e) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
			setIsMobileSearchOpen(false);
		}
	};

	return (
		<>
			<nav className="sticky top-0 z-50 w-full bg-cream/80 backdrop-blur-md border-b border-sage/30 shadow-sm">
				<div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
					<Link
						to="/"
						className="text-2xl font-black tracking-tighter text-espresso cursor-pointer select-none flex-shrink-0"
					>
						market<span className="text-clay">place</span>
					</Link>

					{/* Desktop Search */}
					<form
						onSubmit={handleSearch}
						className="hidden md:flex flex-1 mx-8 relative group"
					>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search products or wholesalers..."
							className="w-full bg-white/50 border border-sage/50 rounded-xl py-2.5 pl-4 pr-10 text-sm text-espresso placeholder-espresso/50 focus:ring-2 focus:ring-clay focus:border-clay focus:outline-none focus:bg-white transition-all duration-300"
						/>
						<button
							type="submit"
							className="absolute right-4 top-3 w-4 h-4 text-espresso/60 hover:text-clay transition-colors"
						>
							<Search className="w-4 h-4" />
						</button>
					</form>

					<div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
						{/* Mobile search toggle */}
						<button
							onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
							className="md:hidden p-2 hover:bg-sage/20 rounded-lg transition-colors text-espresso"
							aria-label="Toggle search"
						>
							{isMobileSearchOpen ? (
								<X className="w-5 h-5" />
							) : (
								<Search className="w-5 h-5" />
							)}
						</button>

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

						{/* Auth buttons (desktop) */}
						<div className="hidden sm:flex items-center gap-3">
							<Link
								to="/login"
								className="text-sm font-semibold text-espresso hover:text-clay transition-colors cursor-pointer whitespace-nowrap"
							>
								Log in
							</Link>
							<Link
								to="/signup"
								className="text-sm font-semibold bg-espresso text-cream px-4 py-2 rounded-lg hover:bg-clay transition-all duration-300 cursor-pointer whitespace-nowrap shadow-sm"
							>
								Sign up
							</Link>
						</div>

						{/* Auth icon (mobile) */}
						<button className="cursor-pointer sm:hidden p-2 hover:bg-sage/20 rounded-lg transition-colors text-espresso">
							<User className="w-5 h-5" />
						</button>
					</div>
				</div>

				{isMobileSearchOpen && (
					<div className="md:hidden border-t border-sage/20 bg-cream/90 backdrop-blur-md px-4 py-3 shadow-inner animate-slide-down">
						<form onSubmit={handleSearch} className="flex items-center gap-2">
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search products or wholesalers..."
								className="flex-1 bg-white/80 border border-sage/50 rounded-xl py-2.5 px-4 text-sm text-espresso placeholder-espresso/50 focus:ring-2 focus:ring-clay focus:border-clay focus:outline-none transition-all"
								autoFocus
							/>
							<button
								type="submit"
								className="cursor-pointer bg-clay text-cream px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-clay/90 transition-colors shadow-sm whitespace-nowrap"
							>
								Search
							</button>
						</form>
					</div>
				)}
			</nav>
			<CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
		</>
	);
};

export default Navbar;
