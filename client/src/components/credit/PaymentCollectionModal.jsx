import { useState } from "react";
import { X } from "lucide-react";
import api from "../../utils/axios";
import { toast } from "sonner";

export default function PaymentCollectionModal({ party, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount: "",
    paymentMethod: "cash",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post(
        "/api/credit/payment",
        { partyId: party.id, ...form },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      );
      toast.success("Payment recorded");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not record payment");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-espresso">Receive payment</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <label className="mb-3 block text-sm font-semibold">
          Amount
          <input
            required
            min="0.01"
            max={party.outstanding_balance}
            step="0.01"
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 p-2.5"
          />
        </label>
        <label className="mb-3 block text-sm font-semibold">
          Payment method
          <select
            value={form.paymentMethod}
            onChange={(e) =>
              setForm({ ...form, paymentMethod: e.target.value })
            }
            className="mt-1 w-full rounded-lg border border-slate-200 p-2.5"
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank</option>
            <option value="cheque">Cheque</option>
          </select>
        </label>
        <label className="mb-5 block text-sm font-semibold">
          Notes
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 p-2.5"
            rows="3"
          />
        </label>
        <button
          disabled={saving}
          className="w-full rounded-lg bg-clay py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Record payment"}
        </button>
      </form>
    </div>
  );
}
