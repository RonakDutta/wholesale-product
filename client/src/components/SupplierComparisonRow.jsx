// SupplierComparisonRow.jsx
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
    <tr
      className={`group transition-colors duration-150 ${
        isSelected ? "bg-clay/3" : "hover:bg-slate-50/80"
      }`}
    >
      <td className="whitespace-nowrap px-5 py-4">
        <label className="inline-flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(supplier.id)}
            className="h-4 w-4 rounded border-slate-300 text-clay focus:ring-clay/20"
          />
          <div className="flex flex-col">
            <span className="font-dmsans text-sm font-bold text-slate-900">
              {supplier.name}
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <MapPin className="w-3 h-3" />
              {supplier.city}, {supplier.country}
            </span>
          </div>
        </label>
      </td>
      <td className="px-4 py-4">
        {supplier.verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            <ShieldCheck className="w-3 h-3" />
            Verified
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-4">
        <span className="inline-flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-500" />
          <span
            className={`font-dmsans text-sm font-bold ${
              badges.highestRating ? "text-amber-700" : "text-slate-900"
            }`}
          >
            {supplier.rating.toFixed(1)}
          </span>
        </span>
      </td>
      <td className="px-4 py-4 font-inter text-sm text-slate-600">
        {supplier.reviews}
      </td>
      <td className="px-4 py-4">
        <span className="inline-flex items-center gap-0.5">
          <IndianRupee
            className={`w-3.5 h-3.5 ${
              badges.lowestPrice ? "text-emerald-700" : "text-slate-400"
            }`}
          />
          <span
            className={`font-dmsans text-sm font-bold ${
              badges.lowestPrice ? "text-emerald-700" : "text-slate-900"
            }`}
          >
            {supplier.price}
          </span>
        </span>
      </td>
      <td className="px-4 py-4">
        <span
          className={`font-dmsans text-sm font-bold ${
            badges.lowestMOQ ? "text-emerald-700" : "text-slate-900"
          }`}
        >
          {supplier.moq}
        </span>
      </td>
      <td className="px-4 py-4">
        <span
          className={`font-dmsans text-sm font-bold ${
            badges.highestStock ? "text-emerald-700" : "text-slate-900"
          }`}
        >
          {supplier.stock}
        </span>
      </td>
      <td className="px-4 py-4">
        <span
          className={`font-inter text-sm font-medium ${
            badges.fastestShipping ? "text-sky-700" : "text-slate-600"
          }`}
        >
          {supplier.shippingDays} days
        </span>
      </td>
      <td className="px-4 py-4 font-inter text-sm text-slate-600">
        {supplier.city}, {supplier.country}
      </td>
      <td className="px-4 py-4">
        <span
          className={`font-dmsans text-sm font-bold ${
            badges.bestResponse ? "text-violet-700" : "text-slate-900"
          }`}
        >
          {supplier.responseRate}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onContact(supplier)}
            className="rounded-full border border-slate-200 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 transition hover:bg-slate-50"
          >
            Contact
          </button>
          <button
            type="button"
            onClick={() => onBuyNow(supplier)}
            className="rounded-full bg-clay px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-clay/90"
          >
            Buy
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
  onContact: PropTypes.func.isRequired,
  onBuyNow: PropTypes.func.isRequired,
  badges: PropTypes.object.isRequired,
};

export default SupplierComparisonRow;
