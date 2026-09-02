import { useState } from "react";
import { XCircle, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import api from "../utils/axios";

/**
 * Refusing an order, or calling one off.
 *
 * The same screen serves both sides, because the thing being done is the same
 * and only the wording changes. A wholesaler refuses an order he cannot fill;
 * a buyer calls off an order he no longer wants.
 *
 * It asks for a reason and it will not proceed without one. The reason goes
 * into the order's history and is the only thing the other side has to go on,
 * so an order that simply turns to "Cancelled" with no explanation is how a
 * customer is lost. It is one line of typing, and it is worth insisting on.
 *
 * It warns about money before anything is pressed, because that is the part
 * people get wrong. Refusing does not refund anybody. Money already taken
 * stays on the books as the customer's credit until somebody actually hands
 * it back or sets it against his next order. Saying so here is the difference
 * between a wholesaler who knows he owes ₹2,100 and one who finds out when
 * the customer telephones.
 */
const RefuseOrderModal = ({ order, asSeller = true, onClose, onCancelled }) => {
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);

  const paid = Number(order?.amount_paid ?? order?.paid ?? 0);
  const money = paid > 0 ? `₹${paid.toLocaleString("en-IN")}` : null;

  const submit = async (e) => {
    e.preventDefault();
    const text = reason.trim();
    if (!text) {
      toast.error("Please say why. Your customer only sees this.");
      return;
    }

    setWorking(true);
    try {
      const { data } = await api.post(`/api/orders/${order.id}/cancel`, {
        reason: text,
      });
      onCancelled?.(order.id, "cancelled");
      if (data?.paymentLeftInPlace) {
        toast.success(
          asSeller
            ? "Order refused. The money already paid is still owed back to your customer."
            : "Order cancelled. The money you paid is still with the seller.",
        );
      } else {
        toast.success(asSeller ? "Order refused." : "Order cancelled.");
      }
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Could not cancel this order. Refresh and try again.",
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-espresso/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black text-espresso">
              <XCircle className="h-5 w-5 text-rose-500" />
              {asSeller ? "Refuse this order" : "Cancel this order"}
            </h3>
            <p className="mt-0.5 text-xs font-semibold text-slate-400">
              {order.order_number} &middot; {order.buyer || order.supplier_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-5 py-5">
          <p className="text-sm text-slate-600">
            {asSeller
              ? "This order will be closed and your customer will be told. It cannot be reopened, so he will have to place a fresh order."
              : "This order will be closed. You will have to place a fresh order if you change your mind."}
          </p>

          {money && (
            <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-900">
                {asSeller ? (
                  <>
                    <strong>{money}</strong> has already been paid for this
                    order. Cancelling does not send it back. It stays in your
                    khata as this customer's credit until you refund him or put
                    it against his next order.
                  </>
                ) : (
                  <>
                    You have already paid <strong>{money}</strong>. Cancelling
                    does not return it automatically. It stays as credit with
                    the seller, so speak to him about a refund.
                  </>
                )}
              </p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Why? {asSeller ? "Your customer sees this" : "The seller sees this"}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              autoFocus
              placeholder={
                asSeller
                  ? "This colour is finished, new lot comes next week"
                  : "Ordered the wrong size"
              }
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-clay focus:bg-white"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
            >
              Keep it
            </button>
            <button
              type="submit"
              disabled={working}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" />
              {working
                ? "Please wait..."
                : asSeller
                  ? "Refuse it"
                  : "Cancel it"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RefuseOrderModal;
