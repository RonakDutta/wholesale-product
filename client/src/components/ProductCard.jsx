import { ShieldCheck, MapPin, IndianRupee } from "lucide-react";
import ContactVendorBtn from "./ContactVendorBtn";

const ProductCard = ({ product }) => {
	const {
		name = "Untitled Product",
		price = 0,
		vendorName = "Unknown Vendor",
		vendorId = "",
		location = "India",
		supplySignal = "In stock",
		verified = false,
		moq = "",
		specs = "",
		bulkPrice,
		bulkQuantity,
		image = "https://placehold.co/400x300/e2e8f0/1e293b?text=Image",
	} = product;

	return (
		<div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:border-sage/50 hover:-translate-y-1 group">
			<div className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden">
				<img
					src={image}
					alt={name}
					className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
				/>

				<div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200 shadow-sm">
					{supplySignal}
				</div>

				{/* Verified stamp – only show if verified */}
				{verified && (
					<div className="cursor-default absolute bottom-3 left-3 flex items-center gap-1 bg-white border border-emerald-600 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
						<ShieldCheck className="w-3 h-3" strokeWidth={2.5} />
						<span>Verified supplier</span>
					</div>
				)}
			</div>

			{/* Content */}
			<div className="p-4 pt-5 flex flex-col flex-1 gap-2">
				<div className="flex items-center gap-1 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
					<span className="text-slate-600">{vendorName}</span>
					<span className="text-slate-300">•</span>
					<MapPin className="w-2.5 h-2.5 shrink-0" />
					<span>{location}</span>
				</div>

				<h3 className="text-md font-bold text-slate-900 line-clamp-2 leading-snug">
					{name}
				</h3>

				<div className="font-mono text-[12px] text-slate-500">
					{moq && <span>MOQ {moq}</span>}
					{moq && specs && <span> · </span>}
					{specs && <span>{specs}</span>}
				</div>

				<div className="mt-auto pt-3 border-t border-slate-100">
					<div className="flex items-baseline gap-1 font-mono">
						<IndianRupee
							className="w-3.5 h-3.5 text-clay shrink-0"
							strokeWidth={2.5}
						/>
						<span className="text-xl font-bold text-clay">{price}</span>
						<span className="text-xs text-slate-400">/ unit</span>
					</div>
					{bulkPrice && bulkQuantity && (
						<div className="font-mono text-[11.5px] text-slate-400 mt-0.5">
							₹{bulkPrice}/unit at {bulkQuantity}+ units
						</div>
					)}
				</div>

				<div className="grid grid-cols-2 gap-2 mt-3">
					<ContactVendorBtn
						vendorId={vendorId}
						vendorName={vendorName}
						productName={name}
					/>
					<button className="flex items-center justify-center gap-1.5 py-2 bg-espresso text-cream text-xs font-semibold rounded-lg hover:bg-clay transition-all duration-300 cursor-pointer">
						<IndianRupee className="w-4 h-4" />
						<span className="text-xs font-bold uppercase tracking-wide">
							Buy
						</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default ProductCard;
