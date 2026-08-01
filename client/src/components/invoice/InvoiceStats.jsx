import React from "react";
import { IndianRupee, FileText, CheckCircle2, Clock, AlertCircle, Percent } from "lucide-react";

export default function InvoiceStats({ summary }) {
  if (!summary) return null;

  const cards = [
    {
      title: "Total Revenue",
      value: `₹${Number(summary.total_revenue || 0).toLocaleString("en-IN")}`,
      subtitle: `${summary.total_invoices || 0} Total Invoices`,
      icon: IndianRupee,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
      borderColor: "border-blue-100 dark:border-blue-900/50",
    },
    {
      title: "Collected Revenue",
      value: `₹${Number(summary.paid_amount || 0).toLocaleString("en-IN")}`,
      subtitle: `${summary.paid_count || 0} Paid Invoices`,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
      borderColor: "border-emerald-100 dark:border-emerald-900/50",
    },
    {
      title: "Pending Receivable",
      value: `₹${Number(summary.pending_amount || 0).toLocaleString("en-IN")}`,
      subtitle: `${summary.pending_count || 0} Awaiting Payment`,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
      borderColor: "border-amber-100 dark:border-amber-900/50",
    },
    {
      title: "Overdue Receivables",
      value: `₹${Number(summary.overdue_amount || 0).toLocaleString("en-IN")}`,
      subtitle: `${summary.overdue_count || 0} Overdue Invoices`,
      icon: AlertCircle,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/40",
      borderColor: "border-rose-100 dark:border-rose-900/50",
    },
    {
      title: "GST Collection",
      value: `₹${Number(summary.total_gst_collected || 0).toLocaleString("en-IN")}`,
      subtitle: "Tax Collected",
      icon: Percent,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/40",
      borderColor: "border-indigo-100 dark:border-indigo-900/50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-5 rounded-2xl border bg-white dark:bg-slate-900 dark:border-slate-800 shadow-xs transition-all hover:shadow-md ${card.borderColor}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {card.title}
              </span>
              <div className={`p-2.5 rounded-xl ${card.bgColor} ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {card.value}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {card.subtitle}
            </div>
          </div>
        );
      })}
    </div>
  );
}
