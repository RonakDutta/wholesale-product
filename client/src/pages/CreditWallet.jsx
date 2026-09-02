import { useEffect, useState } from "react";
import { CreditCard, Download } from "lucide-react";
import api from "../utils/axios";
import CreditStatusBadge from "../components/credit/CreditStatusBadge";
import CreditUsageBar from "../components/credit/CreditUsageBar";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export default function CreditWallet() {
  const [data, setData] = useState({ account: null, transactions: [] });
  useEffect(() => {
    api
      .get("/api/credit/wallet")
      .then((r) => setData(r.data))
      .catch(() => {});
  }, []);
  const { account, transactions } = data;
  if (!account)
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <CreditCard className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <h1 className="text-xl font-black text-espresso">Credit Wallet</h1>
        <p className="mt-2 text-sm text-slate-500">
          No credit account is linked to your account yet.
        </p>
      </div>
    );
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-clay">
          Your account
        </p>
        <h1 className="text-2xl font-black text-espresso">Credit Wallet</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Credit limit", account.credit_limit],
          ["Outstanding", account.outstanding_balance],
          ["Available", account.calculated_available_credit],
          ["Overdue", account.overdue_amount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-black text-espresso">
              {money(value)}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <CreditStatusBadge status={account.credit_status} />
          <span className="text-sm text-slate-500">
            Period: {account.credit_period_days} days
          </span>
        </div>
        <CreditUsageBar
          limit={account.credit_limit}
          outstanding={account.outstanding_balance}
        />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="font-black text-espresso">Recent transactions</h2>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"
          >
            <Download className="h-4 w-4" /> Statement
          </button>
        </div>
        <div className="divide-y">
          {transactions.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 text-sm"
            >
              <div>
                <p className="font-bold text-espresso">
                  {item.transaction_type.replaceAll("_", " ")}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(item.created_at).toLocaleDateString("en-IN")}{" "}
                  {item.due_date ? `, due ${item.due_date}` : ""}
                </p>
              </div>
              <span
                className={`font-black ${item.transaction_type === "payment_received" ? "text-emerald-700" : "text-rose-700"}`}
              >
                {item.transaction_type === "payment_received" ? "-" : ""}
                {money(item.amount)}
              </span>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="p-8 text-center text-sm text-slate-500">
              No transactions yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
