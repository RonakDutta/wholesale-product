import { useMemo, useState, useCallback } from "react";
import {
	Search,
	ShieldCheck,
	Sparkles,
	ArrowUpDown,
	Filter,
	Star,
	Clock,
	Package,
	SlidersHorizontal,
	ChevronDown,
	X,
	IndianRupee,
	MessageCircle,
	Zap,
} from "lucide-react";
import PropTypes from "prop-types";
import {
	filterSuppliers,
	getBestSupplierMetrics,
	sortSuppliers,
} from "../utils/supplierUtils";
import SupplierComparisonRow from "./SupplierComparisonRow";
import SupplierCard from "./SupplierCard";
import SupplierComparisonModal from "./SupplierComparisonModal";

const SORT_OPTIONS = [
	{ value: "price-asc", label: "Price: Low → High" },
	{ value: "price-desc", label: "Price: High → Low" },
	{ value: "highest-rated", label: "Highest Rated" },
	{ value: "lowest-moq", label: "Lowest MOQ" },
	{ value: "fastest-shipping", label: "Fastest Shipping" },
	{ value: "highest-stock", label: "Highest Stock" },
	{ value: "best-response", label: "Best Response" },
];

const SupplierComparison = ({ product, onAddToCart, onContactSupplier }) => {
	const [sortBy, setSortBy] = useState("price-asc");
	const [search, setSearch] = useState("");
	const [verifiedOnly, setVerifiedOnly] = useState(false);
	const [gstVerifiedOnly, setGstVerifiedOnly] = useState(false);
	const [maxMOQ, setMaxMOQ] = useState("");
	const [maxShipping, setMaxShipping] = useState("");
	const [minRating, setMinRating] = useState(0);
	const [selectedSupplierIds, setSelectedSupplierIds] = useState([]);
	const [modalOpen, setModalOpen] = useState(false);
	const [showAdvanced, setShowAdvanced] = useState(false);

	const filters = useMemo(
		() => ({
			search,
			verifiedOnly,
			gstVerifiedOnly,
			maxMOQ: maxMOQ === "" ? 0 : Number(maxMOQ),
			maxShipping: maxShipping === "" ? 0 : Number(maxShipping),
			minRating,
		}),
		[search, verifiedOnly, gstVerifiedOnly, maxMOQ, maxShipping, minRating],
	);

	const filteredSuppliers = useMemo(
		() => sortSuppliers(filterSuppliers(product.suppliers, filters), sortBy),
		[product.suppliers, filters, sortBy],
	);

	const metrics = useMemo(
		() => getBestSupplierMetrics(filteredSuppliers),
		[filteredSuppliers],
	);

	const selectedSuppliers = useMemo(
		() => filteredSuppliers.filter((s) => selectedSupplierIds.includes(s.id)),
		[filteredSuppliers, selectedSupplierIds],
	);

	const activeAdvancedCount = [maxMOQ, maxShipping, minRating].filter(
		(v) => v !== "" && v !== 0,
	).length;

	const clearAllFilters = useCallback(() => {
		setSearch("");
		setVerifiedOnly(false);
		setGstVerifiedOnly(false);
		setMaxMOQ("");
		setMaxShipping("");
		setMinRating(0);
	}, []);

	const toggleSelect = (id) => {
		setSelectedSupplierIds((prev) => {
			if (prev.includes(id)) return prev.filter((x) => x !== id);
			if (prev.length >= 3) return prev;
			return [...prev, id];
		});
	};

	const handleCompare = () => {
		if (selectedSuppliers.length < 2) return;
		setModalOpen(true);
	};

	const handleBuyNow = (supplier) => {
		onAddToCart(product, supplier.moq, supplier);
	};

	const handleContact = (supplier) => {
		onContactSupplier(supplier);
	};

	const getSupplier = (id) =>
		id ? product.suppliers.find((s) => s.id === id) : null;

	// ── Insight cards: show supplier NAME + value, not just ID ──
	const insightCards = [
		{
			label: "Best Price",
			supplier: getSupplier(metrics.lowestPriceId),
			value: getSupplier(metrics.lowestPriceId)
				? `₹${getSupplier(metrics.lowestPriceId).price?.toLocaleString("en-IN") ?? "—"}`
				: "—",
			color: "text-emerald-700",
			bg: "bg-gradient-to-br from-emerald-50/80 to-white",
			border: "border-emerald-200/60",
			icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
			dot: "bg-emerald-500",
		},
		{
			label: "Fastest Ship",
			supplier: getSupplier(metrics.fastestShippingId),
			value: getSupplier(metrics.fastestShippingId)
				? `${getSupplier(metrics.fastestShippingId).shippingDays} days`
				: "—",
			color: "text-sky-700",
			bg: "bg-gradient-to-br from-sky-50/80 to-white",
			border: "border-sky-200/60",
			icon: <Clock className="w-4 h-4 text-sky-600" />,
			dot: "bg-sky-500",
		},
		{
			label: "Top Rated",
			supplier: getSupplier(metrics.highestRatingId),
			value: getSupplier(metrics.highestRatingId)
				? `${getSupplier(metrics.highestRatingId).rating?.toFixed(1)} ★`
				: "—",
			color: "text-amber-700",
			bg: "bg-gradient-to-br from-amber-50/80 to-white",
			border: "border-amber-200/60",
			icon: <Star className="w-4 h-4 text-amber-600" />,
			dot: "bg-amber-500",
		},
		{
			label: "Lowest MOQ",
			supplier: getSupplier(metrics.lowestMOQId),
			value: getSupplier(metrics.lowestMOQId)
				? (getSupplier(metrics.lowestMOQId).moq?.toLocaleString("en-IN") ?? "—")
				: "—",
			color: "text-violet-700",
			bg: "bg-gradient-to-br from-violet-50/80 to-white",
			border: "border-violet-200/60",
			icon: <Package className="w-4 h-4 text-violet-600" />,
			dot: "bg-violet-500",
		},
	];

	// ── Table column headers ──
	const columns = [
		{ label: "Supplier", align: "left" },
		{ label: "Rating", align: "left" },
		{ label: "Price", align: "left" },
		{ label: "MOQ", align: "left" },
		{ label: "Stock", align: "left" },
		{ label: "Ship", align: "left" },
		{ label: "Response", align: "left" },
		{ label: "", align: "right" },
	];

	return (
		<section className="bg-white border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-200/50 overflow-hidden flex flex-col">
			{/* ━━ Header ━━ */}
			<div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/60 to-white">
				<div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
					<div>
						<div className="flex items-center gap-2 mb-1.5">
							<span className="w-5 h-0.5 bg-clay rounded-full" />
							<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-clay font-mono">
								Vendor Analysis
							</p>
						</div>
						<h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
							Compare Suppliers
						</h2>
						<p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-slate-500">
							{filteredSuppliers.length} vendor
							{filteredSuppliers.length !== 1 ? "s" : ""} available — compare
							pricing, MOQs, and performance to find your ideal partner.
						</p>
					</div>

					<div className="flex items-center gap-2.5 shrink-0 mt-1 md:mt-0">
						<span className="text-[11px] font-medium text-slate-400 tabular-nums">
							{selectedSupplierIds.length}/3 selected
						</span>
						<button
							type="button"
							disabled={selectedSuppliers.length < 2}
							onClick={handleCompare}
							className="cursor-pointer group flex items-center justify-center gap-2 rounded-lg bg-clay px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm shadow-clay/20 transition-all hover:bg-clay/90 hover:shadow-md hover:shadow-clay/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:border disabled:border-slate-200"
						>
							<Zap className="w-3.5 h-3.5" />
							Compare
							{selectedSuppliers.length > 0 && (
								<span className="flex h-4 min-w-4 items-center justify-center rounded-md bg-white/20 px-1 text-[10px] font-bold tabular-nums group-disabled:bg-slate-200 group-disabled:text-slate-500">
									{selectedSuppliers.length}
								</span>
							)}
						</button>
					</div>
				</div>

				<div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-5">
					{insightCards.map((card) => (
						<div
							key={card.label}
							className={`rounded-xl border ${card.border} ${card.bg} p-3.5 flex flex-col justify-between transition-shadow hover:shadow-sm`}
						>
							<div className="flex items-center justify-between mb-2.5">
								<p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
									{card.label}
								</p>
								{card.icon}
							</div>
							{card.supplier ? (
								<>
									<p
										className={`text-[16px] font-bold ${card.color} truncate leading-tight`}
									>
										{card.supplier.name}
									</p>
									<p className="mt-1 text-[12.5px] text-slate-600 font-mono tabular-nums">
										{card.value}
									</p>
								</>
							) : (
								<p className={`font-mono text-sm ${card.color}`}>
									{card.value}
								</p>
							)}
						</div>
					))}
				</div>
			</div>

			{/* ━━ Filter bar ━━ */}
			<div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-white flex flex-col gap-3">
				{/* Primary row */}
				<div className="flex flex-wrap items-center gap-2.5">
					{/* Search */}
					<div className="relative w-full sm:w-64 shrink-0">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search vendor or location…"
							className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-clay/40 focus:bg-white focus:ring-2 focus:ring-clay/10"
						/>
					</div>

					{/* Sort */}
					<div className="relative flex items-center shrink-0">
						<ArrowUpDown className="absolute left-2.5 h-3 w-3 text-slate-400 pointer-events-none" />
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value)}
							className="appearance-none rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-7 pr-8 text-[13px] font-medium text-slate-700 outline-none transition-all focus:border-clay/40 focus:bg-white focus:ring-2 focus:ring-clay/10 cursor-pointer"
						>
							{SORT_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>

					{/* Verified toggle */}
					<button
						onClick={() => setVerifiedOnly(!verifiedOnly)}
						className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
							verifiedOnly
								? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm shadow-emerald-100/50"
								: "bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-100"
						}`}
					>
						<ShieldCheck
							className={`w-3.5 h-3.5 ${verifiedOnly ? "text-emerald-600" : "text-slate-400"}`}
						/>
						Verified
					</button>

					{/* GST toggle */}
					<button
						onClick={() => setGstVerifiedOnly(!gstVerifiedOnly)}
						className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
							gstVerifiedOnly
								? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm shadow-blue-100/50"
								: "bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-100"
						}`}
					>
						GST
					</button>

					{/* Advanced toggle */}
					<button
						onClick={() => setShowAdvanced(!showAdvanced)}
						className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
							showAdvanced || activeAdvancedCount > 0
								? "bg-clay/[0.06] border-clay/20 text-clay"
								: "bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-100"
						}`}
					>
						<SlidersHorizontal className="w-3.5 h-3.5" />
						Filters
						{activeAdvancedCount > 0 && (
							<span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[9px] font-bold text-white">
								{activeAdvancedCount}
							</span>
						)}
						<ChevronDown
							className={`w-3 h-3 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
						/>
					</button>

					{(search ||
						verifiedOnly ||
						gstVerifiedOnly ||
						activeAdvancedCount > 0) && (
						<button
							onClick={clearAllFilters}
							className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
						>
							<X className="w-3 h-3" />
							Clear
						</button>
					)}
				</div>

				{/* Advanced row (collapsible) */}
				<div
					className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 transition-all duration-300 ease-out overflow-hidden ${
						showAdvanced
							? "max-h-20 opacity-100 mt-1"
							: "max-h-0 opacity-0 mt-0"
					}`}
				>
					<div className="flex items-center border border-slate-200 rounded-lg bg-slate-50/50 overflow-hidden focus-within:border-clay/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-clay/10 transition-all">
						<span className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 bg-slate-100/80 border-r border-slate-200 select-none whitespace-nowrap">
							Max MOQ
						</span>
						<input
							type="number"
							min="0"
							placeholder="Any"
							value={maxMOQ}
							onChange={(e) => setMaxMOQ(e.target.value)}
							className="w-full px-2.5 py-2 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
						/>
					</div>
					<div className="flex items-center border border-slate-200 rounded-lg bg-slate-50/50 overflow-hidden focus-within:border-clay/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-clay/10 transition-all">
						<span className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 bg-slate-100/80 border-r border-slate-200 select-none whitespace-nowrap">
							Max Days
						</span>
						<input
							type="number"
							min="0"
							placeholder="Any"
							value={maxShipping}
							onChange={(e) => setMaxShipping(e.target.value)}
							className="w-full px-2.5 py-2 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
						/>
					</div>
					<div className="flex items-center border border-slate-200 rounded-lg bg-slate-50/50 overflow-hidden focus-within:border-clay/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-clay/10 transition-all">
						<span className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 bg-slate-100/80 border-r border-slate-200 select-none whitespace-nowrap">
							Min Rating
						</span>
						<input
							type="number"
							min="0"
							max="5"
							step="0.1"
							placeholder="Any"
							value={minRating || ""}
							onChange={(e) =>
								setMinRating(e.target.value === "" ? 0 : Number(e.target.value))
							}
							className="w-full px-2.5 py-2 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
						/>
					</div>
				</div>
			</div>

			{/* ━━ Desktop Table ━━ */}
			<div className="hidden md:block overflow-x-auto bg-white">
				<table className="min-w-full text-left text-sm border-collapse">
					<thead>
						<tr className="border-b border-slate-100">
							{columns.map((col, idx) => (
								<th
									key={idx}
									className={`whitespace-nowrap px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 font-mono ${
										col.align === "right" ? "text-right" : ""
									}`}
								>
									{col.label}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100/80">
						{filteredSuppliers.length > 0 ? (
							filteredSuppliers.map((supplier) => (
								<SupplierComparisonRow
									key={supplier.id}
									supplier={supplier}
									isSelected={selectedSupplierIds.includes(supplier.id)}
									onToggleSelect={toggleSelect}
									productName={product.name}
									onBuyNow={handleBuyNow}
									badges={{
										lowestPrice: metrics.lowestPriceId === supplier.id,
										lowestMOQ: metrics.lowestMOQId === supplier.id,
										highestRating: metrics.highestRatingId === supplier.id,
										fastestShipping: metrics.fastestShippingId === supplier.id,
										bestResponse: metrics.bestResponseId === supplier.id,
										highestStock: metrics.highestStockId === supplier.id,
									}}
								/>
							))
						) : (
							<tr>
								<td colSpan={8} className="py-16 text-center">
									<div className="flex flex-col items-center gap-3">
										<div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
											<Filter className="w-5 h-5 text-slate-400" />
										</div>
										<div>
											<p className="text-sm font-semibold text-slate-600">
												No suppliers match your filters
											</p>
											<p className="mt-1 text-[13px] text-slate-400">
												Try adjusting your search or filter criteria
											</p>
										</div>
										<button
											onClick={clearAllFilters}
											className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
										>
											<X className="w-3 h-3" />
											Clear All Filters
										</button>
									</div>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* ━━ Mobile Cards ━━ */}
			<div className="p-3 grid gap-2.5 md:hidden bg-slate-50/40">
				{filteredSuppliers.length > 0 ? (
					filteredSuppliers.map((supplier) => (
						<SupplierCard
							key={supplier.id}
							supplier={supplier}
							isSelected={selectedSupplierIds.includes(supplier.id)}
							onToggleSelect={toggleSelect}
							productName={product.name}
							onBuyNow={handleBuyNow}
							badges={{
								lowestPrice: metrics.lowestPriceId === supplier.id,
								lowestMOQ: metrics.lowestMOQId === supplier.id,
								highestRating: metrics.highestRatingId === supplier.id,
								fastestShipping: metrics.fastestShippingId === supplier.id,
								bestResponse: metrics.bestResponseId === supplier.id,
								highestStock: metrics.highestStockId === supplier.id,
							}}
						/>
					))
				) : (
					<div className="py-12 text-center border border-dashed border-slate-300 rounded-xl bg-white">
						<Filter className="w-5 h-5 mx-auto mb-2 text-slate-300" />
						<p className="text-sm text-slate-500">No suppliers found.</p>
						<button
							onClick={clearAllFilters}
							className="mt-3 text-[11px] font-bold uppercase tracking-wider text-clay hover:underline cursor-pointer"
						>
							Clear Filters
						</button>
					</div>
				)}
			</div>

			<SupplierComparisonModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
				suppliers={selectedSuppliers}
				metrics={metrics}
				onBuyNow={handleBuyNow}
				onContact={handleContact}
				productName={product.name}
			/>
		</section>
	);
};

SupplierComparison.propTypes = {
	product: PropTypes.shape({
		suppliers: PropTypes.arrayOf(PropTypes.object).isRequired,
		name: PropTypes.string,
	}).isRequired,
	onAddToCart: PropTypes.func.isRequired,
	onContactSupplier: PropTypes.func,
};

SupplierComparison.defaultProps = {
	onContactSupplier: () => {},
};

export default SupplierComparison;
