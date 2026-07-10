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

  const hasDiscount =
    discountPrice != null && price != null && discountPrice < price;

  const discountPct = hasDiscount
    ? Math.round(((price - discountPrice) / price) * 100)
    : null;

  const location = city ? `${city}, ${country}` : country;

  return (
    <div
      className={`relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 ${
        isBest
          ? "bg-gradient-to-r from-sage/20 via-sage/5 to-transparent border border-sage/40 shadow-sm"
          : "bg-white/70 border border-transparent hover:border-slate-200 hover:bg-slate-50/80"
      }`}
    >
      {isBest && (
        <span className="absolute -top-2 left-3 flex items-center gap-1 rounded-full bg-sage px-2 py-0.5 text-[7px] sm:text-[8px] font-bold uppercase tracking-wider text-white shadow-md">
          <Crown className="w-2.5 h-2.5" strokeWidth={3} />
          Best price
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] sm:text-xs md:text-sm font-semibold text-slate-800 truncate">
            {name}
          </span>

          {verified && (
            <ShieldCheck
              className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0"
              strokeWidth={2.5}
            />
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] text-slate-500 truncate">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </span>

          {moq != null && (
            <>
              <span className="text-slate-300">•</span>
              <span className="font-medium shrink-0">MOQ {moq}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0">
        {hasDiscount && (
          <span className="text-[8px] sm:text-[9px] font-medium text-slate-400 line-through">
            ₹{price}
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] sm:text-xs md:text-sm font-bold text-clay">
            ₹{displayPrice}
          </span>

          {hasDiscount && (
            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[7px] sm:text-[8px] font-extrabold text-emerald-600 border border-emerald-200/30">
              -{discountPct}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierRow;
