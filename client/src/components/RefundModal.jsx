import { useState } from "react";
import { IndianRupee, X } from "lucide-react";
import { toast } from "sonner";
import api from "../utils/axios";

/**
 * Recording money handed back at the end of a return.
 *
 * There is no payment gateway here, so this does not move any money. It is the
 * same arrangement as every other payment in the product: the wholesaler pays
 * his customer by UPI or in cash, the way he always has, and then writes down
 * that he has. The books follow what he writes.
 *
 * It offers the full amount received, because paying it all back is what
 * happens nearly every time and asking a man to type a figure he did not
 * choose is how the wrong figure gets typed. He can change it if he settled
 * for less, and the screen then says plainly how much he is still holding
 * rather than letting the account look square when it is not.
 *
 * The server caps whatever arrives at the amount actually received, so no
 * amount of typing here can hand back more than came in.
 */
const RefundModal = ({ order, onClose, onRefunded }) => {
  const paid = Number(order?.amount_paid ?? 0);
  const [amount, setAmount] = useState(String(paid));
  const [method, setMethod] = useState("upi");
  const [reference, setReference] = useState("");
  const [working, setWorking] = useState(false);

  const asked = Number(amount);
  const valid = Number.isFinite(asked) && asked > 0 && asked <= paid;
  const holding = valid ? paid - asked : 0;

  const money = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) {
      toast.error(
        asked > paid
          ? `You only received ${money(paid)} on this order.`
          : "Enter how much you have paid back.",
      );
      return;
    }

    setWorking(true);
    try {
      const { data } = await api.post(`/api/orders/${order.id}/refund`, {
        amount: asked,
        method,
        reference: reference.trim() || undefined,
      });
      onRefunded?.(order.id, "refunded");
      toast.success(
        data?.partial
          ? `Refund of ${money(data.refundAmount)} recorded. You are still holding ${money(data.stillHeld)}.`
          : "Refund recorded. This customer's account is square.",
      );
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Could not record the refund. Refresh and try again.",
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-espresso">
              <IndianRupee className="h-5 w-5 text-clay" />
              Pay back {order?.buyer || "your customer"}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Order {order?.order_number || order?.id}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer text-slate-400 transition-colors hover:text-espresso"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
          The goods are back with you and you are holding{" "}
          <span className="font-bold text-espresso">{money(paid)}</span> of his
          money. Pay it back the way you normally would, then record it here.
        </p>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="refund-amount"
              className="mb-1 block text-xs font-semibold text-espresso/70"
            >
              How much have you paid back?
            </label>
            <input
              id="refund-amount"
              type="number"
              step="0.01"
              min="0"
              max={paid}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-espresso focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
              required
            />
            {valid && holding > 0 && (
              <p className="mt-1.5 text-[11px] font-semibold text-amber-700">
                You will still be holding {money(holding)} of his money.
              </p>
            )}
            {!valid && asked > paid && (
              <p className="mt-1.5 text-[11px] font-semibold text-rose-600">
                You only received {money(paid)} on this order.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="refund-method"
              className="mb-1 block text-xs font-semibold text-espresso/70"
            >
              How did you pay him?
            </label>
            <select
              id="refund-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-espresso focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
            >
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank transfer</option>
              <option value="cheque">Cheque</option>
              <option value="other">Some other way</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="refund-reference"
              className="mb-1 block text-xs font-semibold text-espresso/70"
            >
              Reference number, if you have one
            </label>
            <input
              id="refund-reference"
              type="text"
              placeholder="UTR, cheque number, anything you can look up later"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-espresso focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-espresso/60 transition-colors hover:bg-slate-100"
            >
              Not yet
            </button>
            <button
              type="submit"
              disabled={working || !valid}
              className="cursor-pointer rounded-xl bg-clay px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-espresso disabled:opacity-50"
            >
              {working ? "Recording..." : "I have paid this back"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RefundModal;
