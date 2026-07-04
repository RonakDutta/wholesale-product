import PropTypes from "prop-types";
import { ShieldCheck, Star, MapPin, IndianRupee } from "lucide-react";

const SupplierComparisonRow = ({
  supplier,
  isSelected,
  onToggleSelect,
  onContact,
  onBuyNow,
  badges,
}) => {
  return (
    <tr className="group hover:bg-slate-50 transition-colors">
      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-900">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(supplier.id)}
            className="h-4 w-4 rounded border-slate-300 text-clay focus:ring-clay"
          />
          <div className="flex flex-col">
            <span className="font-semibold">{supplier.name}</span>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {supplier.city}, {supplier.country}
            </span>
          </div>
        </label>
      </td>
      <td className="px-4 py-4 text-sm text-slate-700">
        {supplier.verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
            <ShieldCheck className="w-3 h-3" /> Verified
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">No</span>
        )}
      </td>
      <td className="px-4 py-4 text-sm text-slate-900">
        <div className="inline-flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-500" />
          <span
            className={
              badges.highestRating
                ? "text-amber-700 font-semibold"
                : "text-slate-900 font-medium"
            }
          >
            {supplier.rating.toFixed(1)}
          </span>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-slate-700">{supplier.reviews}</td>
      <td className="px-4 py-4 text-sm font-semibold text-slate-900">
        <IndianRupee className="w-3.5 h-3.5 inline-block align-text-bottom" />
        <span
          className={badges.lowestPrice ? "text-emerald-700" : "text-slate-900"}
        >
          {supplier.price}
        </span>
      </td>
      <td className="px-4 py-4 text-sm font-semibold text-slate-900">
        <span
          className={badges.lowestMOQ ? "text-emerald-700" : "text-slate-900"}
        >
          {supplier.moq}
        </span>
      </td>
      <td className="px-4 py-4 text-sm text-slate-900">
        <span
          className={
            badges.highestStock ? "text-emerald-700" : "text-slate-900"
          }
        >
          {supplier.stock}
        </span>
      </td>
      <td className="px-4 py-4 text-sm text-slate-900">
        <span
          className={badges.fastestShipping ? "text-sky-700" : "text-slate-900"}
        >
          {supplier.shippingDays} Days
        </span>
      </td>
      <td className="px-4 py-4 text-sm text-slate-700">
        {supplier.city}, {supplier.country}
      </td>
      <td className="px-4 py-4 text-sm text-slate-900">
        <span
          className={
            badges.bestResponse
              ? "text-violet-700 font-semibold"
              : "text-slate-900"
          }
        >
          {supplier.responseRate}
        </span>
      </td>
      <td className="px-4 py-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onContact(supplier)}
          className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
        >
          Contact
        </button>
        <button
          type="button"
          onClick={() => onBuyNow(supplier)}
          className="rounded-full bg-clay px-3 py-2 text-xs font-semibold text-white hover:bg-clay/90 transition"
        >
          Buy Now
        </button>
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
  onContact: PropTypes.func.isRequired,
  onBuyNow: PropTypes.func.isRequired,
  badges: PropTypes.object.isRequired,
};

export default SupplierComparisonRow;
