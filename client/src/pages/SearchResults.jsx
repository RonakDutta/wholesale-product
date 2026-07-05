// SearchResults.jsx
import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
	Search,
	SlidersHorizontal,
	X,
	Star,
	Package,
	Store,
	Grid3X3,
	List,
	ArrowUpDown,
	CheckCircle,
	AlertCircle,
	ChevronDown,
	Sparkles,
	TrendingUp,
} from "lucide-react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/all";

gsap.registerPlugin(ScrollToPlugin);

const productData = [
	{
		id: "p1",
		name: "Premium Industrial Packaging Cartons",
		price: 45,
		vendorName: "Apex Traders",
		vendorId: "v_12345",
		location: "Ahmedabad, GJ",
		supplySignal: "High supply",
		verified: true,
		moq: "500 units",
		specs: "3-ply corrugated",
		bulkPrice: 42,
		bulkQuantity: 1000,
		category: "Packaging",
		image: "https://placehold.co/400x300/e2e8f0/1e293b?text=Packaging+Cartons",
	},
	{
		id: "p2",
		name: "Heavy-Duty Shipping Pallets",
		price: 280,
		vendorName: "Bharat Woodworks",
		vendorId: "v_23456",
		location: "Ludhiana, PB",
		supplySignal: "Low stock",
		verified: true,
		moq: "50 units",
		specs: "ISPM 15 certified pine",
		bulkPrice: 265,
		bulkQuantity: 200,
		category: "Packaging",
		image: "https://placehold.co/400x300/d1d5db/1f2937?text=Pallets",
	},
	{
		id: "p3",
		name: '4K USB-C Monitor 27"',
		price: 12500,
		vendorName: "TechVision Distributors",
		vendorId: "v_34567",
		location: "Bengaluru, KA",
		supplySignal: "In stock",
		verified: true,
		moq: "10 units",
		specs: "IPS, 60Hz, 5ms",
		bulkPrice: 11900,
		bulkQuantity: 50,
		category: "Electronics",
		image: "https://placehold.co/400x300/bfdbfe/1e40af?text=Monitor",
	},
	{
		id: "p4",
		name: "Lithium-Ion Battery Pack 48V 20Ah",
		price: 6750,
		vendorName: "EnerGen Solutions",
		vendorId: "v_45678",
		location: "Pune, MH",
		supplySignal: "High supply",
		verified: false,
		moq: "25 units",
		specs: "NMC chemistry, BMS included",
		bulkPrice: 6400,
		bulkQuantity: 100,
		category: "Electronics",
		image: "https://placehold.co/400x300/fef08a/854d0e?text=Battery+Pack",
	},
	{
		id: "p5",
		name: "Industrial Grade Copper Wire (10 AWG)",
		price: 890,
		vendorName: "MetalEx India",
		vendorId: "v_56789",
		location: "Mumbai, MH",
		supplySignal: "Moderate",
		verified: true,
		moq: "200 meters",
		specs: "99.9% pure, bare copper",
		bulkPrice: 845,
		bulkQuantity: 1000,
		category: "Raw Materials",
		image: "https://placehold.co/400x300/fcd34d/92400e?text=Copper+Wire",
	},
	{
		id: "p6",
		name: "Polypropylene Granules (PP)",
		price: 92,
		vendorName: "PlastWorld Corp",
		vendorId: "v_67890",
		location: "Vadodara, GJ",
		supplySignal: "High supply",
		verified: true,
		moq: "500 kg",
		specs: "Injection molding grade",
		bulkPrice: 87,
		bulkQuantity: 2000,
		category: "Raw Materials",
		image: "https://placehold.co/400x300/c7d2fe/4338ca?text=PP+Granules",
	},
	{
		id: "p7",
		name: "Stainless Steel Hex Bolts M12 x 50mm",
		price: 6.5,
		vendorName: "Precision Fasteners",
		vendorId: "v_78901",
		location: "Coimbatore, TN",
		supplySignal: "In stock",
		verified: true,
		moq: "1000 pieces",
		specs: "A2-70, DIN 933",
		bulkPrice: 5.8,
		bulkQuantity: 5000,
		category: "Hardware",
		image: "https://placehold.co/400x300/e5e7eb/374151?text=Hex+Bolts",
	},
	{
		id: "p8",
		name: "Ball Bearings 6205-2RS",
		price: 145,
		vendorName: "SKF Bearing House",
		vendorId: "v_89012",
		location: "Delhi, DL",
		supplySignal: "Low stock",
		verified: true,
		moq: "250 pieces",
		specs: "Double sealed, chrome steel",
		bulkPrice: 132,
		bulkQuantity: 1000,
		category: "Hardware",
		image: "https://placehold.co/400x300/d1d5db/111827?text=Bearings",
	},
	{
		id: "p9",
		name: "Organic Cotton Yarn (Ne 30/1)",
		price: 340,
		vendorName: "GreenThread Textiles",
		vendorId: "v_90123",
		location: "Tiruppur, TN",
		supplySignal: "High supply",
		verified: false,
		moq: "150 kg",
		specs: "Combed, ring-spun, GOTS certified",
		bulkPrice: 315,
		bulkQuantity: 500,
		category: "Textiles",
		image: "https://placehold.co/400x300/f3f4f6/374151?text=Cotton+Yarn",
	},
	{
		id: "p10",
		name: "Sulphuric Acid 98% (Industrial)",
		price: 18.5,
		vendorName: "ChemCore Industries",
		vendorId: "v_01234",
		location: "Vapi, GJ",
		supplySignal: "Moderate",
		verified: true,
		moq: "1000 litres",
		specs: "Technical grade, tanker load",
		bulkPrice: 17.2,
		bulkQuantity: 5000,
		category: "Chemicals",
		image: "https://placehold.co/400x300/fecaca/991b1b?text=Sulphuric+Acid",
	},
];
const mockProducts = productData.map((p) => ({
	...p,
	rating: +(4 + Math.random()).toFixed(1),
	type: "product",
}));

