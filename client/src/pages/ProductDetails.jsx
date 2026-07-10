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
	Zap,
	Building2,
	Calculator,
	Minus,
	Plus,
	ShoppingBag,
	Check,
	Tag,
	Heart,
	Info,
} from "lucide-react";
import { gsap } from "gsap";
import api from "../utils/axios";
import { toast } from "sonner";
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

	const [product, setProduct] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [selectedSupplierId, setSelectedSupplierId] = useState(null);
	const [quantity, setQuantity] = useState(1);
	const [justAdded, setJustAdded] = useState(false);

	useEffect(() => {
		const fetchProduct = async () => {
			try {
				setLoading(true);
				setError(null);
				const res = await api.get(`/api/products/${id}`);

				// Transform suppliers to match the UI's expected shape
				const transformed = {
					...res.data,
					suppliers: res.data.suppliers.map((s) => ({
						id: s.supplierId, // use actual user ID for contact & keys
						inventoryId: s.id, // keep original inventory ID if needed
						name: s.companyName,
						price: s.price,
						discountPrice: s.discountPrice,
						moq: s.moq,
						stock: s.stock,
						shippingDays: s.shippingDays,
						city: s.city,
						country: s.country,
						verified: s.verified,
						responseTime: s.responseTime,
						contactNo: s.contactPhone, // for ContactVendorBtn
					})),
				};

				setProduct(transformed);
			} catch (err) {
				console.error("Failed to fetch product:", err);
				setError(err.response?.data?.message || "Product not found.");
				toast.error("Could not load product details.");
			} finally {
				setLoading(false);
			}
		};

		if (id) fetchProduct();
	}, [id]);

	useEffect(() => {
		if (product?.suppliers?.length) {
			setSelectedSupplierId(
				getCheapestSupplier(product)?.id ?? product.suppliers[0]?.id ?? null,
			);
		}
	}, [product]);

	const suppliers = product?.suppliers ?? [];
	const selectedSupplier =
		suppliers.find((s) => s.id === selectedSupplierId) ?? suppliers[0] ?? {};
	const baseMoq = selectedSupplier.moq ?? 1;
	const quantityStep = Math.max(1, Math.round(baseMoq / 10));

	// Quantity always starts at (and can't go below) the selected supplier's MOQ
	useEffect(() => {
		if (selectedSupplierId) setQuantity(baseMoq);
	}, [selectedSupplierId, baseMoq]);

	const currentUnitPrice = getEffectivePrice(selectedSupplier);
	const totalCost = currentUnitPrice * quantity;

	const unitSavings =
		(selectedSupplier.price ?? 0) - (selectedSupplier.discountPrice ?? 0);
	const savingsPercent =
		selectedSupplier.price > 0
			? Math.round((unitSavings / selectedSupplier.price) * 100)
			: 0;

	const wishlisted = product ? isWishlisted(product.id) : false;
	const location =
		selectedSupplier.city && selectedSupplier.country
			? `${selectedSupplier.city}, ${selectedSupplier.country}`
			: "India";
	const supplySignal = getSupplyLabel(selectedSupplier.stock);
	const responseTimeSpec = selectedSupplier.responseTime || "Standard options";

	// --- GSAP animations ---
	useEffect(() => {
		window.scrollTo(0, 0);
		let ctx = gsap.context(() => {
			gsap.fromTo(
				".detail-fade-in",
				{ y: 15, opacity: 0 },
				{ y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power2.out" },
			);
		}, pageRef);
		return () => ctx.revert();
	}, [id]);

	// --- Handlers ---
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
		setTimeout(() => setJustAdded(false), 1600);
	};

	// --- Loading & Error states ---
	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clay"></div>
			</div>
		);
	}

	if (error || !product) {
		return (
			<div className="flex flex-col items-center justify-center h-64 text-center">
				<p className="text-red-600 font-medium">
					{error || "Product not found"}
				</p>
				<button
					onClick={() => navigate(-1)}
					className="mt-4 px-4 py-2 bg-clay text-white rounded-lg"
				>
					Go Back
				</button>
			</div>
		);
	}

	// --- Render (unchanged from original) ---
	return (
		<div
			ref={pageRef}
			className="w-full flex flex-col gap-6 pb-16 max-w-7xl mx-auto"
		>
			{/* Back Navigation Bar */}
			<div className="detail-fade-in flex items-center justify-between py-2 border-b border-slate-200">
				<button
					onClick={() => navigate(-1)}
					className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
				>
					<ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
					Back to Marketplace
				</button>
				<span className="text-xs font-mono text-slate-400 uppercase tracking-wider hidden sm:inline">
					Product ID: {product.id}
				</span>
			</div>

			{/* Main Structural Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 items-start">
				{/* Left Side: Product Image Display Panel */}
				<div className="detail-fade-in flex flex-col gap-4">
					<div className="group relative w-full aspect-4/3 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
						<img
							src={product.image}
							alt={product.name}
							className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
						/>
						<div className="absolute top-3 right-3 bg-white/95 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
							{supplySignal}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-2 text-center">
						<div className="bg-white border border-slate-200 p-3 rounded-lg flex flex-col items-center justify-center shadow-xs">
							<Scale className="w-5 h-5 text-slate-400 mb-1" />
							<span className="font-raleway text-xs text-slate-400 uppercase font-bold tracking-wider">
								Min Order
							</span>
							<span className="text-sm font-bold text-slate-800 mt-1 truncate max-w-full">
								{baseMoq}
							</span>
						</div>
						<div className="bg-white border border-slate-200 p-3 rounded-lg flex flex-col items-center justify-center shadow-xs">
							<Layers className="w-5 h-5 text-slate-400 mb-1" />
							<span className="font-raleway text-xs text-slate-400 uppercase font-bold tracking-wider">
								Response Time
							</span>
							<span className="text-sm font-bold text-slate-800 mt-1 truncate max-w-full">
								{responseTimeSpec}
							</span>
						</div>
						<div className="bg-white border border-slate-200 p-3 rounded-lg flex flex-col items-center justify-center shadow-xs">
							<Truck className="w-5 h-5 text-slate-400 mb-1" />
							<span className="font-raleway text-xs text-slate-400 uppercase font-bold tracking-wider">
								Shipping
							</span>
							<span className="text-sm font-bold text-slate-800 mt-1 truncate max-w-full">
								{selectedSupplier.shippingDays
									? `${selectedSupplier.shippingDays}d`
									: "FOB Options"}
							</span>
						</div>
					</div>
				</div>

				{/* Right Side: Information & Pricing */}
				<div className="detail-fade-in flex flex-col gap-5">
					{/* Vendor Details */}
					<div className="flex flex-col gap-2 pb-3 border-b border-slate-200">
						<div className="font-raleway flex flex-wrap items-center gap-2">
							<span className="text-base font-bold text-slate-800">
								{selectedSupplier.name}
							</span>
							{selectedSupplier.verified && (
								<div className="flex items-center gap-1 bg-white border border-emerald-600 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full shadow-xs">
									<ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
									<span>Verified Supplier</span>
								</div>
							)}
						</div>
						<div className="font-dmsans flex items-center gap-1 text-sm text-slate-500 font-medium">
							<MapPin className="w-4 h-4 text-slate-500 shrink-0" />
							<span>{location}</span>
							<span className="text-slate-400 mx-1">•</span>
							<Building2 className="w-4 h-4 text-slate-500 shrink-0" />
							<span className="font-mono text-xs text-slate-500">
								{product.category} Industry
							</span>
						</div>
					</div>

					{/* Vendor Switcher */}
					{suppliers.length > 1 && (
						<div className="flex flex-col gap-2">
							<span className="font-raleway text-xs font-bold uppercase tracking-wider text-slate-400">
								<span className="font-dmsans">{suppliers.length}</span>{" "}
								suppliers available
							</span>
							<div className="flex gap-2 overflow-x-auto pb-1">
								{suppliers.map((s) => {
									const active = s.id === selectedSupplierId;
									return (
										<button
											key={s.id}
											type="button"
											onClick={() => setSelectedSupplierId(s.id)}
											className={`shrink-0 flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${
												active
													? "border-clay bg-clay/5 shadow-sm"
													: "border-slate-200 bg-white hover:border-slate-300"
											}`}
										>
											<span className="flex items-center gap-1 text-xs font-bold text-slate-800">
												{s.name}
												{s.verified && (
													<ShieldCheck className="w-3 h-3 text-emerald-600" />
												)}
											</span>
											<span className="font-mono text-xs font-bold text-clay">
												₹{getEffectivePrice(s)}
												<span className="text-slate-400 font-normal">
													/unit
												</span>
											</span>
										</button>
									);
								})}
							</div>
						</div>
					)}

					{/* Product Title */}
					<div>
						<h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
							{product.name}
						</h1>
					</div>

					{/* Pricing Box */}
					<div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
						<div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
							<span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
								Pricing Tiers
							</span>
							{savingsPercent > 0 && (
								<div className="flex items-center gap-1 bg-emerald-100/80 text-emerald-700 text-[10px] font-extrabold px-2 py-1 rounded-sm uppercase tracking-widest border border-emerald-200">
									<Tag className="w-3 h-3" />
									<span>Save {savingsPercent}% on Bulk</span>
								</div>
							)}
						</div>

						<div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
							<div className="border border-slate-200 rounded-lg p-3.5 flex flex-col justify-center bg-white shadow-xs relative">
								<span className="font-raleway text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
									Standard Rate
								</span>
								<div className="flex items-baseline gap-0.5 font-mono">
									<IndianRupee
										className="w-4 h-4 text-slate-800 shrink-0"
										strokeWidth={2.5}
									/>
									<span className="text-2xl font-bold text-slate-800">
										{selectedSupplier.price ?? 0}
									</span>
									<span className="text-xs text-slate-500 ml-1">/unit</span>
								</div>
								<span className="font-raleway text-xs text-slate-400 mt-1 font-medium">
									Min. order: <span className="font-dmsans">{baseMoq}</span>
								</span>
							</div>

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
								<span className="font-raleway text-[9px] font-bold uppercase tracking-[0.15em] text-clay/70 mb-3">
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

					{/* Quantity Calculator */}
					<div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-4 shadow-xs">
						<div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600 font-mono">
							<Calculator className="w-4 h-4 text-clay" />
							<span>Calculate Total</span>
						</div>

						<div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-5">
							{/* Quantity input */}
							<div className="flex flex-col gap-2 flex-1">
								<label className="font-raleway text-[12px] font-semibold text-slate-600">
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
									<span className="font-raleway block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">
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

					{/* Action Buttons */}
					<div className="flex flex-col gap-3 mt-2">
						<div className="grid grid-cols-2 gap-3">
							<ContactVendorBtn
								vendorId={selectedSupplier.id}
								vendorName={selectedSupplier.name}
								company={location}
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
								className={`flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-sm transition-all cursor-pointer shadow-sm active:scale-[0.99] border ${
									wishlisted
										? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
										: "bg-white border-slate-200 text-slate-700 hover:border-rose-200 hover:text-rose-500"
								}`}
							>
								<Heart
									className={`w-5 h-5 shrink-0 transition-all ${wishlisted ? "fill-current scale-110" : "fill-none"}`}
								/>
								<span>
									{wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
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
