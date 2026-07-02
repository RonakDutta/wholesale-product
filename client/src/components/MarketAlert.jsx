import { TrendingUp } from "lucide-react";

const MarketAlert = ({
	category = "Packaging Materials",
	region = "Delhi NCR",
	onActionClick,
}) => {
	return (
		<div className="bg-espresso text-cream p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between shadow-lg gap-4 border border-espresso/20">
			<div className="flex items-start sm:items-center gap-4">
				<div className="p-2 bg-clay/20 rounded-full shrink-0 relative">
					<TrendingUp className="w-5 h-5 text-clay" />
					{/* Pulse animation */}
					<span className="absolute inset-0 rounded-full bg-clay/20 animate-ping"></span>
				</div>
				<div>
					<h2 className="text-sm font-bold tracking-wide">Market Alert</h2>
					<p className="text-xs text-cream/70 leading-tight mt-1">
						High demand detected in{" "}
						<span className="text-cream font-semibold">{category}</span> for{" "}
						{region}.
					</p>
				</div>
			</div>
			<button
				onClick={onActionClick}
				className="text-xs font-bold bg-clay w-full sm:w-auto px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer hover:shadow-md hover:shadow-clay/20"
			>
				View Deals
			</button>
		</div>
	);
};

export default MarketAlert;
