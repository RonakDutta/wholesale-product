import { ShieldCheck, MapPin } from "lucide-react";

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
  const location = city ? `${city}, ${country}` : country;

  return (
    <div
      className={`flex items-center justify-between gap-1.5 rounded-md px-1.5 py-1 sm:px-2 sm:py-1.5 ${
        isBest ? "bg-sage/10 border border-sage/30" : "bg-slate-50"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[8px] sm:text-[10px] md:text-xs font-semibold text-slate-800 truncate">
            {name}
          </span>
          {verified && (
            <ShieldCheck
              className="w-2.5 h-2.5 text-emerald-600 shrink-0"
              strokeWidth={2.5}
            />
          )}
        </div>
        <div className="flex items-center gap-0.5 text-[7px] sm:text-[8px] text-slate-400 truncate">
          <MapPin className="w-2 h-2 shrink-0" />
          <span className="truncate">{location}</span>
          <span>· MOQ {moq}</span>
        </div>
      </div>
      <div className="text-right shrink-0 font-mono text-[9px] sm:text-[11px] md:text-xs font-bold text-clay">
        ₹{displayPrice}
      </div>
    </div>
  );
};

export default SupplierRow;
