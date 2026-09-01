/**
 * Single source of truth for how order statuses are labelled and coloured.
 *
 * The backend stores the lifecycle values from orderStatusService
 * ("payment_pending", "shipped", ...). The dashboard pages used to compare
 * against capitalised names like "Delivered", so badges always fell through to
 * the default style and the Orders tabs matched nothing. Both pages now share
 * these helpers so they cannot drift apart again.
 */

const LABELS = {
  pending: "Pending",
  payment_pending: "Payment Pending",
  partially_paid: "Partially Paid",
  partial: "Partially Paid",
  payment_completed: "Payment Received",
  payment_failed: "Payment Failed",
  supplier_accepted: "Accepted",
  processing: "Processing",
  packed: "Packed",
  ready_for_pickup: "Ready for Pickup",
  shipped: "Shipped",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  failed_delivery: "Delivery Failed",
  completed: "Completed",
  return_requested: "Return Requested",
  return_approved: "Return Approved",
  return_rejected: "Return Rejected",
  return_completed: "Return Completed",
  replacement_requested: "Replacement Requested",
  replacement_issued: "Replacement Issued",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

// Groups drive both the badge colour and the Orders page tabs.
const GROUPS = {
  awaiting: [
    "pending",
    "payment_pending",
    "partially_paid",
    "partial",
    "payment_completed",
    "supplier_accepted",
  ],
  processing: ["processing", "packed", "ready_for_pickup"],
  shipped: ["shipped", "in_transit", "out_for_delivery"],
  delivered: ["delivered", "completed"],
  cancelled: [
    "cancelled",
    "payment_failed",
    "failed_delivery",
    "refunded",
    "return_requested",
    "return_approved",
    "return_rejected",
    "return_completed",
  ],
};

// Per-status overrides where the group colour would be misleading - a
// received payment is a success and should read green, not "still pending".
const STATUS_STYLES = {
  partially_paid: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
  partial: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
  payment_completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  supplier_accepted: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const GROUP_STYLES = {
  awaiting: "bg-amber-100 text-amber-700 border-amber-200",
  processing: "bg-indigo-100 text-indigo-700 border-indigo-200",
  shipped: "bg-blue-100 text-blue-700 border-blue-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

const normalize = (status) => String(status || "").trim().toLowerCase();

export const getOrderStatusGroup = (status) => {
  const value = normalize(status);
  return (
    Object.keys(GROUPS).find((group) => GROUPS[group].includes(value)) || null
  );
};

/** Human-readable label, tolerant of unknown values. */
export const formatOrderStatus = (status) => {
  const value = normalize(status);
  if (!value) return "Unknown";
  if (LABELS[value]) return LABELS[value];
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/** Tailwind classes for a status badge. */
export const getOrderStatusStyle = (status) => {
  const value = normalize(status);
  if (STATUS_STYLES[value]) return STATUS_STYLES[value];
  const group = getOrderStatusGroup(value);
  return GROUP_STYLES[group] || "bg-slate-100 text-slate-700 border-slate-200";
};

/** Tabs for the Orders page, in lifecycle order. */
export const ORDER_TABS = [
  { label: "All Orders", group: null },
  { label: "Awaiting", group: "awaiting" },
  { label: "Processing", group: "processing" },
  { label: "Shipped", group: "shipped" },
  { label: "Delivered", group: "delivered" },
  { label: "Cancelled", group: "cancelled" },
];

/** Whether an order belongs under the given tab label. */
export const matchesOrderTab = (status, tabLabel) => {
  const tab = ORDER_TABS.find((t) => t.label === tabLabel);
  if (!tab || !tab.group) return true;
  return getOrderStatusGroup(status) === tab.group;
};

/**
 * The one thing the wholesaler does next to this order.
 *
 * The lifecycle has 22 states and orderStatusService is the authority on what
 * may follow what. Showing a wholesaler 22 buttons would be useless, so this
 * names the single next step of the ordinary path: he took the money, he
 * accepts, he packs, he sends it, it arrives.
 *
 * Every `to` here has to be a move orderStatusService already allows. The
 * server validates it again and refuses anything else, so this list can only
 * ever offer less than the lifecycle, never more.
 *
 * Labels are what a trader would say out loud. "Ready for pickup" is what the
 * database calls it; "Ready to send" is what he calls it.
 */
const NEXT_STEP = {
  payment_completed: { to: "supplier_accepted", label: "Accept order" },
  supplier_accepted: { to: "processing", label: "Start packing" },
  processing: { to: "packed", label: "Mark packed" },
  packed: { to: "ready_for_pickup", label: "Ready to send" },
  // The dispatch step. The screen asks for driver details here rather than
  // moving straight on, because this is the moment the goods leave the godown
  // and the buyer starts asking where they are.
  ready_for_pickup: { to: "shipped", label: "Send out", dispatch: true },
  shipped: { to: "in_transit", label: "On the way" },
  in_transit: { to: "out_for_delivery", label: "Out for delivery" },
  out_for_delivery: { to: "delivered", label: "Mark delivered" },
  delivered: { to: "completed", label: "Close this order" },
};

/**
 * What to offer on this order, or null when there is nothing to do.
 *
 * Null covers both ends: an order still waiting for the buyer to pay is his
 * move, not the wholesaler's, and a cancelled or refunded one is finished.
 */
export const getNextStep = (status) => NEXT_STEP[normalize(status)] || null;

/**
 * Orders that need the wholesaler to do something, newest first.
 *
 * This is the count worth putting in front of him: not how many orders exist,
 * but how many are waiting on him.
 */
export const needsAction = (status) => Boolean(getNextStep(status));
