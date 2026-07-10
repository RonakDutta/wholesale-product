import PropTypes from "prop-types";
import {
	ShieldCheck,
	Star,
	MapPin,
	IndianRupee,
	MessageSquare,
	ShoppingCart,
} from "lucide-react";
import { getEffectivePrice, getSupplierPhone } from "../utils/supplierUtils";
import ContactVendorBtn from "./ContactVendorBtn";

const BEST_PILL = {
	lowestPrice: "bg-emerald-50 text-emerald-700 ring-emerald-500/20",
	highestRating: "bg-amber-50 text-amber-700 ring-amber-500/20",
	lowestMOQ: "bg-violet-50 text-violet-700 ring-violet-500/20",
	highestStock: "bg-violet-50 text-violet-700 ring-violet-500/20",
	fastestShipping: "bg-sky-50 text-sky-700 ring-sky-500/20",
	bestResponse: "bg-rose-50 text-rose-700 ring-rose-500/20",
};

const BestPill = ({ type }) => (
	<span
		className={`inline-flex items-center ml-1 px-1.5 py-[4px] rounded text-[8px] font-extrabold uppercase tracking-[0.1em] ring-1 ring-inset whitespace-nowrap leading-none ${BEST_PILL[type]}`}
	>
		Best
	</span>
);

const fmt = (n) =>
	n != null ? (typeof n === "number" ? n.toLocaleString("en-IN") : n) : "—";

const SupplierComparisonRow = ({
	supplier,
	isSelected,
	onToggleSelect,
	productName,
	onBuyNow,
	badges,
}) => {
	const effectivePrice = getEffectivePrice(supplier);

	return (
		<tr
			className={`group transition-all duration-150 ${
				isSelected ? "bg-clay/[0.04]" : "hover:bg-slate-50/70"
			}`}
		>
			{/* ── Supplier (name + location + verified) ── */}
			<td className="whitespace-nowrap px-4 py-3">
				<label className="inline-flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						checked={isSelected}
						onChange={() => onToggleSelect(supplier.id)}
						className="h-3.5 w-3.5 rounded border-slate-300 text-clay focus:ring-clay/30 cursor-pointer"
					/>
					<div className="flex flex-col gap-0.5">
						<div className="flex items-center gap-1.5">
							<span className="text-[14px] font-semibold text-slate-900 leading-tight">
								{supplier.name}
							</span>
							{supplier.verified && (
								<ShieldCheck
									className="w-3.5 h-3.5 text-emerald-500 shrink-0"
									strokeWidth={2.5}
									title="Verified Supplier"
								/>
							)}
						</div>
						<span className="flex items-center gap-1 text-[11px] text-slate-400 leading-tight">
							<MapPin className="w-2.5 h-2.5 shrink-0" />
							{supplier.city}, {supplier.country}
						</span>
					</div>
				</label>
			</td>

			{/* ── Rating + Reviews ── */}
			<td className="whitespace-nowrap px-4 py-3">
				<div className="flex items-center gap-1.5">
					<Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
					<span
						className={`text-[13px] font-semibold tabular-nums ${
							badges.highestRating ? "text-amber-700" : "text-slate-800"
						}`}
					>
						{supplier.rating?.toFixed(1)}
					</span>
					<span className="text-[11px] text-slate-400 tabular-nums">
						({fmt(supplier.reviews)})
					</span>
					{badges.highestRating && <BestPill type="highestRating" />}
				</div>
			</td>

			{/* ── Price ── */}
			<td className="whitespace-nowrap px-4 py-3">
				<div className="flex items-center gap-0.5">
					<IndianRupee
						className={`w-3 h-3 shrink-0 ${
							badges.lowestPrice ? "text-emerald-600" : "text-slate-400"
						}`}
						strokeWidth={2.5}
					/>
					<span
						className={`text-[13px] font-bold tabular-nums tracking-tight ${
							badges.lowestPrice ? "text-emerald-700" : "text-slate-900"
						}`}
					>
						{fmt(effectivePrice)}
					</span>
					{badges.lowestPrice && <BestPill type="lowestPrice" />}
				</div>
			</td>

			{/* ── MOQ ── */}
			<td className="whitespace-nowrap px-4 py-3">
				<div className="flex items-center">
					<span
						className={`text-[13px] font-semibold tabular-nums ${
							badges.lowestMOQ ? "text-violet-700" : "text-slate-700"
						}`}
					>
						{fmt(supplier.moq)}
					</span>
					{badges.lowestMOQ && <BestPill type="lowestMOQ" />}
				</div>
			</td>

			{/* ── Stock ── */}
			<td className="whitespace-nowrap px-4 py-3">
				<div className="flex items-center">
					<span
						className={`text-[13px] font-semibold tabular-nums ${
							badges.highestStock ? "text-violet-700" : "text-slate-700"
						}`}
					>
						{fmt(supplier.stock)}
					</span>
					{badges.highestStock && <BestPill type="highestStock" />}
				</div>
			</td>

			{/* ── Shipping ── */}
			<td className="whitespace-nowrap px-4 py-3">
				<div className="flex items-center">
					<span
						className={`text-[13px] font-medium tabular-nums ${
							badges.fastestShipping ? "text-sky-700" : "text-slate-600"
						}`}
					>
						{supplier.shippingDays}d
					</span>
					{badges.fastestShipping && <BestPill type="fastestShipping" />}
				</div>
			</td>

			{/* ── Response ── */}
			<td className="whitespace-nowrap px-4 py-3">
				<div className="flex items-center">
					<span
						className={`text-[13px] font-semibold tabular-nums ${
							badges.bestResponse ? "text-rose-700" : "text-slate-700"
						}`}
					>
						{supplier.responseRate}
					</span>
					{badges.bestResponse && <BestPill type="bestResponse" />}
				</div>
			</td>

			{/* ── Actions ── */}
			<td className="whitespace-nowrap px-4 py-3">
				<div className="flex items-center gap-1.5">
					<ContactVendorBtn
						vendorId={supplier.id}
						vendorName={supplier.name}
						productName={productName}
						vendorPhone={getSupplierPhone(supplier)}
						trigger={(open) => (
							<button
								type="button"
								onClick={open}
								className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 active:scale-[0.97]"
							>
								<MessageSquare className="w-3 h-3" />
								<span className="hidden xl:inline">Contact</span>
							</button>
						)}
					/>
					<button
						type="button"
						onClick={() => onBuyNow(supplier)}
						className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-clay px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-clay/90 active:scale-[0.97] shadow-sm shadow-clay/15"
					>
						<ShoppingCart className="w-3 h-3" />
						<span className="hidden xl:inline">Buy</span>
					</button>
				</div>
			</td>
		</tr>
	);
};

SupplierComparisonRow.propTypes = {
	supplier: PropTypes.shape({
		id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
		name: PropTypes.string.isRequired,
		verified: PropTypes.bool,
		rating: PropTypes.number,
		reviews: PropTypes.number,
		price: PropTypes.number,
		moq: PropTypes.number,
		stock: PropTypes.number,
		shippingDays: PropTypes.number,
		city: PropTypes.string,
		country: PropTypes.string,
		responseRate: PropTypes.string,
	}).isRequired,
	isSelected: PropTypes.bool.isRequired,
	onToggleSelect: PropTypes.func.isRequired,
	onBuyNow: PropTypes.func.isRequired,
	badges: PropTypes.object.isRequired,
	productName: PropTypes.string,
};

export default SupplierComparisonRow;
