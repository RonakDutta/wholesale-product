import PropTypes from "prop-types";
import { ShieldCheck, Star, MapPin, IndianRupee } from "lucide-react";

const SupplierCard = ({
  supplier,
  isSelected,
  onToggleSelect,
  onContact,
  onBuyNow,
  badges,
}) => {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <span>{supplier.name}</span>
            {supplier.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                <ShieldCheck className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500" />{" "}
              {supplier.rating.toFixed(1)}
            </span>
            <span>{supplier.reviews} reviews</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {supplier.city}, {supplier.country}
            </span>
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(supplier.id)}
            className="h-4 w-4 rounded border-slate-300 text-clay focus:ring-clay"
          />
          Compare
        </label>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-700">
        <div className="flex items-center justify-between gap-2">
          <span>Price</span>
          <span
            className={
              badges.lowestPrice
                ? "text-emerald-700 font-semibold"
                : "font-semibold text-slate-900"
            }
          >
            <IndianRupee className="w-3.5 h-3.5 inline-block align-text-bottom" />
            {supplier.price}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>MOQ</span>
          <span
            className={
              badges.lowestMOQ
                ? "text-emerald-700 font-semibold"
                : "text-slate-900 font-semibold"
            }
          >
            {supplier.moq}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Stock</span>
          <span
            className={
              badges.highestStock
                ? "text-emerald-700 font-semibold"
                : "text-slate-900 font-semibold"
            }
          >
            {supplier.stock}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Shipping</span>
          <span
            className={
              badges.fastestShipping
                ? "text-sky-700 font-semibold"
                : "text-slate-900 font-semibold"
            }
          >
            {supplier.shippingDays} Days
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Response</span>
          <span
            className={
              badges.bestResponse
                ? "text-violet-700 font-semibold"
                : "text-slate-900 font-semibold"
            }
          >
            {supplier.responseRate}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>GST Verified</span>
          <span className="text-sm font-semibold text-slate-900">
            {supplier.gstVerified ? "Yes" : "No"}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={() => onContact(supplier)}
          className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
        >
          Chat with Supplier
        </button>
        <button
          type="button"
          onClick={() => onBuyNow(supplier)}
          className="rounded-full bg-clay px-4 py-3 text-sm font-semibold text-white hover:bg-clay/90 transition"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
};

SupplierCard.propTypes = {
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
    gstVerified: PropTypes.bool,
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onToggleSelect: PropTypes.func.isRequired,
  onContact: PropTypes.func.isRequired,
  onBuyNow: PropTypes.func.isRequired,
  badges: PropTypes.object.isRequired,
};

export default SupplierCard;
