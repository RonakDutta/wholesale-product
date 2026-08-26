import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/axios";

const PaymentCollectionModal = ({ account, onClose, onSaved }) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (!(Number(amount) > 0))
      return toast.error("Enter a positive payment amount.");
    setSaving(true);
    try {
      await api.post("/api/credit/payment", {
        partyId: account.party_id,
        amount,
        method,
        notes,
        idempotencyKey: `payment:${account.party_id}:${Date.now()}`,
      });
      toast.success("Payment recorded.");
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not record payment.");
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-espresso">Receive payment</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <p className="text-sm text-slate-500">
          From {account.business_name || account.name}. Outstanding ₹
          {Number(account.outstanding_balance).toLocaleString("en-IN")}
        </p>
        <input
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          inputMode="decimal"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5"
        />
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"
        >
          <option value="upi">UPI</option>
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="cheque">Cheque</option>
        </select>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="rounded-lg bg-clay px-4 py-2 text-sm font-bold text-white"
          >
            {saving ? "Saving..." : "Record payment"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentCollectionModal;
