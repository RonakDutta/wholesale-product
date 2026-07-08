import PropTypes from "prop-types";
import {
	ShieldCheck,
	Star,
	IndianRupee,
	CheckCircle,
	MapPin,
	X,
	MessageSquare,
	ShoppingCart,
	Trophy,
} from "lucide-react";
import ModalShell from "./ModalShell";
import ContactVendorBtn from "./ContactVendorBtn";
import { getEffectivePrice, getSupplierPhone } from "../utils/supplierUtils";

const STAT_FIELDS = [
	{ key: "moq", label: "MOQ", bestKey: "lowestMOQId" },
	{ key: "stock", label: "Stock", bestKey: "highestStockId" },
	{
		key: "shippingDays",
		label: "Shipping",
		bestKey: "fastestShippingId",
		suffix: " days",
	},
	{ key: "rating", label: "Rating", bestKey: "highestRatingId" },
	{ key: "responseRate", label: "Response", bestKey: "bestResponseId" },
	{ key: "trustScore", label: "Trust Score" },
	{ key: "yearsInBusiness", label: "Years Active" },
	{ key: "completedOrders", label: "Orders Done" },
	{ key: "totalProducts", label: "Catalog Size" },
];

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
		className={`inline-flex items-center ml-1.5 px-1.5 py-[1px] rounded text-[7px] font-extrabold uppercase tracking-[0.1em] ring-1 ring-inset whitespace-nowrap leading-none ${BEST_PILL[type]}`}
	>
		Best
	</span>
);

const isBestFor = (metrics, supplierId, bestKey) =>
	bestKey ? metrics[bestKey] === supplierId : false;

const fmt = (n) =>
	n != null ? (typeof n === "number" ? n.toLocaleString("en-IN") : n) : "—";

