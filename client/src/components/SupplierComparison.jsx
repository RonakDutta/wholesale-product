import { useMemo, useState } from "react";
import { Search, ShieldCheck, Star, Truck, Sparkles } from "lucide-react";
import PropTypes from "prop-types";
import {
  filterSuppliers,
  getBestSupplierMetrics,
} from "../utils/compareSuppliers";
import { sortSuppliers } from "../utils/sortSuppliers";
import SupplierComparisonRow from "./SupplierComparisonRow";
import SupplierCard from "./SupplierCard";
import SupplierComparisonModal from "./SupplierComparisonModal";

const SORT_OPTIONS = [
  { value: "price-asc", label: "Price Low to High" },
  { value: "price-desc", label: "Price High to Low" },
  { value: "highest-rated", label: "Highest Rating" },
  { value: "lowest-moq", label: "Lowest MOQ" },
  { value: "fastest-shipping", label: "Fastest Shipping" },
  { value: "highest-stock", label: "Highest Stock" },
  { value: "best-response", label: "Best Response Rate" },
];

const SupplierComparison = ({ product, onAddToCart, onContactSupplier }) => {
  const [sortBy, setSortBy] = useState("price-asc");
  const [search, setSearch] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [gstVerifiedOnly, setGstVerifiedOnly] = useState(false);
  const [maxMOQ, setMaxMOQ] = useState(0);
  const [maxShipping, setMaxShipping] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const filters = useMemo(
    () => ({
      search,
      verifiedOnly,
      gstVerifiedOnly,
      maxMOQ,
      maxShipping,
      minRating,
    }),
    [search, verifiedOnly, gstVerifiedOnly, maxMOQ, maxShipping, minRating],
  );

  const filteredSuppliers = useMemo(() => {
    return sortSuppliers(filterSuppliers(product.suppliers, filters), sortBy);
  }, [product.suppliers, filters, sortBy]);

  const metrics = useMemo(
    () => getBestSupplierMetrics(filteredSuppliers),
    [filteredSuppliers],
  );

  const selectedSuppliers = useMemo(
    () =>
      filteredSuppliers.filter((supplier) =>
        selectedSupplierIds.includes(supplier.id),
      ),
    [filteredSuppliers, selectedSupplierIds],
  );

  const toggleSelect = (id) => {
    setSelectedSupplierIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (selectedSuppliers.length < 2) return;
    setModalOpen(true);
  };

  const handleBuyNow = (supplier) => {
    onAddToCart(product, supplier.moq, supplier);
  };

  const handleContact = (supplier) => {
    onContactSupplier(supplier);
  };

  return (
    <section className="space-y-6 rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 md:items-center md:justify-between md:flex-row">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
            Available Suppliers
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Compare offers for this product
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Browse supplier quotes, delivery, stock, and reliability metrics
            before choosing the best supplier.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <Sparkles className="w-4 h-4 text-clay" />
            {filteredSuppliers.length} suppliers found
          </div>
          <button
            type="button"
            disabled={selectedSuppliers.length < 2}
            onClick={handleCompare}
            className="inline-flex items-center gap-2 rounded-full bg-clay px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-clay/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            Compare Selected
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Search suppliers
              </p>
              <div className="mt-3 relative">
                <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, city, country"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 text-sm text-slate-900 outline-none focus:border-clay focus:ring-2 focus:ring-clay/15 transition"
                />
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Sort by
              </p>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-clay focus:ring-2 focus:ring-clay/15 transition"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Filters
              </p>
              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-clay focus:ring-clay"
                  />
                  Verified only
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={gstVerifiedOnly}
                    onChange={(e) => setGstVerifiedOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-clay focus:ring-clay"
                  />
                  GST verified
                </label>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Limits
              </p>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    MOQ less than
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={maxMOQ}
                    onChange={(e) => setMaxMOQ(Number(e.target.value))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-clay focus:ring-2 focus:ring-clay/15 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Shipping max
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={maxShipping}
                    onChange={(e) => setMaxShipping(Number(e.target.value))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-clay focus:ring-2 focus:ring-clay/15 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Min rating
                  </label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-clay focus:ring-2 focus:ring-clay/15 transition"
                  >
                    <option value={0}>Any</option>
                    <option value={4}>4★ & above</option>
                    <option value={3}>3★ & above</option>
                    <option value={2}>2★ & above</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Best offers
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-2 text-emerald-700">
                    <ShieldCheck className="w-4 h-4" /> Best Price
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-2 text-sky-700">
                    <Truck className="w-4 h-4" /> Fastest Delivery
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-2 text-amber-700">
                    <Star className="w-4 h-4" /> Top Rated
                  </span>
                </div>
              </div>
              <div className="text-sm text-slate-500">
                {selectedSuppliers.length}/3 selected
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              Quick insights
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase tracking-[0.18em]">
                  Best price
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  Supplier {metrics.lowestPriceId || "—"}
                </p>
              </div>
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase tracking-[0.18em]">
                  Fastest shipping
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  Supplier {metrics.fastestShippingId || "—"}
                </p>
              </div>
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase tracking-[0.18em]">
                  Top rated
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  Supplier {metrics.highestRatingId || "—"}
                </p>
              </div>
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase tracking-[0.18em]">
                  Best response
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  Supplier {metrics.bestResponseId || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="hidden lg:block rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">
              Supplier trust snapshot
            </p>
            <div className="mt-4 grid gap-3 text-sm text-slate-700">
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase tracking-[0.18em]">
                  Trust Score
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">82%</p>
              </div>
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase tracking-[0.18em]">
                  Years in business
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  12 years
                </p>
              </div>
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase tracking-[0.18em]">
                  Completed orders
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  8.2k
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-white shadow-sm">
            <tr>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Supplier
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Verified
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Rating
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Reviews
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Price
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                MOQ
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Stock
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Shipping
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Location
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Response
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredSuppliers.map((supplier) => (
              <SupplierComparisonRow
                key={supplier.id}
                supplier={supplier}
                isSelected={selectedSupplierIds.includes(supplier.id)}
                onToggleSelect={toggleSelect}
                onContact={handleContact}
                onBuyNow={handleBuyNow}
                badges={{
                  lowestPrice: metrics.lowestPriceId === supplier.id,
                  lowestMOQ: metrics.lowestMOQId === supplier.id,
                  highestRating: metrics.highestRatingId === supplier.id,
                  fastestShipping: metrics.fastestShippingId === supplier.id,
                  bestResponse: metrics.bestResponseId === supplier.id,
                  highestStock: metrics.highestStockId === supplier.id,
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden grid gap-4">
        {filteredSuppliers.map((supplier) => (
          <SupplierCard
            key={supplier.id}
            supplier={supplier}
            isSelected={selectedSupplierIds.includes(supplier.id)}
            onToggleSelect={toggleSelect}
            onContact={handleContact}
            onBuyNow={handleBuyNow}
            badges={{
              lowestPrice: metrics.lowestPriceId === supplier.id,
              lowestMOQ: metrics.lowestMOQId === supplier.id,
              highestRating: metrics.highestRatingId === supplier.id,
              fastestShipping: metrics.fastestShippingId === supplier.id,
              bestResponse: metrics.bestResponseId === supplier.id,
              highestStock: metrics.highestStockId === supplier.id,
            }}
          />
        ))}
      </div>

      <SupplierComparisonModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        suppliers={selectedSuppliers}
        metrics={metrics}
        onBuyNow={handleBuyNow}
        onContact={handleContact}
      />
    </section>
  );
};

SupplierComparison.propTypes = {
  product: PropTypes.shape({
    suppliers: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  onAddToCart: PropTypes.func.isRequired,
  onContactSupplier: PropTypes.func,
};

SupplierComparison.defaultProps = {
  onContactSupplier: () => {},
};

export default SupplierComparison;
