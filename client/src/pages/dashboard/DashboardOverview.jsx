import { useState, useEffect } from "react";
import {
  Package,
  ShoppingBag,
  ShieldAlert,
  ArrowRight,
  Clock,
  MapPin,
  IndianRupee,
  Users,
  Star,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Truck,
  Boxes,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../utils/axios";
import {
  formatOrderStatus,
  getOrderStatusStyle,
} from "../../utils/orderStatus";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/** Headline figure, with a trend against the previous period when there is one. */
const MetricCard = ({ icon: Icon, label, value, sub, trend, tone = "slate" }) => {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    clay: "bg-clay/10 text-clay",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        {trend != null && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-bold ${
              trend >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {trend >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <h4 className="text-2xl font-black text-espresso">{value}</h4>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      {sub && <p className="mt-1 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
};

/** One stage of the fulfilment pipeline. */
const PipelineStep = ({ icon: Icon, label, count, to, highlight }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
      highlight && count > 0
        ? "border-clay/40 bg-clay/5 hover:bg-clay/10"
        : "border-slate-200 bg-white hover:bg-slate-50"
    }`}
  >
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
        highlight && count > 0
          ? "bg-clay text-white"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <p className="text-lg font-black leading-none text-espresso">{count}</p>
      <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
        {label}
      </p>
    </div>
  </Link>
);

const DashboardOverview = () => {
  const [data, setData] = useState({ stats: null, recentOrders: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/api/dashboard/stats");
        setData(response.data);
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
      </div>
    );
  }

  const { stats, recentOrders } = data;
  if (!stats) {
    return (
      <div className="py-20 text-center text-sm text-slate-500">
        Could not load your dashboard. Please refresh.
      </div>
    );
  }

  const needsRestocking = stats.lowStock + stats.outOfStock;

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      {/* Setup prompts, shown only while something is genuinely missing */}
      {!stats.warehouseSet && (
        <Link
          to="/seller/settings"
          className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100/70"
        >
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-bold text-amber-900">
              Add your warehouse address
            </p>
            <p className="mt-0.5 text-xs text-amber-800/80">
              Buyers cannot see where their delivery starts from until you set
              it. Takes a minute in Settings.
            </p>
          </div>
        </Link>
      )}

      {!stats.verified && (
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-clay/20 bg-linear-to-r from-clay/10 to-sage/10 p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-clay/20 bg-white shadow-sm">
              <ShieldAlert className="h-5 w-5 text-clay" />
            </span>
            <div>
              <h3 className="text-base font-bold text-espresso">
                Get your business verified
              </h3>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Add your GST and business details to show a verified badge on
                every listing.
              </p>
            </div>
          </div>
          <Link
            to="/seller/settings"
            className="w-full shrink-0 rounded-lg bg-clay px-5 py-2.5 text-center text-sm font-bold text-white shadow-sm transition-colors hover:bg-espresso sm:w-auto"
          >
            Complete verification
          </Link>
        </div>
      )}

      {/* Money and customers */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-espresso">Last 30 days</h2>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          <MetricCard
            icon={IndianRupee}
            tone="emerald"
            label="Revenue received"
            value={money(stats.revenue30)}
            trend={stats.revenueTrendPct}
            sub="Confirmed payments only"
          />
          <MetricCard
            icon={Clock}
            tone="amber"
            label="Awaiting payment"
            value={money(stats.awaitingPaymentValue)}
            sub="Across open orders"
          />
          <MetricCard
            icon={Users}
            tone="blue"
            label="Customers"
            value={stats.customers}
            sub={`Avg order ${money(stats.avgOrderValue)}`}
          />
          <MetricCard
            icon={Star}
            tone="clay"
            label="Buyer rating"
            value={stats.reviewCount > 0 ? Number(stats.rating).toFixed(1) : "-"}
            sub={
              stats.reviewCount > 0
                ? `${stats.reviewCount} review${stats.reviewCount === 1 ? "" : "s"}`
                : "No reviews yet"
            }
          />
        </div>
      </div>

      {/* Fulfilment pipeline */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-espresso">
          Orders in progress
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <PipelineStep
            icon={ShoppingBag}
            label="Needs your action"
            count={stats.needsAction}
            to="/seller/orders"
            highlight
          />
          <PipelineStep
            icon={Package}
            label="Preparing"
            count={stats.preparing}
            to="/seller/orders"
          />
          <PipelineStep
            icon={Truck}
            label="In transit"
            count={stats.inTransit}
            to="/seller/orders"
          />
          <PipelineStep
            icon={ShoppingBag}
            label="Delivered"
            count={stats.delivered}
            to="/seller/orders"
          />
        </div>
      </div>

      {/* Inventory */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-espresso">Inventory</h2>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          <MetricCard
            icon={Boxes}
            tone="blue"
            label="Active listings"
            value={stats.activeListings}
            sub={`Stock worth ${money(stats.stockValue)}`}
          />
          <MetricCard
            icon={AlertTriangle}
            tone={needsRestocking > 0 ? "amber" : "slate"}
            label="Needs restocking"
            value={needsRestocking}
            sub={`${stats.outOfStock} out of stock, ${stats.lowStock} below MOQ`}
          />
          <Link
            to="/seller/products"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50 max-lg:col-span-2"
          >
            <div>
              <p className="text-sm font-bold text-espresso">Manage products</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Update prices, stock and MOQ
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-clay" />
          </Link>
        </div>
      </div>

      {/* Recent orders */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-espresso">Recent orders</h2>
          <Link
            to="/seller/orders"
            className="flex items-center gap-1 text-sm font-semibold text-clay transition-colors hover:text-espresso"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {["Order", "Product", "Buyer", "Amount", "Status", "Date"].map(
                  (heading) => (
                    <th
                      key={heading}
                      className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 ${
                        heading === "Date" ? "text-right" : ""
                      }`}
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No orders yet. They will appear here as buyers order from
                    you.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4 font-bold text-espresso">
                      {order.order_number || `ORD-${order.id}`}
                    </td>
                    <td className="px-6 py-4">
                      <p className="max-w-50 truncate font-bold text-slate-700">
                        {order.product}
                        {order.item_count > 1 && (
                          <span className="font-normal text-slate-400">
                            {" "}
                            + {order.item_count - 1} more
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.qty} units
                      </p>
                    </td>
                    <td className="max-w-40 truncate px-6 py-4 text-slate-600">
                      {order.buyer}
                    </td>
                    <td className="px-6 py-4 font-bold text-clay">
                      {money(order.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getOrderStatusStyle(
                          order.status,
                        )}`}
                      >
                        {formatOrderStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-medium text-slate-500">
                      {new Date(order.date).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
