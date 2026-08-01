import React from "react";
import { TrendingUp, PieChart, Users, DollarSign } from "lucide-react";

export default function InvoiceAnalytics({ stats }) {
  if (!stats) return null;

  const { revenueTrend = [], statusDistribution = [], topParties = [] } = stats;

  const maxRevenue = Math.max(1, ...revenueTrend.map((t) => Number(t.revenue)));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Revenue Trend Chart (CSS Bar Chart) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" /> Revenue & GST Trend (Last 6 Months)
          </h3>
          <span className="text-xs text-slate-400 font-medium">Monthly Breakdown</span>
        </div>

        {revenueTrend.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-slate-400">
            No sales data available yet
          </div>
        ) : (
          <div className="h-48 flex items-end justify-between gap-3 pt-6 border-b border-slate-100 dark:border-slate-800 pb-2">
            {revenueTrend.map((item, idx) => {
              const heightPct = Math.round((Number(item.revenue) / maxRevenue) * 100) || 5;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    ₹{Number(item.revenue).toLocaleString("en-IN")}
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-t-xl h-36 flex items-end p-1 relative overflow-hidden">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-lg transition-all duration-500 group-hover:from-blue-500 group-hover:to-indigo-400"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Parties List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" /> Top Customers / Suppliers
          </h3>
          <span className="text-xs text-slate-400 font-medium">By Volume</span>
        </div>

        {topParties.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-slate-400">
            No party metrics recorded
          </div>
        ) : (
          <div className="space-y-3">
            {topParties.map((party, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                    {party.party_name || "Merchant"}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {party.invoice_count} Invoice{party.invoice_count === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  ₹{Number(party.total_amount).toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
