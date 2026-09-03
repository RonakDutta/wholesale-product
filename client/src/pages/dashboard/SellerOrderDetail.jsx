import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  IndianRupee,
  Package,
  Phone,
  Truck,
  Undo2,
  User,
  XCircle,
} from "lucide-react";
import api from "../../utils/axios";
import { toast } from "sonner";
import OrderTracking from "../../components/OrderTracking";
import DispatchModal from "../../components/DispatchModal";
import RefuseOrderModal from "../../components/RefuseOrderModal";
import {
  formatOrderStatus,
  getOrderStatusStyle,
  getNextStep,
  canRefuse,
  isReturnRequested,
  RETURN_ANSWERS,
} from "../../utils/orderStatus";

/**
 * One order, everything about it, in one place.
 *
 * The Orders list is the right screen for clearing twenty orders standing in
 * the godown: one row, one button, next. It is the wrong screen for the one
 * order that needs attention, and that was the only screen there was. Packing,
 * dispatching, answering a return and reading the delivery checkpoints were
 * all driven from a table row, and the checkpoints could not be seen from
 * there at all.
 *
 * So the list keeps its one tap step and this page exists beside it. Nothing
 * moved: both drive the same endpoints and the same rules, because two screens
 * with their own idea of what an order may do next is how they drift apart.
 *
 * Order of the page follows the order of the questions actually asked about a
 * live order: what state is it in and what do I do next, who is it for, what
 * is in it, has he paid, where has it got to, and what has happened so far.
 */

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Quantities come back as numerics, so pg hands them over as "10.000". A
// wholesaler counting pieces should read 10, and one selling by the metre
// should still read 2.5, which is exactly what dropping the string form and
// keeping the number does.
const qty = (value) => String(Number(value || 0));

const when = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

const Card = ({ title, icon: Icon, action, children }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
        {title}
      </h3>
      {action}
    </div>
    {children}
  </section>
);

const SellerOrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [refusing, setRefusing] = useState(false);
  // Bumped after anything that moves the order, so the page is rebuilt from
  // what the server actually did rather than from what the button hoped for.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [orderRes, timelineRes] = await Promise.all([
          api.get(`/api/orders/${orderId}`),
          api.get(`/api/orders/${orderId}/timeline`),
        ]);
        if (!alive) return;
        const body = orderRes.data?.order || orderRes.data;
        setOrder(body);
        setItems(Array.isArray(body?.items) ? body.items : []);
        setTimeline(timelineRes.data?.timeline || []);
      } catch (error) {
        console.error("Failed to load the order", error);
        if (alive) toast.error("Could not load this order.");
      }
      if (alive) setLoading(false);
    };
    load();
    return () => {
      alive = false;
    };
  }, [orderId, reloadKey]);

  // The row is refreshed from the server rather than patched locally, because
  // moving an order does more than change a word: accepting writes a sale,
  // completing a return cancels one. A local guess would show a stale page.
  const move = async (to, label) => {
    setWorking(true);
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status: to });
      toast.success(label);
      reload();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Could not update this order. Refresh and try again.",
      );
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="font-semibold text-espresso">Could not load this order</p>
        <Link to="/seller/orders" className="mt-2 inline-block text-sm font-bold text-clay">
          Back to orders
        </Link>
      </div>
    );
  }

  const step = getNextStep(order.status);
  const total = Number(order.total_amount || 0);
  const paid = Number(order.amount_paid || 0);
  const due = Math.max(total - paid, 0);
  const lines = items.length > 0 ? items : [];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <button
          onClick={() => navigate("/seller/orders")}
          className="mb-3 inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-clay"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All orders
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-mono text-xl font-black text-espresso sm:text-2xl">
            {order.order_number || `ORD-${order.id}`}
          </h2>
          <span
            className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getOrderStatusStyle(order.status)}`}
          >
            {formatOrderStatus(order.status)}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">Placed {when(order.created_at)}</p>
      </div>

      {/* What to do next, at the top, because it is the reason the page was
          opened. A return is a choice rather than a step, so it gets its own
          pair of buttons. */}
      {(step || canRefuse(order.status) || isReturnRequested(order.status)) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          {isReturnRequested(order.status) ? (
            <>
              <p className="text-sm font-bold text-espresso">
                {order.buyer_name || "Your customer"} wants to send this back
              </p>
              {order.return_reason && (
                <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  &ldquo;{order.return_reason}&rdquo;
                </p>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {RETURN_ANSWERS.map((answer) => (
                  <button
                    key={answer.to}
                    onClick={() =>
                      move(
                        answer.to,
                        answer.to === "return_approved"
                          ? "Return accepted. Mark it once the goods are back with you."
                          : "Return refused. This order stays owed.",
                      )
                    }
                    disabled={working}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-60 ${
                      answer.tone === "primary"
                        ? "bg-clay text-cream hover:bg-espresso"
                        : "border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600"
                    }`}
                  >
                    <Undo2 className="h-4 w-4" />
                    {answer.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {step && (
                <button
                  onClick={() =>
                    step.dispatch ? setDispatching(true) : move(step.to, `${step.label} done.`)
                  }
                  disabled={working}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-clay px-4 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-espresso disabled:opacity-60"
                >
                  {step.dispatch ? <Truck className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  {working ? "Saving..." : step.label}
                </button>
              )}
              {canRefuse(order.status) && (
                <button
                  onClick={() => setRefusing(true)}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:border-rose-300 hover:text-rose-600"
                >
                  <XCircle className="h-4 w-4" />
                  Refuse
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Customer"
          icon={User}
          action={
            order.party_id ? (
              <Link
                to={`/seller/customers/${order.party_id}`}
                className="text-xs font-bold text-clay hover:underline"
              >
                His khata
              </Link>
            ) : null
          }
        >
          <div className="space-y-1 px-5 py-4">
            <p className="text-sm font-bold text-espresso">
              {order.buyer_name || "Customer"}
            </p>
            {order.contact_phone && (
              <a
                href={`tel:${order.contact_phone}`}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-clay"
              >
                <Phone className="h-3.5 w-3.5" />
                {order.contact_phone}
              </a>
            )}
            {order.delivery_address && (
              <p className="pt-1 text-sm text-slate-500">
                {formatAddress(order.delivery_address)}
              </p>
            )}
          </div>
        </Card>

        <Card title="Money" icon={IndianRupee}>
          <dl className="space-y-2 px-5 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Order total</dt>
              <dd className="font-bold text-espresso">₹{money(total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Received</dt>
              <dd className="font-semibold text-emerald-700">₹{money(paid)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <dt className="font-semibold text-slate-600">Still due</dt>
              <dd className={`font-black ${due > 0 ? "text-amber-600" : "text-espresso"}`}>
                ₹{money(due)}
              </dd>
            </div>
            {order.payment_plan === "installment_50_50" && (
              <p className="pt-1 text-xs text-slate-500">
                Paying in two halves.
              </p>
            )}
          </dl>
        </Card>
      </div>

      <Card title={`What is in it (${lines.length || 1})`} icon={Package}>
        {lines.length === 0 ? (
          // Orders placed before order_items existed carry one product on the
          // order row itself. Reading only the lines would show an empty box.
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-sm font-bold text-espresso">{order.product_name}</p>
              <p className="text-xs text-slate-500">{qty(order.quantity)} units</p>
            </div>
            <p className="text-sm font-bold text-espresso">₹{money(order.total_amount)}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lines.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-espresso">
                    {line.product_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {qty(line.quantity)} &times; ₹{money(line.discount_price || line.unit_price)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-espresso">
                  ₹{money(line.total_price)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Checkpoints and the driver link, the same component the buyer's page
          uses. It already knows the difference: the driver panel only appears
          once the goods are packed, and only for the seller. */}
      <OrderTracking orderId={orderId} />

      <Card title="What has happened" icon={Clock}>
        {timeline.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Nothing recorded yet.
          </p>
        ) : (
          <ol className="divide-y divide-slate-100">
            {timeline.map((entry, index) => (
              <li key={entry.id || index} className="flex gap-3 px-5 py-3.5">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    index === timeline.length - 1 ? "bg-clay" : "bg-slate-300"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-espresso">
                    {formatOrderStatus(entry.status)}
                  </p>
                  {entry.remarks && (
                    <p className="text-xs text-slate-600">{entry.remarks}</p>
                  )}
                  <p className="mt-0.5 text-xs text-slate-400">
                    {when(entry.created_at)}
                    {entry.updated_by_role ? ` · by the ${entry.updated_by_role}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {dispatching && (
        <DispatchModal
          order={{ ...order, buyer: order.buyer_name }}
          onClose={() => setDispatching(false)}
          onDispatched={reload}
        />
      )}

      {refusing && (
        <RefuseOrderModal
          order={{ ...order, buyer: order.buyer_name }}
          onClose={() => setRefusing(false)}
          onCancelled={reload}
        />
      )}
    </div>
  );
};

/**
 * The delivery address, which is stored as JSON on some orders and as plain
 * text on older ones. Reading it blindly put "[object Object]" on the screen.
 */
const formatAddress = (raw) => {
  if (!raw) return "";
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  if (typeof value !== "object") return String(value);
  return [value.street, value.address, value.city, value.state, value.pincode]
    .filter(Boolean)
    .join(", ");
};

export default SellerOrderDetail;
