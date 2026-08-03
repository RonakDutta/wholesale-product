import { TrendingUp, Users } from "lucide-react";

export default function InvoiceAnalytics({ stats }) {
  if (!stats) return null;

  const { revenueTrend = [], topParties = [] } = stats;

  const maxRevenue = Math.max(1, ...revenueTrend.map((t) => Number(t.revenue)));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Revenue Trend Chart (CSS Bar Chart) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-espresso flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-clay" /> Revenue & GST Trend
            (Last 6 Months)
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Monthly Breakdown
          </span>
        </div>

        {revenueTrend.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-slate-400">
            No sales data available yet
          </div>
        ) : (
          <div className="h-48 flex items-end justify-between gap-3 pt-6 border-b border-slate-100 pb-2">
            {revenueTrend.map((item, idx) => {
              const heightPct =
                Math.round((Number(item.revenue) / maxRevenue) * 100) || 5;
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-2 group"
                >
                  <div className="text-[10px] font-bold text-espresso/70 opacity-0 group-hover:opacity-100 transition-opacity">
                    ₹{Number(item.revenue).toLocaleString("en-IN")}
                  </div>
                  <div className="w-full bg-slate-100/80 rounded-t-xl h-36 flex items-end p-1 relative overflow-hidden">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-clay to-clay/70 rounded-t-lg transition-all duration-500 group-hover:from-espresso group-hover:to-clay"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-espresso/50">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Parties List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-espresso flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" /> Top Customers /
            Suppliers
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
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-espresso truncate max-w-[150px]">
                    {party.party_name || "Merchant"}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {party.invoice_count} Invoice
                    {party.invoice_count === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="text-xs font-extrabold text-emerald-600">
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
