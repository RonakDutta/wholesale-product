import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  IndianRupee,
  PackageSearch,
  ShoppingBag,
} from "lucide-react";
import api from "../utils/axios";
import { toast } from "sonner";
import {
  formatOrderStatus,
  getOrderStatusStyle,
} from "../utils/orderStatus";

// Buckets are driven by the payment outcome, which is what a buyer actually
// wants to sort by: what they paid for, what still needs paying, and what
// never went through.
const TABS = [
  { label: "All Orders", key: "all" },
  { label: "Paid", key: "paid" },
  { label: "Awaiting Payment", key: "awaiting" },
  { label: "Failed / Cancelled", key: "failed" },
];

const bucketOf = (order) => {
  const payment = String(order.payment_status || "").toLowerCase();
  const status = String(order.status || "").toLowerCase();

  if (status === "cancelled" || payment === "failed" || status === "payment_failed") {
    return "failed";
  }
  if (payment === "paid" || payment === "partial" || payment === "cod") {
    return "paid";
  }
  return "awaiting";
};

const BUCKET_COPY = {
  paid: {
    title: "No paid orders yet",
    body: "Orders you have paid for will appear here.",
  },
  awaiting: {
    title: "Nothing awaiting payment",
    body: "Orders still waiting on payment will show up here.",
  },
  failed: {
    title: "No failed or cancelled orders",
    body: "Orders you cancelled or that failed at payment will be listed here.",
  },
  all: {
    title: "You have not placed any orders",
    body: "Once you order from a supplier, everything shows up here.",
  },
};

const OrderRow = ({ order }) => {
  const bucket = bucketOf(order);
  const placed = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-sage/20 bg-white/80 p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-espresso/40">
            {order.order_number || `ORD-${order.id}`}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getOrderStatusStyle(
              order.status,
            )}`}
          >
            {formatOrderStatus(order.status)}
          </span>
        </div>

        <h3 className="mt-1.5 truncate text-base font-bold text-espresso">
          {order.product}
        </h3>
        <p className="mt-0.5 truncate text-sm text-espresso/60">
          {order.supplier_name} · Placed {placed}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <span className="flex items-center text-lg font-black text-clay">
          <IndianRupee className="h-4 w-4" />
          {Number(order.total_amount || 0).toLocaleString("en-IN")}
        </span>

        <div className="flex items-center gap-2">
          {bucket === "awaiting" && (
            <Link
              to={`/payment/${order.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-clay px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-espresso"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Pay now
            </Link>
          )}
          <Link
            to={`/orders/${order.id}`}
            className="rounded-xl border border-sage/40 px-3 py-2 text-xs font-bold text-espresso transition-colors hover:bg-sage/10"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
};

const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    let cancelled = false;

    const fetchOrders = async () => {
      try {
        const res = await api.get("/api/orders/buyer");
        if (!cancelled) setOrders(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch orders", err);
        if (!cancelled) toast.error("Could not load your orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOrders();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const base = { all: orders.length, paid: 0, awaiting: 0, failed: 0 };
    orders.forEach((order) => {
      base[bucketOf(order)] += 1;
    });
    return base;
  }, [orders]);

  const visible = useMemo(
    () => (tab === "all" ? orders : orders.filter((o) => bucketOf(o) === tab)),
    [orders, tab],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-16">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="group rounded-lg p-2 text-espresso/60 transition-colors hover:bg-sage/10 hover:text-espresso"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-espresso">
            Your Orders
          </h1>
          <p className="text-sm text-espresso/60">
            Track payments, pending checkouts and cancelled orders
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-sage/20 pb-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-clay text-clay"
                  : "border-transparent text-espresso/50 hover:text-espresso"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? "bg-clay/10 text-clay" : "bg-sage/15 text-espresso/50"
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sage/40 py-16 text-center">
          <PackageSearch className="mx-auto mb-3 h-10 w-10 text-espresso/15" />
          <p className="font-bold text-espresso">{BUCKET_COPY[tab].title}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-espresso/50">
            {BUCKET_COPY[tab].body}
          </p>
          {tab === "all" && (
            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-clay px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-espresso"
            >
              <ShoppingBag className="h-4 w-4" />
              Browse products
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
