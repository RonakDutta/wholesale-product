import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/axios";
import CreditStatusBadge from "../../components/credit/CreditStatusBadge";
import CreditUsageBar from "../../components/credit/CreditUsageBar";
import CreditLedgerTable from "../../components/credit/CreditLedgerTable";
import PaymentCollectionModal from "../../components/credit/PaymentCollectionModal";
import DueDateBadge from "../../components/credit/DueDateBadge";
import OverdueAlert from "../../components/credit/OverdueAlert";

const money = (value) => Number(value || 0).toLocaleString("en-IN");

export default function CreditAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [payment, setPayment] = useState(false);
  const [saving, setSaving] = useState(false);
  const download = async () => {
    const response = await api.get(
      `/api/credit/statement/${selected.party_id}`,
      { params: { format: "csv" }, responseType: "blob" },
    );
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = "credit-statement.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const load = async () => {
    try {
      const response = await api.get("/api/credit/accounts", {
        params: { search },
      });
      setAccounts(response.data.accounts || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not load credit accounts.",
      );
    }
  };
  useEffect(() => {
    api
      .get("/api/credit/accounts", { params: { search } })
      .then((response) => setAccounts(response.data.accounts || []))
      .catch((error) =>
        toast.error(
          error.response?.data?.message || "Could not load credit accounts.",
        ),
      );
  }, [search]);
  const open = async (account) => {
    setSelected(account);
    try {
      const response = await api.get(`/api/credit/${account.party_id}`);
      setDetails(response.data);
    } catch {
      toast.error("Could not load the credit ledger.");
    }
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      await api.put(`/api/credit/${selected.party_id}/limit`, {
        creditLimit: form.get("limit"),
        creditPeriodDays: form.get("period"),
        creditStatus: form.get("status"),
      });
      toast.success("Credit account updated.");
      await load();
      await open({
        ...selected,
        credit_limit: form.get("limit"),
        credit_period_days: form.get("period"),
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update account.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay">
          Receivables
        </p>
        <h1 className="mt-1 text-3xl font-black text-espresso">
          Credit accounts
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Set limits, collect payments, and keep every credit sale on record.
        </p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-clay"
        />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-190 text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Limit</th>
              <th className="px-4 py-3">Outstanding</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Next due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.map((account) => (
              <tr key={account.party_id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-bold text-espresso">
                  {account.business_name || account.name}
                </td>
                <td className="px-4 py-3">₹{money(account.credit_limit)}</td>
                <td className="px-4 py-3 font-semibold">
                  ₹{money(account.outstanding_balance)}
                </td>
                <td className="px-4 py-3 text-emerald-700">
                  ₹{money(account.available_credit)}
                </td>
                <td className="px-4 py-3">
                  <DueDateBadge date={account.next_due_date} />
                </td>
                <td className="px-4 py-3">
                  <CreditStatusBadge status={account.credit_status} />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => open(account)}
                    className="font-bold text-clay hover:underline"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!accounts.length && (
          <p className="p-10 text-center text-sm text-slate-500">
            No credit accounts found.
          </p>
        )}
      </div>
      {selected && (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-espresso">
                {selected.business_name || selected.name}
              </h2>
              <p className="text-sm text-slate-500">Credit account settings</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPayment(true)}
                className="rounded-lg bg-clay px-3 py-2 text-sm font-bold text-white"
              >
                Receive payment
              </button>
              <button
                onClick={download}
                className="rounded-lg border px-3 py-2 text-sm font-bold"
              >
                Download CSV
              </button>
            </div>
          </div>
          <OverdueAlert
            amount={details?.account?.overdue_amount || selected.overdue_amount}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Limit</p>
              <p className="text-xl font-black">
                ₹{money(selected.credit_limit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Outstanding</p>
              <p className="text-xl font-black">
                ₹{money(selected.outstanding_balance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Available</p>
              <p className="text-xl font-black text-emerald-700">
                ₹{money(selected.available_credit)}
              </p>
            </div>
          </div>
          <CreditUsageBar
            limit={selected.credit_limit}
            outstanding={selected.outstanding_balance}
          />
          <form
            onSubmit={save}
            className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4"
          >
            <input
              name="limit"
              defaultValue={selected.credit_limit}
              type="number"
              min="0"
              step="0.01"
              placeholder="Credit limit"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              name="period"
              defaultValue={selected.credit_period_days}
              type="number"
              min="1"
              max="3650"
              placeholder="Days"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <select
              name="status"
              defaultValue={selected.credit_status}
              className="rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="warning">Warning</option>
              <option value="blocked">Blocked</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              disabled={saving}
              className="rounded-lg bg-espresso px-3 py-2 text-sm font-bold text-white"
            >
              {saving ? "Saving..." : "Save settings"}
            </button>
          </form>
          {details && <CreditLedgerTable transactions={details.transactions} />}
        </section>
      )}
      {payment && (
        <PaymentCollectionModal
          account={selected}
          onClose={() => setPayment(false)}
          onSaved={async () => {
            setPayment(false);
            await load();
            await open(selected);
          }}
        />
      )}
    </div>
  );
}