const SupplierComparisonModal = ({
	open,
	onClose,
	suppliers,
	metrics,
	onBuyNow,
	productName,
}) => {
	if (!open) return null;

	return (
		<ModalShell onClose={onClose} maxWidth="max-w-5xl">
			{/* ── Header ── */}
			<div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/95 backdrop-blur-sm px-5 py-4 sm:px-6">
				<div>
					<div className="flex items-center gap-2">
						<Trophy className="w-4 h-4 text-clay" />
						<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-clay font-mono">
							Side-by-Side
						</p>
					</div>
					<h2 className="mt-1 text-lg sm:text-xl font-bold text-slate-900">
						Comparing {suppliers.length} suppliers
					</h2>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
					aria-label="Close comparison"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			{/* ── MOBILE: swipeable cards ── */}
			<div className="md:hidden px-4 pt-4 pb-6">
				<div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
					{suppliers.map((supplier) => {
						const priceIsBest = metrics.lowestPriceId === supplier.id;
						return (
							<div
								key={supplier.id}
								className="shrink-0 snap-center w-[85%] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
							>
								{/* Supplier header */}
								<div className="flex items-start justify-between gap-2">
									<div>
										<p className="text-sm font-bold text-slate-900 leading-tight">
											{supplier.name}
										</p>
										<p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
											<MapPin className="w-3 h-3 shrink-0" />
											{supplier.city}, {supplier.country}
										</p>
									</div>
									{supplier.verified && (
										<span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-500/15">
											<ShieldCheck className="w-3 h-3" />
											Verified
										</span>
									)}
								</div>

								{/* Price card */}
								<div
									className={`mt-4 rounded-xl border p-3.5 transition-colors ${
										priceIsBest
											? "border-clay/20 bg-gradient-to-br from-clay/5 to-clay/[0.02] ring-1 ring-inset ring-clay/10"
											: "border-slate-100 bg-slate-50/50"
									}`}
								>
									<div className="flex items-center justify-between">
										<p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
											Unit Price
										</p>
										{priceIsBest && <BestPill type="lowestPrice" />}
									</div>
									<p
										className={`mt-1.5 flex items-center gap-0.5 text-2xl font-black tabular-nums tracking-tight ${
											priceIsBest ? "text-clay" : "text-slate-900"
										}`}
									>
										<IndianRupee className="w-5 h-5" strokeWidth={3} />
										{fmt(getEffectivePrice(supplier))}
										<span className="text-xs font-medium text-slate-400 mb-1 ml-0.5 self-end">
											/unit
										</span>
									</p>
								</div>

								{/* Stats grid */}
								<div className="mt-4 grid grid-cols-2 gap-2">
									{STAT_FIELDS.map((field) => {
										const best = isBestFor(metrics, supplier.id, field.bestKey);
										const rawValue = supplier[field.key];
										const value =
											field.key === "rating"
												? Number(rawValue ?? 0).toFixed(1)
												: `${fmt(rawValue)}${field.suffix ?? ""}`;
										return (
											<div
												key={field.key}
												className={`rounded-lg border px-3 py-2 transition-colors ${
													best
														? "border-clay/15 bg-clay/[0.03]"
														: "border-slate-100 bg-white"
												}`}
											>
												<p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
													{field.label}
												</p>
												<p
													className={`mt-1 flex items-center gap-1 text-[13px] font-bold tabular-nums ${
														best ? "text-clay" : "text-slate-900"
													}`}
												>
													{field.key === "rating" && (
														<Star className="w-3 h-3 text-amber-400 fill-amber-400" />
													)}
													{value}
												</p>
											</div>
										);
									})}
									<div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
										<p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
											GST
										</p>
										<p className="mt-1 text-[13px] font-bold">
											{supplier.gstVerified ? (
												<span className="inline-flex items-center gap-1 text-emerald-700">
													<CheckCircle className="w-3 h-3" /> Yes
												</span>
											) : (
												<span className="text-slate-400">No</span>
											)}
										</p>
									</div>
								</div>

								{/* Actions */}
								<div className="mt-5 flex gap-2">
									<ContactVendorBtn
										vendorId={supplier.id}
										vendorName={supplier.name}
										productName={productName}
										vendorPhone={getSupplierPhone(supplier)}
										trigger={(triggerOpen) => (
											<button
												type="button"
												onClick={triggerOpen}
												className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-3 text-[11px] font-bold uppercase tracking-wider text-slate-700 transition hover:bg-slate-50 shadow-sm"
											>
												<MessageSquare className="w-3.5 h-3.5" />
												Contact
											</button>
										)}
									/>
									<button
										type="button"
										onClick={() => onBuyNow(supplier)}
										className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-clay py-3 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-clay/90 shadow-sm shadow-clay/20"
									>
										<ShoppingCart className="w-3.5 h-3.5" />
										Buy Now
									</button>
								</div>
							</div>
						);
					})}
				</div>
				<p className="mt-3 text-center text-[11px] font-medium text-slate-400">
					Swipe to see all suppliers →
				</p>
			</div>

			{/* ── DESKTOP: comparison table ── */}
			<div className="hidden md:block p-5 sm:p-6 bg-slate-50/30">
				<div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
					<table className="w-full text-left text-sm table-fixed">
						{/* ── Supplier header row ── */}
						<thead className="border-b border-slate-100">
							<tr>
								<th className="w-[180px] p-5 align-bottom text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 font-mono">
									Feature
								</th>
								{suppliers.map((supplier, idx) => (
									<th
										key={supplier.id}
										className={`p-5 align-top ${idx > 0 ? "border-l border-slate-100" : ""}`}
									>
										<div className="flex flex-col gap-2">
											<div className="flex items-start justify-between gap-2">
												<span className="text-[15px] font-bold text-slate-900 leading-tight">
													{supplier.name}
												</span>
												{supplier.verified && (
													<span
														title="Verified Supplier"
														className="shrink-0 inline-flex rounded-lg bg-emerald-50 p-1 text-emerald-600 ring-1 ring-inset ring-emerald-500/15"
													>
														<ShieldCheck className="w-4 h-4" />
													</span>
												)}
											</div>
											<span className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
												<MapPin className="w-3 h-3" />
												{supplier.city}, {supplier.country}
											</span>
										</div>
									</th>
								))}
							</tr>
						</thead>

						<tbody className="divide-y divide-slate-100/80">
							{/* ── Price row (highlighted) ── */}
							<tr className="bg-slate-50/40">
								<td className="w-[180px] p-4 text-[12px] font-bold uppercase tracking-wider text-slate-600">
									Unit Price
								</td>
								{suppliers.map((supplier, idx) => {
									const best = metrics.lowestPriceId === supplier.id;
									return (
										<td
											key={supplier.id}
											className={`p-4 transition-colors ${idx > 0 ? "border-l border-slate-100" : ""} ${
												best
													? "bg-gradient-to-r from-emerald-50/50 to-transparent"
													: ""
											}`}
										>
											<div className="flex flex-wrap items-center gap-2">
												<span
													className={`inline-flex items-center text-xl font-black tabular-nums tracking-tight ${
														best ? "text-emerald-700" : "text-slate-900"
													}`}
												>
													<IndianRupee className="w-4 h-4" strokeWidth={3} />
													{fmt(getEffectivePrice(supplier))}
												</span>
												{best && <BestPill type="lowestPrice" />}
											</div>
										</td>
									);
								})}
							</tr>

							{/* ── Stat rows ── */}
							{STAT_FIELDS.map((field, rowIdx) => (
								<tr
									key={field.key}
									className={`transition-colors hover:bg-slate-50/50 ${rowIdx % 2 === 0 ? "" : "bg-slate-50/20"}`}
								>
									<td className="w-[180px] p-4 text-[12px] font-medium text-slate-500">
										{field.label}
									</td>
									{suppliers.map((supplier, colIdx) => {
										const best = isBestFor(metrics, supplier.id, field.bestKey);
										const rawValue = supplier[field.key];
										const pillType = field.bestKey?.replace("Id", "") ?? null;

										return (
											<td
												key={`${supplier.id}-${field.key}`}
												className={`p-4 transition-colors ${colIdx > 0 ? "border-l border-slate-100" : ""} ${
													best ? "bg-clay/[0.03]" : ""
												}`}
											>
												{field.key === "rating" ? (
													<div className="flex items-center gap-1.5">
														<Star
															className={`w-3.5 h-3.5 ${
																best
																	? "text-amber-500 fill-amber-500"
																	: "text-amber-400 fill-amber-400"
															}`}
														/>
														<span
															className={`font-bold tabular-nums ${
																best ? "text-clay" : "text-slate-800"
															}`}
														>
															{Number(rawValue ?? 0).toFixed(1)}
														</span>
														{best && pillType && <BestPill type={pillType} />}
													</div>
												) : (
													<div className="flex items-center">
														<span
															className={`font-semibold tabular-nums ${
																best ? "text-clay" : "text-slate-700"
															}`}
														>
															{fmt(rawValue)}
															{field.suffix ?? ""}
														</span>
														{best && pillType && <BestPill type={pillType} />}
													</div>
												)}
											</td>
										);
									})}
								</tr>
							))}

							{/* ── GST row ── */}
							<tr className="transition-colors hover:bg-slate-50/50">
								<td className="w-[180px] p-4 text-[12px] font-medium text-slate-500">
									GST Verified
								</td>
								{suppliers.map((supplier, idx) => (
									<td
										key={supplier.id}
										className={`p-4 ${idx > 0 ? "border-l border-slate-100" : ""}`}
									>
										{supplier.gstVerified ? (
											<span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-[12px] ring-1 ring-inset ring-emerald-500/15">
												<CheckCircle className="w-3.5 h-3.5" /> Yes
											</span>
										) : (
											<span className="text-[13px] font-medium text-slate-400">
												No
											</span>
										)}
									</td>
								))}
							</tr>
						</tbody>

						{/* ── Action footer ── */}
						<tfoot className="bg-slate-50/60 border-t border-slate-100">
							<tr>
								<td className="w-[180px] p-4 text-[12px] font-medium text-slate-400">
									Action
								</td>
								{suppliers.map((supplier, idx) => (
									<td
										key={supplier.id}
										className={`p-4 ${idx > 0 ? "border-l border-slate-200" : ""}`}
									>
										<div className="flex flex-col sm:flex-row gap-2">
											<ContactVendorBtn
												vendorId={supplier.id}
												vendorName={supplier.name}
												productName={productName}
												vendorPhone={getSupplierPhone(supplier)}
												trigger={(triggerOpen) => (
													<button
														type="button"
														onClick={triggerOpen}
														className="flex-1 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 shadow-sm"
													>
														<MessageSquare className="w-3.5 h-3.5" />
														Contact
													</button>
												)}
											/>
											<button
												type="button"
												onClick={() => onBuyNow(supplier)}
												className="flex-1 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-clay px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-clay/90 shadow-sm shadow-clay/15"
											>
												<ShoppingCart className="w-3.5 h-3.5" />
												Buy Now
											</button>
										</div>
									</td>
								))}
							</tr>
						</tfoot>
					</table>
				</div>
			</div>
		</ModalShell>
	);
};

SupplierComparisonModal.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	suppliers: PropTypes.arrayOf(PropTypes.object).isRequired,
	metrics: PropTypes.object.isRequired,
	onBuyNow: PropTypes.func.isRequired,
	onContact: PropTypes.func,
	productName: PropTypes.string,
};

SupplierComparisonModal.defaultProps = {
	onContact: () => {},
	productName: "",
};

export default SupplierComparisonModal;
