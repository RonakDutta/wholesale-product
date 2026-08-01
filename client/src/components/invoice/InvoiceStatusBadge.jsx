import React from "react";

export default function InvoiceStatusBadge({ status, type = "invoice" }) {
  if (!status) return null;

  const normalized = String(status).trim();

  let badgeStyles = "bg-gray-100 text-gray-700 border-gray-200";

  switch (normalized.toLowerCase()) {
    case "paid":
      badgeStyles = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800";
      break;
    case "partial":
    case "partial paid":
      badgeStyles = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800";
      break;
    case "pending":
    case "generated":
      badgeStyles = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800";
      break;
    case "overdue":
    case "failed":
      badgeStyles = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800";
      break;
    case "cancelled":
    case "refunded":
      badgeStyles = "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
      break;
    case "draft":
    case "sent":
    case "viewed":
      badgeStyles = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800";
      break;
    default:
      badgeStyles = "bg-gray-100 text-gray-700 border-gray-200";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${badgeStyles}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75" />
      {normalized}
    </span>
  );
}
