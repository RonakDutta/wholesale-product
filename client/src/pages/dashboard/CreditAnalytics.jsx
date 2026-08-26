import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/axios";
import CreditSummaryCard from "../../components/credit/CreditSummaryCard";

export default function CreditAnalytics() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api
      .get("/api/credit/analytics")
      .then((response) => setData(response.data))
      .catch(() => toast.error("Could not load credit analytics."));
  }, []);
  const summary = data?.summary || {};
  const aging = data?.aging || {};
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay">
          Receivables
        </p>
        <h1 className="mt-1 text-3xl font-black text-espresso">
          Credit analytics
        </h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <CreditSummaryCard
          label="Total credit outstanding"
          value={summary.total_outstanding}
        />
        <CreditSummaryCard
          label="Total overdue"
          value={summary.total_overdue}
          tone="text-rose-600"
        />
        <CreditSummaryCard
          label="Customers on credit"
          value={summary.customers_on_credit}
        />
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black text-espresso">
          <BarChart3 className="h-5 w-5 text-clay" />
          Accounts receivable aging
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            ["0-30 days", aging.days_0_30],
            ["31-60 days", aging.days_31_60],
            ["61-90 days", aging.days_61_90],
            ["90+ days", aging.days_90_plus],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-black text-espresso">
                ₹{Number(value || 0).toLocaleString("en-IN")}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm text-slate-500">
          Aging is calculated from credit sale due dates and refreshed from the
          ledger when this page loads.
        </p>
      </section>
    </div>
  );
}
