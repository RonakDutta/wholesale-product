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
  const group = getOrderStatusGroup(status);
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
