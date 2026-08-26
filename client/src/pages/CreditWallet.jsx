import { useEffect, useState } from "react";
import { Download, Wallet } from "lucide-react";
import { toast } from "sonner";
import api from "../utils/axios";
import CreditSummaryCard from "../components/credit/CreditSummaryCard";
import CreditStatusBadge from "../components/credit/CreditStatusBadge";
import CreditUsageBar from "../components/credit/CreditUsageBar";
import CreditLedgerTable from "../components/credit/CreditLedgerTable";
import DueDateBadge from "../components/credit/DueDateBadge";
import OverdueAlert from "../components/credit/OverdueAlert";

export default function CreditWallet() {
  const [data, setData] = useState(null);
  const download = async (format, filename) => {
    const response = await api.get(
      `/api/credit/statement/${data.wallet.party_id}`,
      { params: { format }, responseType: "blob" },
    );
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };
  useEffect(() => {
    api
      .get("/api/credit/wallet")
      .then(async (walletResponse) => {
        if (!walletResponse.data.wallet) return setData({ wallet: null });
        const statement = await api.get(
          `/api/credit/statement/${walletResponse.data.wallet.party_id}`,
        );
        setData({
          wallet: walletResponse.data.wallet,
          transactions: statement.data.transactions,
        });
      })
      .catch(() => toast.error("Could not load your credit wallet."));
  }, []);
  if (!data?.wallet)
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-black text-espresso">Credit Wallet</h1>
        <p className="mt-2 text-sm text-slate-500">
          You do not have an active customer credit account yet.
        </p>
      </div>
    );
  const { wallet } = data;
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay">
            Buyer account
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-black text-espresso">
            <Wallet className="h-7 w-7" />
            Credit Wallet
          </h1>
        </div>
        <CreditStatusBadge status={wallet.credit_status} />
      </div>
      <OverdueAlert amount={wallet.overdue_amount} />
      <div className="grid gap-4 sm:grid-cols-3">
        <CreditSummaryCard label="Credit limit" value={wallet.credit_limit} />
        <CreditSummaryCard
          label="Available credit"
          value={wallet.available_credit}
          tone="text-emerald-700"
        />
        <CreditSummaryCard
          label="Outstanding balance"
          value={wallet.outstanding_balance}
          tone="text-amber-700"
        />
        <CreditSummaryCard
          label="Overdue amount"
          value={wallet.overdue_amount}
          tone="text-rose-600"
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Next due date</p>
          <p className="mt-3 text-lg font-black">
            <DueDateBadge date={wallet.next_due_date} />
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <CreditUsageBar
          limit={wallet.credit_limit}
          outstanding={wallet.outstanding_balance}
        />
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => download("pdf", "credit-statement.pdf")}
            className="flex items-center gap-2 rounded-lg bg-espresso px-4 py-2 text-sm font-bold text-white"
          >
            <Download className="h-4 w-4" />
            View statement PDF
          </button>
          <button
            onClick={() => download("csv", "credit-statement.csv")}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold text-espresso"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </button>
        </div>
      </div>
      <CreditLedgerTable transactions={data.transactions} />
    </div>
  );
}
