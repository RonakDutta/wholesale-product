import { ShieldCheck, MapPin } from "lucide-react";

const SupplierRow = ({ supplier }) => {
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

  const hasDiscount =
    discountPrice != null && price != null && discountPrice < price;

  const discountPct = hasDiscount
    ? Math.round(((price - discountPrice) / price) * 100)
    : null;

  const location = city ? `${city}, ${country}` : country;

  return (
    <div className="relative flex flex-col gap-1 px-3 py-2.5 rounded-xl shrink-0 bg-linear-to-r from-sage/20 via-sage/5 to-transparent border border-sage/40 shadow-sm">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
          {name}
        </span>
        {verified && (
          <ShieldCheck
            className="w-3.5 h-3.5 text-emerald-600 shrink-0"
            strokeWidth={2.5}
          />
        )}
      </div>

      <span className="text-[10px] font-semibold uppercase tracking-wider text-sage">
        Available from your wholesaler
      </span>

      <div className="flex items-center gap-1.5 flex-wrap">
        {hasDiscount && (
          <span className="text-[9px] font-medium text-slate-400 line-through">
            ₹{price}
          </span>
        )}
        <span className="font-mono text-xs sm:text-sm font-bold text-clay">
          ₹{displayPrice}
        </span>
        {hasDiscount && (
          <span className="hidden sm:visible rounded-full bg-emerald-50 px-1.5 py-0.5 text-[7px] sm:text-[8px] font-extrabold text-emerald-600 border border-emerald-200/30">
            -{discountPct}%
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap text-[10px] sm:text-[11px] text-slate-500">
        <span className="flex items-center gap-1 min-w-0 max-w-full">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{location}</span>
        </span>
        {moq != null && (
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-300">•</span>
            <span className="font-medium">MOQ {moq}</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default SupplierRow;