const vendorMap = {};
mockProducts.forEach((p) => {
	if (!vendorMap[p.vendorId]) {
		vendorMap[p.vendorId] = {
			id: p.vendorId,
			name: p.vendorName,
			location: p.location,
			category: p.category,
			logo: `https://ui-avatars.com/api/?name=${p.vendorName.replace(/ /g, "+")}&size=100&background=random`,
			ratings: [],
			verified: p.verified,
		};
	}
	vendorMap[p.vendorId].ratings.push(p.rating);
});
const mockWholesalers = Object.values(vendorMap).map((v) => ({
	...v,
	rating: v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length,
	type: "wholesaler",
}));

const SearchResults = () => {
	const [searchParams] = useSearchParams();
	const query = searchParams.get("q") || "";
	const [activeTab, setActiveTab] = useState("product");
	const [showFilters, setShowFilters] = useState(false);
	const [viewMode, setViewMode] = useState("grid");
	const [sortBy, setSortBy] = useState("relevance");
	const [filters, setFilters] = useState({
		category: "",
		minPrice: "",
		maxPrice: "",
		minRating: "",
	});
	const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(true);
	const resultsRef = useRef(null);

	// ---- Fetch & filter (same as before) ----
	useEffect(() => {
		setLoading(true);
		const timer = setTimeout(() => {
			let data = activeTab === "product" ? mockProducts : mockWholesalers;
			if (query) {
				const lowerQuery = query.toLowerCase();
				data = data.filter((item) => {
					if (activeTab === "product") {
						return (
							item.name.toLowerCase().includes(lowerQuery) ||
							item.vendorName.toLowerCase().includes(lowerQuery)
						);
					} else {
						return (
							item.name.toLowerCase().includes(lowerQuery) ||
							item.location.toLowerCase().includes(lowerQuery)
						);
					}
				});
			}
			if (filters.category) {
				data = data.filter((item) => item.category === filters.category);
			}
			if (activeTab === "product") {
				if (filters.minPrice) {
					data = data.filter(
						(item) => item.price >= parseFloat(filters.minPrice),
					);
				}
				if (filters.maxPrice) {
					data = data.filter(
						(item) => item.price <= parseFloat(filters.maxPrice),
					);
				}
			}
			if (filters.minRating) {
				data = data.filter(
					(item) => item.rating >= parseFloat(filters.minRating),
				);
			}
			if (sortBy === "price-asc") data.sort((a, b) => a.price - b.price);
			else if (sortBy === "price-desc") data.sort((a, b) => b.price - a.price);
			else if (sortBy === "rating") data.sort((a, b) => b.rating - a.rating);

			setResults(data);
			setLoading(false);
		}, 400);
		return () => clearTimeout(timer);
	}, [query, activeTab, filters, sortBy]);

	// ---- Scroll to top ----
	useEffect(() => {
		gsap.to(window, {
			duration: 0.6,
			scrollTo: 0,
			ease: "power2.inOut",
		});
	}, [query]);

	// ---- Animate cards on load ----
	useEffect(() => {
		if (!loading && results.length > 0 && resultsRef.current) {
			const cards = resultsRef.current.querySelectorAll(".result-card");
			gsap.fromTo(
				cards,
				{ opacity: 0, y: 30 },
				{
					opacity: 1,
					y: 0,
					duration: 0.5,
					stagger: 0.06,
					ease: "power2.out",
				},
			);
		}
	}, [loading, results]);

	if (!query) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
				<Search className="w-20 h-20 text-espresso/20 mb-6" strokeWidth={1.5} />
				<h2 className="text-3xl font-bold text-espresso tracking-tight">
					What are you looking for?
				</h2>
				<p className="text-espresso/60 mt-2 max-w-md">
					Enter a product name, wholesaler, or category in the search bar above
					to get started.
				</p>
				<div className="mt-6 flex flex-wrap gap-2 justify-center">
					{["coffee", "copper", "packaging", "electronics", "hardware"].map(
						(suggestion) => (
							<Link
								key={suggestion}
								to={`/search?q=${suggestion}`}
								className="px-4 py-2 bg-white/60 backdrop-blur-sm border border-sage/30 rounded-full text-sm text-espresso hover:bg-clay hover:text-cream transition-colors"
							>
								{suggestion}
							</Link>
						),
					)}
				</div>
			</div>
		);
	}

	const allItems = activeTab === "product" ? mockProducts : mockWholesalers;
	const categories = [...new Set(allItems.map((item) => item.category))];
	const isProductTab = activeTab === "product";

	return (
		<>
			<div className="min-h-screen  py-6 px-4 sm:px-6 lg:px-8">
				<div className="max-w-7xl mx-auto">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
						{/* Left side – result count */}
						<div className="flex items-center gap-3">
							<h1 className="text-xl sm:text-2xl font-bold text-espresso tracking-tight">
								{loading ? (
									"Searching..."
								) : (
									<>
										<span className="text-clay font-extrabold">
											{results.length}
										</span>{" "}
										result{results.length !== 1 ? "s" : ""} for{" "}
										<span className="bg-clay/10 px-2 py-0.5 rounded-md text-clay">
											“{query}”
										</span>
									</>
								)}
							</h1>
							{!loading && results.length > 0 && (
								<Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
							)}
						</div>

						{/* Right side – controls */}
						<div className="flex items-center gap-2 sm:gap-3 flex-wrap">
							{/* View toggle */}
							<div className="flex bg-white/60 backdrop-blur-sm rounded-lg border border-sage/30 p-0.5 shadow-sm">
								<button
									onClick={() => setViewMode("grid")}
									className={`p-1.5 rounded-md transition-all ${
										viewMode === "grid"
											? "bg-clay text-cream shadow-sm"
											: "text-espresso/60 hover:text-espresso hover:bg-white/50"
									}`}
								>
									<Grid3X3 className="w-4 h-4" />
								</button>
								<button
									onClick={() => setViewMode("list")}
									className={`p-1.5 rounded-md transition-all ${
										viewMode === "list"
											? "bg-clay text-cream shadow-sm"
											: "text-espresso/60 hover:text-espresso hover:bg-white/50"
									}`}
								>
									<List className="w-4 h-4" />
								</button>
							</div>

							{/* Sort dropdown */}
							<div className="relative">
								<select
									value={sortBy}
									onChange={(e) => setSortBy(e.target.value)}
									className="appearance-none bg-white/60 backdrop-blur-sm border border-sage/30 rounded-lg py-1.5 pl-3 pr-8 text-sm text-espresso focus:ring-2 focus:ring-clay focus:border-clay outline-none shadow-sm"
								>
									<option value="relevance">Relevance</option>
									<option value="price-asc">Price: Low → High</option>
									<option value="price-desc">Price: High → Low</option>
									<option value="rating">Rating</option>
								</select>
								<ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/40 pointer-events-none" />
							</div>

							{/* Filter button (mobile) – opens drawer */}
							<button
								onClick={() => setIsFilterDrawerOpen(true)}
								className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm border border-sage/30 rounded-lg px-3 py-1.5 text-sm text-espresso shadow-sm sm:hidden"
							>
								<SlidersHorizontal className="w-4 h-4" />
								Filters
							</button>

							{/* Filter button (desktop) – opens sidebar (optional) – but we removed the inline sidebar, so we'll just keep the drawer for all screen sizes? Better to keep the sidebar on desktop for quick access. We'll conditionally show the inline sidebar on desktop and the drawer button only on mobile. */}
						</div>
					</div>

					<div className="flex border-b border-sage/30 mb-6">
						<button
							onClick={() => setActiveTab("product")}
							className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-all ${
								activeTab === "product"
									? "border-clay text-espresso font-semibold"
									: "border-transparent text-espresso/50 hover:text-espresso hover:border-sage/20"
							}`}
						>
							<Package className="w-4 h-4" />
							Products
						</button>
						<button
							onClick={() => setActiveTab("wholesaler")}
							className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-all ${
								activeTab === "wholesaler"
									? "border-clay text-espresso font-semibold"
									: "border-transparent text-espresso/50 hover:text-espresso hover:border-sage/20"
							}`}
						>
							<Store className="w-4 h-4" />
							Wholesalers
						</button>
					</div>

					<div className="flex gap-6">
						{/* Filters Sidebar */}
						<aside className="hidden sm:block w-72 flex-shrink-0 space-y-5 bg-white/60 backdrop-blur-lg rounded-2xl p-5 border border-sage/20 shadow-sm">
							<div className="flex items-center justify-between">
								<h3 className="font-semibold text-espresso flex items-center gap-2">
									<SlidersHorizontal className="w-4 h-4 text-clay" />
									Filters
								</h3>
								<button
									onClick={() => setShowFilters(false)}
									className="sm:hidden"
								>
									<X className="w-4 h-4 text-espresso/60" />
								</button>
							</div>

							{/* Category */}
							<div>
								<label className="block text-sm font-medium text-espresso/70 mb-1">
									Category
								</label>
								<div className="relative">
									<select
										value={filters.category}
										onChange={(e) =>
											setFilters({ ...filters, category: e.target.value })
										}
										className="w-full bg-white/80 border border-sage/30 rounded-xl py-2 px-3 text-sm text-espresso appearance-none focus:ring-2 focus:ring-clay focus:border-clay outline-none"
									>
										<option value="">All Categories</option>
										{categories.map((cat) => (
											<option key={cat} value={cat}>
												{cat}
											</option>
										))}
									</select>
									<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/40 pointer-events-none" />
								</div>
							</div>

							{/* Price Range */}
							{isProductTab && (
								<div>
									<label className="block text-sm font-medium text-espresso/70 mb-1">
										Price Range
									</label>
									<div className="flex gap-2">
										<input
											type="number"
											placeholder="Min"
											value={filters.minPrice}
											onChange={(e) =>
												setFilters({ ...filters, minPrice: e.target.value })
											}
											className="w-1/2 bg-white/80 border border-sage/30 rounded-xl py-2 px-3 text-sm text-espresso focus:ring-2 focus:ring-clay focus:border-clay outline-none"
										/>
										<input
											type="number"
											placeholder="Max"
											value={filters.maxPrice}
											onChange={(e) =>
												setFilters({ ...filters, maxPrice: e.target.value })
											}
											className="w-1/2 bg-white/80 border border-sage/30 rounded-xl py-2 px-3 text-sm text-espresso focus:ring-2 focus:ring-clay focus:border-clay outline-none"
										/>
									</div>
								</div>
							)}

							{/* Rating */}
							<div>
								<label className="block text-sm font-medium text-espresso/70 mb-1">
									Min Rating
								</label>
								<div className="relative">
									<select
										value={filters.minRating}
										onChange={(e) =>
											setFilters({ ...filters, minRating: e.target.value })
										}
										className="w-full bg-white/80 border border-sage/30 rounded-xl py-2 px-3 text-sm text-espresso appearance-none focus:ring-2 focus:ring-clay focus:border-clay outline-none"
									>
										<option value="">Any</option>
										{[1, 2, 3, 4].map((r) => (
											<option key={r} value={r}>
												{r}+ Stars
											</option>
										))}
									</select>
									<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/40 pointer-events-none" />
								</div>
							</div>

							<button
								onClick={() =>
									setFilters({
										category: "",
										minPrice: "",
										maxPrice: "",
										minRating: "",
									})
								}
								className="cursor-pointer w-full py-2.5 bg-clay/10 text-clay text-sm font-medium rounded-xl hover:bg-clay/20 transition-colors shadow-sm"
							>
								Clear All Filters
							</button>
						</aside>

						{/* Results area */}
						<div className="flex-1" ref={resultsRef}>
							{loading ? (
								<div className="flex justify-center items-center h-64">
									<div className="animate-spin rounded-full h-14 w-14 border-4 border-clay/20 border-t-clay"></div>
								</div>
							) : results.length === 0 ? (
								<div className="text-center py-16">
									<div className="text-7xl mb-4">🔍</div>
									<h3 className="text-2xl font-bold text-espresso">
										No results found
									</h3>
									<p className="text-espresso/60 mt-2 max-w-md mx-auto">
										We couldn't find anything matching “{query}”. Try adjusting
										your filters or search for something else.
									</p>
									<button
										onClick={() =>
											setFilters({
												category: "",
												minPrice: "",
												maxPrice: "",
												minRating: "",
											})
										}
										className="mt-6 bg-clay text-cream px-6 py-2.5 rounded-xl hover:bg-clay/90 transition-colors shadow-lg"
									>
										Clear all filters
									</button>
								</div>
							) : (
								<>
									<div
										className={
											viewMode === "grid"
												? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
												: "space-y-4"
										}
									>
										{results.map((item, index) => (
											<ResultCard
												key={item.id}
												item={item}
												viewMode={viewMode}
												//isProduct={isProductTab}
												//index={index}
											/>
										))}
									</div>

									{/* Load More */}
									{results.length > 0 && (
										<div className="flex justify-center mt-10">
											<button className="group relative w-full sm:w-auto px-8 py-3 bg-white/70 backdrop-blur-sm border border-sage/30 rounded-xl text-espresso font-medium shadow-sm hover:shadow-md transition-all hover:bg-clay hover:text-cream hover:border-clay">
												<span className="relative z-10 flex items-center gap-2">
													Load More
													<ArrowUpDown className="w-4 h-4 group-hover:rotate-180 transition-transform" />
												</span>
												<span className="absolute inset-0 rounded-xl bg-gradient-to-r from-clay/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></span>
											</button>
										</div>
									)}
								</>
							)}
						</div>
					</div>
				</div>
			</div>

			{isFilterDrawerOpen && (
				<div
					className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
					onClick={() => setIsFilterDrawerOpen(false)}
				>
					<div
						className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white/95 backdrop-blur-lg shadow-2xl p-5 overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between mb-4">
							<h3 className="font-semibold text-espresso flex items-center gap-2">
								<SlidersHorizontal className="w-4 h-4 text-clay" />
								Filters
							</h3>
							<button onClick={() => setIsFilterDrawerOpen(false)}>
								<X className="cursor-pointer w-5 h-5 text-espresso/60" />
							</button>
						</div>

						<div className="space-y-4">
							{/* Category */}
							<div>
								<label className="block text-sm font-medium text-espresso/70 mb-1">
									Category
								</label>
								<div className="relative">
									<select
										value={filters.category}
										onChange={(e) =>
											setFilters({ ...filters, category: e.target.value })
										}
										className="w-full bg-white/80 border border-sage/30 rounded-xl py-2 px-3 text-sm text-espresso appearance-none focus:ring-2 focus:ring-clay focus:border-clay outline-none"
									>
										<option value="">All Categories</option>
										{categories.map((cat) => (
											<option key={cat} value={cat}>
												{cat}
											</option>
										))}
									</select>
									<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/40 pointer-events-none" />
								</div>
							</div>

							{/* Price Range (only for products) */}
							{isProductTab && (
								<div>
									<label className="block text-sm font-medium text-espresso/70 mb-1">
										Price Range
									</label>
									<div className="flex gap-2">
										<input
											type="number"
											placeholder="Min"
											value={filters.minPrice}
											onChange={(e) =>
												setFilters({ ...filters, minPrice: e.target.value })
											}
											className="w-1/2 bg-white/80 border border-sage/30 rounded-xl py-2 px-3 text-sm text-espresso focus:ring-2 focus:ring-clay focus:border-clay outline-none"
										/>
										<input
											type="number"
											placeholder="Max"
											value={filters.maxPrice}
											onChange={(e) =>
												setFilters({ ...filters, maxPrice: e.target.value })
											}
											className="w-1/2 bg-white/80 border border-sage/30 rounded-xl py-2 px-3 text-sm text-espresso focus:ring-2 focus:ring-clay focus:border-clay outline-none"
										/>
									</div>
								</div>
							)}

							<div>
								<label className="block text-sm font-medium text-espresso/70 mb-1">
									Min Rating
								</label>
								<div className="relative">
									<select
										value={filters.minRating}
										onChange={(e) =>
											setFilters({ ...filters, minRating: e.target.value })
										}
										className="w-full bg-white/80 border border-sage/30 rounded-xl py-2 px-3 text-sm text-espresso appearance-none focus:ring-2 focus:ring-clay focus:border-clay outline-none"
									>
										<option value="">Any</option>
										{[1, 2, 3, 4].map((r) => (
											<option key={r} value={r}>
												{r}+ Stars
											</option>
										))}
									</select>
									<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso/40 pointer-events-none" />
								</div>
							</div>

							<button
								onClick={() => {
									setFilters({
										category: "",
										minPrice: "",
										maxPrice: "",
										minRating: "",
									});
									setIsFilterDrawerOpen(false);
								}}
								className="cursor-pointer w-full py-2.5 bg-clay/10 text-clay text-sm font-medium rounded-xl hover:bg-clay/20 transition-colors shadow-sm"
							>
								Clear All Filters
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

const ResultCard = ({ item, viewMode }) => {
	const isProduct = item.type === "product";
	const linkTo = `/${isProduct ? "product" : "wholesaler"}/${item.id}`;

	const isTopPick = item.rating >= 4.8;

	const SupplyBadge = ({ signal }) => {
		const colorMap = {
			"High supply": "text-green-700 bg-green-100",
			Moderate: "text-yellow-700 bg-yellow-100",
			"Low stock": "text-red-700 bg-red-100",
			"In stock": "text-blue-700 bg-blue-100",
		};
		return (
			<span
				className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${colorMap[signal] || "bg-gray-100 text-gray-700"}`}
			>
				{signal}
			</span>
		);
	};

	if (viewMode === "grid") {
		return (
			<Link
				to={linkTo}
				className="result-card group relative bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-sage/20 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-clay/30"
			>
				{/* Top Pick badge */}
				{isTopPick && (
					<div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-yellow-400/90 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-md backdrop-blur-sm">
						<Sparkles className="w-3 h-3" />
						Top Pick
					</div>
				)}
				<div className="aspect-square bg-sage/10 flex items-center justify-center overflow-hidden">
					<img
						src={isProduct ? item.image : item.logo}
						alt={item.name}
						className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
					/>
				</div>
				<div className="p-4">
					<div className="flex items-start justify-between gap-2">
						<h4 className="font-semibold text-espresso group-hover:text-clay transition-colors line-clamp-1 text-base">
							{item.name}
						</h4>
						{item.verified && (
							<CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
						)}
					</div>

					{isProduct ? (
						<div className="">
							<p className="text-sm text-espresso/60 mt-0.5">
								{item.vendorName}
							</p>
							<div className="flex items-center gap-2 mt-2.5">
								<div className="flex items-center gap-1">
									<Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
									<span className="text-sm font-medium text-espresso/80">
										{item.rating}
									</span>
								</div>
								<SupplyBadge signal={item.supplySignal} />
							</div>
							<div className="flex items-center justify-between mt-2">
								<p className="text-base font-bold text-espresso">
									₹{item.price.toFixed(2)}
								</p>
								{item.bulkPrice && (
									<p className="text-xs text-espresso/50 bg-sage/10 px-2 py-0.5 rounded-full">
										Bulk: ₹{item.bulkPrice}
									</p>
								)}
							</div>
							<p className="text-xs text-espresso/40 mt-1">MOQ: {item.moq}</p>
						</div>
					) : (
						<>
							<p className="text-sm text-espresso/60 mt-0.5">{item.location}</p>
							<div className="flex items-center gap-2 mt-1.5">
								<div className="flex items-center gap-1">
									<Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
									<span className="text-sm font-medium text-espresso/80">
										{item.rating.toFixed(1)}
									</span>
								</div>
								<span className="text-xs text-espresso/40 bg-sage/10 px-2 py-0.5 rounded-full">
									{item.category}
								</span>
							</div>
						</>
					)}
				</div>
				{/* Subtle hover gradient overlay */}
				<div className="absolute inset-0 bg-gradient-to-t from-clay/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
			</Link>
		);
	}

	// List view
	return (
		<Link
			to={linkTo}
			className="result-card group flex items-start gap-5 bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-sage/20 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
		>
			<div className="w-24 h-24 flex-shrink-0 bg-sage/10 rounded-xl overflow-hidden">
				<img
					src={isProduct ? item.image : item.logo}
					alt={item.name}
					className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
				/>
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-start justify-between">
					<h4 className="font-semibold text-espresso group-hover:text-clay transition-colors line-clamp-1 text-lg">
						{item.name}
					</h4>
					<div className="flex items-center gap-1.5">
						{isTopPick && (
							<span className="flex items-center gap-0.5 bg-yellow-400/80 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
								<Sparkles className="w-3 h-3" />
								Top
							</span>
						)}
						{item.verified && (
							<CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
						)}
					</div>
				</div>

				{isProduct ? (
					<>
						<p className="text-sm text-espresso/60">{item.vendorName}</p>
						<div className="flex flex-wrap items-center gap-4 mt-2.5">
							<div className="flex items-center gap-0.5">
								<Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
								<span className="text-sm font-medium text-espresso/80">
									{item.rating}
								</span>
							</div>
							<SupplyBadge signal={item.supplySignal} />
							<span className="text-sm font-semibold text-espresso">
								₹{item.price.toFixed(2)}
							</span>
							{item.bulkPrice && (
								<span className="text-xs text-espresso/50 bg-sage/10 px-2 py-0.5 rounded-full">
									Bulk: ₹{item.bulkPrice}
								</span>
							)}
						</div>
						<div className="flex gap-3 text-xs text-espresso/50 mt-1.5">
							<span>MOQ: {item.moq}</span>
							<span>• {item.location}</span>
						</div>
					</>
				) : (
					<>
						<p className="text-sm text-espresso/60">{item.location}</p>
						<div className="flex items-center gap-2 mt-1">
							<div className="flex items-center gap-0.5">
								<Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
								<span className="text-sm font-medium text-espresso/80">
									{item.rating.toFixed(1)}
								</span>
							</div>
							<span className="text-sm text-espresso/40">
								• {item.category}
							</span>
						</div>
					</>
				)}
			</div>
		</Link>
	);
};

export default SearchResults;
