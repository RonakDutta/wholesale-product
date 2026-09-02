import { useEffect, useState } from "react";
import { CreditCard, Search, Settings2 } from "lucide-react";
import api from "../../utils/axios";
import { toast } from "sonner";
import CreditStatusBadge from "../../components/credit/CreditStatusBadge";
import CreditUsageBar from "../../components/credit/CreditUsageBar";
import PaymentCollectionModal from "../../components/credit/PaymentCollectionModal";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export default function CreditAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = () =>
    api
      .get(
        `/api/credit/accounts${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      )
      .then((r) => setAccounts(r.data.accounts || []))
      .catch(() => toast.error("Could not load credit accounts"));
  useEffect(() => {
    load();
  }, [search]);
  const save = async (event) => {
    event.preventDefault();
    try {
      await api.put(`/api/credit/${editing.id}/limit`, {
        creditLimit: editing.credit_limit,
        creditPeriodDays: editing.credit_period_days,
        creditStatus: editing.credit_status,
      });
      toast.success("Credit settings updated");
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update settings");
    }
  };
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-clay">
            Receivables
          </p>
          <h1 className="text-2xl font-black text-espresso">Credit Accounts</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            placeholder="Search customers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
          />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-4">Customer</th>
              <th className="p-4">Limit</th>
              <th className="p-4">Outstanding</th>
              <th className="p-4">Available</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-t border-slate-100">
                <td className="p-4">
                  <p className="font-bold text-espresso">{account.name}</p>
                  <p className="text-xs text-slate-500">
                    {account.business_name || account.phone || ""}
                  </p>
                  <div className="mt-2 max-w-40">
                    <CreditUsageBar
                      limit={account.credit_limit}
                      outstanding={account.outstanding_balance}
                    />
                  </div>
                </td>
                <td className="p-4 font-semibold">
                  {money(account.credit_limit)}
                </td>
                <td className="p-4 font-semibold">
                  {money(account.outstanding_balance)}
                </td>
                <td className="p-4 font-semibold text-emerald-700">
                  {money(account.calculated_available_credit)}
                </td>
                <td className="p-4">
                  <CreditStatusBadge status={account.credit_status} />
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button
                      title="Edit credit settings"
                      onClick={() => setEditing({ ...account })}
                      className="rounded-lg border border-slate-200 p-2"
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>
                    {Number(account.outstanding_balance) > 0 && (
                      <button
                        onClick={() => setSelected(account)}
                        className="rounded-lg bg-clay px-3 py-2 text-xs font-bold text-white"
                      >
                        Receive payment
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan="6" className="p-10 text-center text-slate-500">
                  <CreditCard className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  No credit accounts yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selected && (
        <PaymentCollectionModal
          party={selected}
          onClose={() => setSelected(null)}
          onSaved={load}
        />
      )}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 p-4">
          <form
            onSubmit={save}
            className="w-full max-w-sm rounded-xl bg-white p-6"
          >
            <h2 className="mb-4 text-lg font-black">Credit settings</h2>
            <label className="mb-3 block text-sm font-semibold">
              Credit limit
              <input
                type="number"
                min="0"
                step="0.01"
                value={editing.credit_limit}
                onChange={(e) =>
                  setEditing({ ...editing, credit_limit: e.target.value })
                }
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="mb-3 block text-sm font-semibold">
              Credit period in days
              <input
                type="number"
                min="1"
                max="365"
                value={editing.credit_period_days}
                onChange={(e) =>
                  setEditing({ ...editing, credit_period_days: e.target.value })
                }
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <select
              value={editing.credit_status}
              onChange={(e) =>
                setEditing({ ...editing, credit_status: e.target.value })
              }
              className="mb-5 w-full rounded-lg border p-2"
            >
              <option value="active">Active</option>
              <option value="warning">Warning</option>
              <option value="blocked">Blocked</option>
            </select>
            <button className="w-full rounded-lg bg-clay py-2.5 font-bold text-white">
              Save settings
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
