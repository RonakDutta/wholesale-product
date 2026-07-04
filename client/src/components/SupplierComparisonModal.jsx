import PropTypes from "prop-types";
import { X, ShieldCheck, Star, IndianRupee, CheckCircle } from "lucide-react";

const SupplierComparisonModal = ({
  open,
  onClose,
  suppliers,
  metrics,
  onBuyNow,
}) => {
  if (!open) return null;

  const features = [
    { key: "price", label: "Price" },
    { key: "moq", label: "MOQ" },
    { key: "rating", label: "Rating" },
    { key: "shippingDays", label: "Shipping" },
    { key: "stock", label: "Stock" },
    { key: "country", label: "Country" },
    { key: "city", label: "City" },
    { key: "responseRate", label: "Response Rate" },
    { key: "gstVerified", label: "GST Verified" },
    { key: "trustScore", label: "Trust Score" },
    { key: "yearsInBusiness", label: "Years" },
    { key: "completedOrders", label: "Completed Orders" },
    { key: "totalProducts", label: "Total Products" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl rounded-4xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Compare Suppliers
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Selected Suppliers ({suppliers.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="border-b border-slate-200 px-6 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"></th>
                {suppliers.map((supplier) => (
                  <th
                    key={supplier.id}
                    className="border-b border-slate-200 px-6 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
                  >
                    <div className="flex flex-col gap-2">
                      <span className="font-bold text-slate-900">
                        {supplier.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {supplier.city}, {supplier.country}
                      </span>
                      {supplier.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr
                  key={feature.key}
                  className="border-b border-slate-200 last:border-b-0"
                >
                  <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-700 bg-slate-50">
                    {feature.label}
                  </td>
                  {suppliers.map((supplier) => {
                    const value = supplier[feature.key];
                    const isBest =
                      (feature.key === "price" &&
                        metrics.lowestPriceId === supplier.id) ||
                      (feature.key === "moq" &&
                        metrics.lowestMOQId === supplier.id) ||
                      (feature.key === "rating" &&
                        metrics.highestRatingId === supplier.id) ||
                      (feature.key === "shippingDays" &&
                        metrics.fastestShippingId === supplier.id) ||
                      (feature.key === "stock" &&
                        metrics.highestStockId === supplier.id) ||
                      (feature.key === "responseRate" &&
                        metrics.bestResponseId === supplier.id);

                    return (
                      <td
                        key={`${supplier.id}-${feature.key}`}
                        className={`px-6 py-4 ${isBest ? "bg-slate-100" : ""} text-slate-900`}
                      >
                        {feature.key === "rating" ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-500" />
                            {value?.toFixed(1)}
                          </span>
                        ) : feature.key === "price" ? (
                          <span className="inline-flex items-center gap-1">
                            <IndianRupee className="w-4 h-4 text-emerald-700" />
                            {value}
                          </span>
                        ) : feature.key === "gstVerified" ? (
                          value ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-500">No</span>
                          )
                        ) : (
                          value
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-6 py-5 bg-slate-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Compare supplier terms at a glance before selecting the best
            partner.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {suppliers.map((supplier) => (
              <button
                key={supplier.id}
                type="button"
                onClick={() => onBuyNow(supplier)}
                className="rounded-full bg-clay px-4 py-3 text-sm font-semibold text-white hover:bg-clay/90 transition"
              >
                Buy from {supplier.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

SupplierComparisonModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  suppliers: PropTypes.arrayOf(PropTypes.object).isRequired,
  metrics: PropTypes.object.isRequired,
  onBuyNow: PropTypes.func.isRequired,
};

SupplierComparisonModal.defaultProps = {};

export default SupplierComparisonModal;
