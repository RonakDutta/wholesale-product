// SupplierComparison.jsx
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
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "highest-rated", label: "Highest Rated" },
  { value: "lowest-moq", label: "Lowest MOQ" },
  { value: "fastest-shipping", label: "Fastest Shipping" },
  { value: "highest-stock", label: "Highest Stock" },
  { value: "best-response", label: "Best Response" },
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
      if (prev.includes(id)) return prev.filter((item) => item !== id);
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

  const insightCards = [
    {
      label: "Best price",
      value: metrics.lowestPriceId ? `#${metrics.lowestPriceId}` : "—",
      color: "text-emerald-700",
    },
    {
      label: "Fastest shipping",
      value: metrics.fastestShippingId ? `#${metrics.fastestShippingId}` : "—",
      color: "text-sky-700",
    },
    {
      label: "Top rated",
      value: metrics.highestRatingId ? `#${metrics.highestRatingId}` : "—",
      color: "text-amber-700",
    },
    {
      label: "Best response",
      value: metrics.bestResponseId ? `#${metrics.bestResponseId}` : "—",
      color: "text-violet-700",
    },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      {/* Header */}
      <div className="flex flex-col gap-4 md:items-end md:justify-between md:flex-row">
        <div>
          <p className="font-inter text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
            Available Suppliers
          </p>
          <h2 className="mt-1.5 font-dmsans text-2xl font-bold text-slate-900 sm:text-3xl">
            Compare offers for this product
          </h2>
          <p className="mt-2 max-w-xl font-inter text-sm leading-relaxed text-slate-500">
            Browse supplier quotes, delivery times, stock levels, and
            reliability metrics before choosing the best partner.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
            <Sparkles className="w-3.5 h-3.5 text-clay" />
            <span className="font-inter text-sm font-medium text-slate-700">
              {filteredSuppliers.length} found
            </span>
          </div>
          <button
            type="button"
            disabled={selectedSuppliers.length < 2}
            onClick={handleCompare}
            className="inline-flex items-center gap-2 rounded-full bg-clay px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-clay/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            Compare
            {selectedSuppliers.length > 0 && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">
                {selectedSuppliers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters + Sidebar layout */}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {/* Filter cards */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {/* Search */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Search
              </p>
              <div className="mt-2.5 relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, city…"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 font-inter text-sm text-slate-900 outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/10"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Sort by
              </p>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="mt-2.5 w-full rounded-2xl border border-slate-200 bg-white py-2.5 px-4 font-inter text-sm text-slate-900 outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/10"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggles */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Filters
              </p>
              <div className="mt-2.5 space-y-2.5">
                <label className="flex items-center gap-2.5 font-inter text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-clay focus:ring-clay/20"
                  />
                  Verified only
                </label>
                <label className="flex items-center gap-2.5 font-inter text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gstVerifiedOnly}
                    onChange={(e) => setGstVerifiedOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-clay focus:ring-clay/20"
                  />
                  GST verified
                </label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2 px-3 font-inter text-sm text-slate-900 outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/10"
                >
                  <option value={0}>Any rating</option>
                  <option value={4}>4★ & above</option>
                  <option value={3}>3★ & above</option>
                  <option value={2}>2★ & above</option>
                </select>
              </div>
            </div>

            {/* Limits */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Limits
              </p>
              <div className="mt-2.5 space-y-2.5">
                <div>
                  <label className="font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Max MOQ
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={maxMOQ}
                    onChange={(e) => setMaxMOQ(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white py-2.5 px-4 font-inter text-sm text-slate-900 outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/10"
                  />
                </div>
                <div>
                  <label className="font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Max shipping (days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={maxShipping}
                    onChange={(e) => setMaxShipping(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white py-2.5 px-4 font-inter text-sm text-slate-900 outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Best offers strip */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 px-5 py-3">
            <span className="font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Highlights
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="w-3 h-3" />
              Best Price
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-700">
              <Truck className="w-3 h-3" />
              Fastest
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
              <Star className="w-3 h-3" />
              Top Rated
            </span>
            <span className="ml-auto font-inter text-xs text-slate-400">
              {selectedSupplierIds.length}/3 selected
            </span>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
            <p className="font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Quick insights
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {insightCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-100 bg-white p-3.5"
                >
                  <p className="font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    {card.label}
                  </p>
                  <p
                    className={`mt-1.5 font-dmsans text-base font-bold ${card.color}`}
                  >
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
            <p className="font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Trust snapshot
            </p>
            <div className="mt-4 space-y-2.5">
              {[
                { label: "Avg. trust score", value: "82%" },
                { label: "Avg. years in business", value: "12 yrs" },
                { label: "Total completed orders", value: "8.2k" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3"
                >
                  <span className="font-inter text-xs text-slate-500">
                    {item.label}
                  </span>
                  <span className="font-dmsans text-sm font-bold text-slate-900">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="mt-6 hidden md:block overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {[
                "Supplier",
                "Status",
                "Rating",
                "Reviews",
                "Price",
                "MOQ",
                "Stock",
                "Shipping",
                "Location",
                "Response",
                "",
              ].map((heading) => (
                <th
                  key={heading}
                  className="whitespace-nowrap px-5 py-3.5 font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
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

      {/* Mobile cards */}
      <div className="mt-6 grid gap-3 md:hidden">
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

      {/* Modal */}
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
