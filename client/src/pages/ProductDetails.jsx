import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
	ArrowLeft,
	ShieldCheck,
	MapPin,
	IndianRupee,
	Layers,
	Scale,
	Truck,
	TrendingDown,
	Building2,
	Calculator,
	Minus,
	Plus,
	ShoppingBag,
	Check,
	Tag,
	Heart,
	Star,
	Clock,
	Package,
	Zap,
	ChevronRight,
	Info,
} from "lucide-react";
import { gsap } from "gsap";
import mockProducts from "../utils/mockProducts";
import ContactVendorBtn from "../components/ContactVendorBtn";
import SupplierComparison from "../components/SupplierComparison";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import {
	getCheapestSupplier,
	getEffectivePrice,
	getSupplyLabel,
} from "../utils/supplierUtils";

const ProductDetails = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const pageRef = useRef(null);
	const addToCartBtnRef = useRef(null);
	const { addToCart } = useCart();
	const { toggleWishlist, isWishlisted } = useWishlist();

	const product = mockProducts.find((p) => p.id === id) || mockProducts[0];
	const suppliers = product.suppliers ?? [];

	const [selectedSupplierId, setSelectedSupplierId] = useState(
		() => getCheapestSupplier(product)?.id ?? suppliers[0]?.id ?? null,
	);
	const [quantity, setQuantity] = useState(1);
	const [justAdded, setJustAdded] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);

	const selectedSupplier =
		suppliers.find((s) => s.id === selectedSupplierId) ?? suppliers[0] ?? {};
	const baseMoq = selectedSupplier.moq ?? 1;
	const quantityStep = Math.max(1, Math.round(baseMoq / 10));

	useEffect(() => {
		setSelectedSupplierId(
			getCheapestSupplier(product)?.id ?? product.suppliers?.[0]?.id ?? null,
		);
	}, [id]);

	useEffect(() => {
		setQuantity(baseMoq);
		setImageLoaded(false);
	}, [selectedSupplierId, baseMoq]);

	const currentUnitPrice = getEffectivePrice(selectedSupplier);
	const totalCost = currentUnitPrice * quantity;

	const unitSavings =
		(selectedSupplier.price ?? 0) - (selectedSupplier.discountPrice ?? 0);
	const savingsPercent =
		selectedSupplier.price > 0
			? Math.round((unitSavings / selectedSupplier.price) * 100)
			: 0;

	const wishlisted = isWishlisted(product.id);
	const location =
		selectedSupplier.city && selectedSupplier.country
			? `${selectedSupplier.city}, ${selectedSupplier.country}`
			: "India";
	const supplySignal = getSupplyLabel(selectedSupplier.stock);
	const responseTimeSpec = selectedSupplier.responseTime || "Standard options";

	useEffect(() => {
		window.scrollTo(0, 0);
		let ctx = gsap.context(() => {
			gsap.fromTo(
				".detail-fade-in",
				{ y: 20, opacity: 0 },
				{ y: 0, opacity: 1, duration: 0.6, stagger: 0.07, ease: "power3.out" },
			);
		}, pageRef);
		return () => ctx.revert();
	}, [id]);

	const handleQuantityChange = (val) => {
		if (isNaN(val) || val < baseMoq) {
			setQuantity(baseMoq);
		} else {
			setQuantity(val);
		}
	};

	const handleAddToCart = () => {
		addToCart(product, quantity, selectedSupplier);
		setJustAdded(true);
		setTimeout(() => setJustAdded(false), 1800);
	};

	const totalSavings = unitSavings * quantity;

	return (
		<div
			ref={pageRef}
			className="w-full flex flex-col gap-8 pb-20 max-w-7xl mx-auto"
		>
			{/* ━━ Breadcrumb Bar ━━ */}
			<div className="detail-fade-in flex items-center justify-between py-1">
				<button
					onClick={() => navigate(-1)}
					className="group flex items-center gap-2 text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
				>
					<span className="flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-white shadow-sm group-hover:border-slate-300 group-hover:shadow transition-all">
						<ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
					</span>
					<span className="hidden sm:inline">Marketplace</span>
					<ChevronRight className="w-3 h-3 text-slate-300 hidden sm:inline" />
					<span className="hidden sm:inline text-slate-800">Product</span>
				</button>
				<span className="text-[11px] font-mono text-slate-400 tracking-wider bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
					ID: {product.id}
				</span>
			</div>

			{/* ━━ Main Grid ━━ */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
				{/* ── Left Column: Image + Meta Cards ── */}
				<div className="detail-fade-in lg:col-span-5 flex flex-col gap-4">
					{/* Image Container */}
					<div className="group relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-sm">
						{/* Skeleton shimmer while loading */}
						{!imageLoaded && (
							<div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse" />
						)}
						<img
							src={product.image}
							alt={product.name}
							onLoad={() => setImageLoaded(true)}
							className={`object-cover w-full h-full transition-all duration-700 group-hover:scale-[1.03] ${
								imageLoaded ? "opacity-100" : "opacity-0"
							}`}
						/>
						{/* Bottom gradient overlay */}
						<div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

						{/* Supply badge */}
						<div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-white/50 shadow-lg shadow-black/[0.04]">
							<span
								className={`w-1.5 h-1.5 rounded-full ${
									selectedSupplier.stock > 100
										? "bg-emerald-500"
										: selectedSupplier.stock > 20
											? "bg-amber-500"
											: "bg-rose-500"
								}`}
							/>
							{supplySignal}
						</div>

						{/* Category badge */}
						<div className="absolute top-3.5 left-3.5 bg-white/90 backdrop-blur-sm text-slate-600 text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1.5 rounded-xl border border-white/50 shadow-lg shadow-black/[0.04]">
							{product.category}
						</div>
					</div>

					{/* Meta Info Cards */}
					<div className="grid grid-cols-3 gap-2.5">
						{[
							{
								icon: <Package className="w-4 h-4" />,
								label: "Min Order",
								value: baseMoq.toLocaleString("en-IN"),
								color: "text-violet-600",
								bg: "bg-violet-50",
							},
							{
								icon: <Clock className="w-4 h-4" />,
								label: "Response",
								value: responseTimeSpec,
								color: "text-sky-600",
								bg: "bg-sky-50",
							},
							{
								icon: <Truck className="w-4 h-4" />,
								label: "Shipping",
								value: selectedSupplier.shippingDays
									? `${selectedSupplier.shippingDays} days`
									: "FOB",
								color: "text-amber-600",
								bg: "bg-amber-50",
							},
						].map((card) => (
							<div
								key={card.label}
								className="bg-white border border-slate-200/80 rounded-xl p-3 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow duration-200"
							>
								<div
									className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center ${card.color} mb-2`}
								>
									{card.icon}
								</div>
								<span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 leading-none">
									{card.label}
								</span>
								<span className="text-[13px] font-bold text-slate-800 mt-1.5 truncate max-w-full leading-tight">
									{card.value}
								</span>
							</div>
						))}
					</div>

					{/* Rating + Reviews card (if available) */}
					{selectedSupplier.rating > 0 && (
						<div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-4">
							<div className="flex items-center gap-1.5">
								<div className="flex items-center gap-0.5">
									{[...Array(5)].map((_, i) => (
										<Star
											key={i}
											className={`w-4 h-4 ${
												i < Math.round(selectedSupplier.rating)
													? "text-amber-400 fill-amber-400"
													: "text-slate-200 fill-slate-200"
											}`}
										/>
									))}
								</div>
								<span className="text-sm font-bold text-slate-800 tabular-nums">
									{selectedSupplier.rating.toFixed(1)}
								</span>
							</div>
							<div className="w-px h-5 bg-slate-200" />
							<span className="text-[13px] text-slate-500">
								<span className="font-bold text-slate-700">
									{selectedSupplier.reviews?.toLocaleString("en-IN") ?? 0}
								</span>{" "}
								reviews
							</span>
							{selectedSupplier.completedOrders > 0 && (
								<>
									<div className="w-px h-5 bg-slate-200" />
									<span className="text-[13px] text-slate-500">
										<span className="font-bold text-slate-700">
											{selectedSupplier.completedOrders?.toLocaleString(
												"en-IN",
											)}
										</span>{" "}
										orders
									</span>
								</>
							)}
						</div>
					)}
				</div>

				{/* ── Right Column: Details + Pricing + Actions ── */}
				<div className="detail-fade-in lg:col-span-7 flex flex-col gap-5">
					{/* Vendor Header */}
					<div className="flex flex-col gap-2.5">
						<div className="flex flex-wrap items-center gap-2.5">
							<span className="text-[15px] font-bold text-slate-800">
								{selectedSupplier.name}
							</span>
							{selectedSupplier.verified && (
								<span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-lg ring-1 ring-inset ring-emerald-600/15">
									<ShieldCheck className="w-3 h-3" strokeWidth={2.5} />
									Verified
								</span>
							)}
							{selectedSupplier.gstVerified && (
								<span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-lg ring-1 ring-inset ring-blue-600/15">
									GST
								</span>
							)}
						</div>
						<div className="flex items-center gap-2 text-[13px] text-slate-500">
							<MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
							<span>{location}</span>
							<span className="text-slate-200">|</span>
							<Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
							<span className="text-slate-400">{product.category}</span>
						</div>
					</div>

					{/* Product Title */}
					<h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-[1.15] tracking-tight">
						{product.name}
					</h1>

					{/* ── Vendor Switcher ── */}
					{suppliers.length > 1 && (
						<div className="flex flex-col gap-2.5">
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
									{suppliers.length} suppliers available
								</span>
								<span className="text-[10px] text-slate-400 flex items-center gap-1">
									<Info className="w-3 h-3" />
									Click to switch
								</span>
							</div>
							<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
								{suppliers.map((s) => {
									const active = s.id === selectedSupplierId;
									const isCheapest = getCheapestSupplier(product)?.id === s.id;
									return (
										<button
											key={s.id}
											type="button"
											onClick={() => setSelectedSupplierId(s.id)}
											className={`shrink-0 relative flex flex-col gap-1 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 cursor-pointer group/supp ${
												active
													? "border-clay/40 bg-clay/[0.04] shadow-sm shadow-clay/10 ring-1 ring-inset ring-clay/10"
													: "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm"
											}`}
										>
											{isCheapest && !active && (
												<span className="absolute -top-1.5 left-2.5 bg-emerald-500 text-white text-[7px] font-bold px-1.5 py-px rounded-md uppercase tracking-wider">
													Cheapest
												</span>
											)}
											<span className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800 leading-tight">
												{s.name}
												{s.verified && (
													<ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
												)}
											</span>
											<span className="font-mono text-[13px] font-bold text-clay tabular-nums">
												₹{getEffectivePrice(s)}
												<span className="text-slate-400 font-normal text-[11px]">
													/unit
												</span>
											</span>
										</button>
									);
								})}
							</div>
						</div>
					)}

					{/* ── Pricing Section ── */}
					<div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
						{savingsPercent > 0 && (
							<div className="bg-gradient-to-r from-emerald-50 to-emerald-50/50 px-4 py-2.5 border-b border-emerald-100 flex items-center gap-2">
								<Tag className="w-3.5 h-3.5 text-emerald-600" />
								<span className="text-[11px] font-bold text-emerald-700 tracking-wide">
									Save {savingsPercent}% with bulk pricing — you save{" "}
									<span className="font-mono font-black">
										₹{totalSavings.toLocaleString("en-IN")}
									</span>{" "}
									on this order
								</span>
							</div>
						)}

						<div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
							{/* Standard Price */}
							<div className="border border-slate-200 rounded-xl p-4 flex flex-col bg-slate-50/40">
								<span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">
									Standard Rate
								</span>
								<div className="flex items-baseline gap-0.5 font-mono">
									<IndianRupee
										className="w-4 h-4 text-slate-500 shrink-0"
										strokeWidth={2.5}
									/>
									<span className="text-2xl font-bold text-slate-700 tabular-nums">
										{selectedSupplier.price ?? 0}
									</span>
									<span className="text-[11px] text-slate-400 ml-1.5 font-medium">
										/unit
									</span>
								</div>
								<span className="text-[11px] text-slate-400 mt-2.5 font-medium flex items-center gap-1">
									<Package className="w-3 h-3" />
									Min. order: {baseMoq.toLocaleString("en-IN")}
								</span>
							</div>

							{/* Bulk Price */}
							<div
								className={`rounded-xl p-4 flex flex-col relative transition-all duration-200 ${
									savingsPercent > 0
										? "border-2 border-clay/30 bg-gradient-to-br from-clay/[0.04] to-clay/[0.01] ring-1 ring-inset ring-clay/5"
										: "border border-clay/20 bg-clay/[0.03]"
								}`}
							>
								{savingsPercent > 0 && (
									<div className="absolute -top-2.5 right-3 flex items-center gap-1 bg-clay text-white text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider shadow-sm shadow-clay/20">
										<Zap className="w-3 h-3" strokeWidth={3} />
										Best Value
									</div>
								)}
								<span className="text-[9px] font-bold uppercase tracking-[0.15em] text-clay/70 mb-3">
									{savingsPercent > 0 ? "Bulk Rate" : "Unit Price"}
								</span>
								<div className="flex items-baseline gap-0.5 font-mono">
									<IndianRupee
										className="w-4 h-4 text-clay shrink-0"
										strokeWidth={3}
									/>
									<span className="text-2xl font-black text-clay tabular-nums tracking-tight">
										{getEffectivePrice(selectedSupplier)}
									</span>
									<span className="text-[11px] text-clay/60 ml-1.5 font-bold">
										/unit
									</span>
								</div>
								{savingsPercent > 0 && (
									<div className="flex items-center gap-2 mt-2.5">
										<span className="text-[11px] text-slate-400 font-medium line-through decoration-slate-300 tabular-nums">
											₹{selectedSupplier.price ?? 0}
										</span>
										<span className="text-[11px] text-clay font-bold tabular-nums">
											-₹{Math.abs(unitSavings).toFixed(2)} each
										</span>
									</div>
								)}
							</div>
						</div>
					</div>

					<div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
						<div className="flex items-center gap-2 mb-4">
							<div className="w-7 h-7 rounded-lg bg-clay/10 flex items-center justify-center">
								<Calculator className="w-3.5 h-3.5 text-clay" />
							</div>
							<span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-600">
								Calculate Order Total
							</span>
						</div>

						<div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-5">
							{/* Quantity input */}
							<div className="flex flex-col gap-2 flex-1">
								<label className="text-[12px] font-semibold text-slate-600">
									Order Quantity
								</label>
								<div className="flex items-stretch border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-clay/15 focus-within:border-clay/30 transition-all bg-white">
									<button
										type="button"
										disabled={quantity <= baseMoq}
										onClick={() =>
											handleQuantityChange(quantity - quantityStep)
										}
										className={`px-4 flex items-center justify-center bg-slate-50 border-r border-slate-100 shrink-0 transition-all ${
											quantity <= baseMoq
												? "text-slate-300 cursor-not-allowed"
												: "text-slate-500 hover:bg-clay/5 hover:text-clay cursor-pointer active:scale-95"
										}`}
										aria-label="Decrease quantity"
									>
										<Minus className="w-4 h-4" />
									</button>
									<input
										type="number"
										min={baseMoq}
										value={quantity}
										onChange={(e) =>
											handleQuantityChange(parseInt(e.target.value))
										}
										className="w-full min-w-0 text-center py-3 text-lg font-mono font-bold text-slate-900 focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none tabular-nums"
									/>
									<button
										type="button"
										onClick={() =>
											handleQuantityChange(quantity + quantityStep)
										}
										className="px-4 flex items-center justify-center text-slate-500 bg-slate-50 hover:bg-clay/5 hover:text-clay transition-all cursor-pointer border-l border-slate-100 shrink-0 active:scale-95"
										aria-label="Increase quantity"
									>
										<Plus className="w-4 h-4" />
									</button>
								</div>
								<span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
									<Info className="w-3 h-3" />
									Steps of {quantityStep} · Minimum{" "}
									{baseMoq.toLocaleString("en-IN")}
								</span>
							</div>

							{/* Price summary */}
							<div className="flex sm:flex-col justify-between sm:justify-center gap-4 sm:gap-3 px-5 sm:px-6 py-4 sm:py-5 rounded-xl bg-slate-50/80 border border-slate-100 shrink-0">
								<div>
									<span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">
										Per Unit
									</span>
									<span className="text-[15px] font-bold text-slate-700 font-mono tabular-nums">
										₹{currentUnitPrice}
									</span>
								</div>
								<div className="w-px h-8 sm:w-full sm:h-px bg-slate-200" />
								<div>
									<span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">
										Total
									</span>
									<span className="text-xl font-black text-clay font-mono tabular-nums tracking-tight">
										₹{totalCost.toLocaleString("en-IN")}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* ── Action Buttons ── */}
					<div className="flex flex-col gap-2.5 mt-1">
						<div className="grid grid-cols-[1fr_auto] gap-2.5">
							<ContactVendorBtn
								vendorId={selectedSupplier.id}
								vendorName={selectedSupplier.name}
								productName={product.name}
								vendorPhone={
									selectedSupplier.phone ??
									selectedSupplier.contactNo ??
									selectedSupplier.mobile
								}
							/>
							<button
								type="button"
								onClick={() => toggleWishlist(product)}
								className={`flex items-center justify-center gap-2 px-5 py-3 text-[12px] font-bold rounded-xl transition-all cursor-pointer active:scale-[0.97] border ${
									wishlisted
										? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 shadow-sm shadow-rose-100/50"
										: "bg-white border-slate-200 text-slate-600 hover:border-rose-200 hover:text-rose-500 hover:shadow-sm"
								}`}
							>
								<Heart
									className={`w-4 h-4 shrink-0 transition-all duration-300 ${
										wishlisted ? "fill-rose-500 scale-110" : ""
									}`}
								/>
								<span className="hidden sm:inline">
									{wishlisted ? "Saved" : `Wishlist this`}
								</span>
							</button>
						</div>

						<button
							ref={addToCartBtnRef}
							onClick={handleAddToCart}
							disabled={justAdded}
							className={`w-full flex items-center justify-center gap-2.5 py-4 text-[13px] font-bold rounded-xl transition-all duration-300 cursor-pointer active:scale-[0.99] ${
								justAdded
									? "bg-emerald-600 text-white shadow-lg shadow-emerald-200/50 scale-[1.01]"
									: "bg-clay text-white hover:bg-clay/90 hover:shadow-lg hover:shadow-clay/15 shadow-sm shadow-clay/10"
							}`}
						>
							{justAdded ? (
								<>
									<span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
										<Check className="w-4 h-4 shrink-0" strokeWidth={3} />
									</span>
									<span>Added to Cart</span>
								</>
							) : (
								<>
									<ShoppingBag className="w-5 h-5 shrink-0" />
									<span>
										Add to Cart — ₹{totalCost.toLocaleString("en-IN")}
									</span>
								</>
							)}
						</button>
					</div>
				</div>
			</div>

			{/* ━━ Supplier Comparison Table ━━ */}
			<SupplierComparison
				product={product}
				onAddToCart={(productObj, qty, supplier) => {
					addToCart(productObj, qty, supplier);
					setSelectedSupplierId(supplier.id);
				}}
				onContactSupplier={(supplier) => {
					setSelectedSupplierId(supplier.id);
					console.log("Contact supplier:", supplier.name, supplier.id);
				}}
			/>
		</div>
	);
};

export default ProductDetails;
