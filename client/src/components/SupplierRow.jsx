import { ShieldCheck, MapPin, Crown } from "lucide-react";

const SupplierRow = ({ supplier, isBest }) => {
	const {
		name,
		city,
		country = "India",
		verified,
		price,
		discountPrice,
		moq,
	} = supplier;

	const displayPrice = discountPrice ?? price;
	const hasDiscount = discountPrice != null && discountPrice < price;
	const discountPct = hasDiscount
		? Math.round(((price - discountPrice) / price) * 100)
		: null;
	const location = city ? `${city}, ${country}` : country;

	return (
		<div
			className={`font-inter relative flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 sm:px-2.5 sm:py-2 transition-all duration-200 ${
				isBest
					? "bg-gradient-to-r from-sage/15 via-sage/10 to-transparent border border-sage/40 shadow-sm"
					: "bg-slate-50 border border-transparent hover:border-slate-200 hover:bg-slate-100/70"
			}`}
		>
			{isBest && (
				<span className="absolute -top-2 left-2 flex items-center gap-0.5 rounded-full bg-sage px-1.5 py-[1px] text-[6px] sm:text-[7px] font-bold uppercase tracking-wide text-white shadow-sm">
					<Crown className="w-2 h-2" strokeWidth={3} />
					Best price
				</span>
			)}

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1 min-w-0">
					<span className="text-[8px] sm:text-[10px] md:text-sm font-semibold text-slate-800 truncate">
						{name}
					</span>
					{verified && (
						<ShieldCheck
							className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 shrink-0"
							strokeWidth={2.5}
						/>
					)}
				</div>
				<div className="flex items-center gap-1 text-[7px] sm:text-[8px] text-slate-400 truncate mt-0.5">
					<span className="flex items-center gap-0.5 truncate">
						<MapPin className="w-2 h-2 shrink-0" />
						<span className="truncate">{location}</span>
					</span>
					<span className="text-slate-300">•</span>
					<span className="shrink-0">MOQ {moq}</span>
				</div>
			</div>

			<div className="flex flex-col items-end shrink-0">
				{hasDiscount && (
					<span className="text-[7px] sm:text-[8px] font-medium text-slate-400 line-through">
						₹{price}
					</span>
				)}
				<div className="flex items-center gap-1">
					<span className="font-mono text-[9px] sm:text-[11px] md:text-xs font-bold text-clay">
						₹{displayPrice}
					</span>
					{hasDiscount && (
						<span className="rounded bg-emerald-50 px-1 py-[1px] text-[6px] sm:text-[7px] font-bold text-emerald-600">
							-{discountPct}%
						</span>
					)}
				</div>
			</div>
		</div>
	);
};

export default SupplierRow;
