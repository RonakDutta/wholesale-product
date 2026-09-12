import { useState } from "react";
import { CreditCard, FlaskConical } from "lucide-react";
import api from "../utils/axios";
import { toast } from "sonner";

/**
 * Paying by card, netbanking or a UPI app, through Razorpay.
 *
 * SCAFFOLD. There is no gateway behind this. The server mints a fake order and
 * stands in for Razorpay, and the only real part is the signature check, which
 * runs the genuine algorithm in both modes. See services/razorpayService.js on
 * the server for why that was worth doing rather than returning true.
 *
 * WHAT SAYS IT IS A TEST is the server, not this file. The reply to the order
 * call carries `stub: true`, and the badge below is drawn from that. A
 * constant in the client could disagree with the server it is talking to, and
 * the disagreement worth avoiding is the one where a buyer is shown a real
 * looking checkout by a server that is pretending.
 *
 * When this becomes real, what changes here is that the stub branch goes and
 * `window.Razorpay` opens instead, with the same three calls around it. The
 * checkout script has to be loaded from checkout.razorpay.com, which is a
 * script tag this page does not have yet.
 */
const RazorpayPanel = ({ orderId, amount, onPaid }) => {
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(null);

  const money = (value) =>
    Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  /** Opens the gateway order. The amount is the server's, never sent from here. */
  const open = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/api/orders/${orderId}/razorpay/order`);
      setSession(data);
    } catch (err) {
      const code = err.response?.data?.code;
      toast.error(
        code === "RAZORPAY_NOT_IMPLEMENTED"
          ? "Card payment is not switched on for this server yet."
          : err.response?.data?.message || "Could not start a card payment.",
      );
    }
    setBusy(false);
  };

  /**
   * Stands in for the checkout window.
   *
   * The failure button is not decoration. A declined card is the commoner
   * outcome in real life, and a checkout that can only succeed teaches nobody
   * anything about what the screen does when it does not.
   */
  const pretend = async (outcome) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/api/orders/${orderId}/razorpay/simulate`, {
        outcome,
      });

      if (data.outcome === "failure") {
        toast.error(data.error?.description || "Payment failed.");
        setSession(null);
        setBusy(false);
        return;
      }

      // Exactly the payload Razorpay's own handler receives, posted to the
      // same endpoint a real one would post to.
      const verified = await api.post(`/api/orders/${orderId}/razorpay/verify`, {
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
      });

      if (verified.data?.success) {
        toast.success("Payment received.");
        onPaid?.(verified.data);
      } else {
        toast.error(verified.data?.message || "That payment could not be verified.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "That payment could not be verified.");
    }
    setBusy(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-clay" />
          <h3 className="text-sm font-bold text-espresso">
            Card, netbanking or UPI app
          </h3>
        </div>
        {session?.stub && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            <FlaskConical className="h-3 w-3" />
            Test mode
          </span>
        )}
      </div>

      {!session ? (
        <>
          <p className="mt-2 text-xs text-slate-500">
            Pay the whole amount in one go instead of scanning the QR code and
            typing the reference yourself.
          </p>
          <button
            onClick={open}
            disabled={busy}
            className="mt-4 w-full rounded-lg bg-espresso px-4 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60"
          >
            {busy ? "Opening..." : `Pay ₹${money(amount)}`}
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-xs text-slate-500">
            No real gateway is connected. This stands in for the Razorpay
            window so the rest of the flow, the signature check and the way the
            order settles, can be used and tested.
          </p>
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-slate-500">
              Gateway order
            </p>
            <p className="truncate font-mono text-xs text-espresso">
              {session.orderId}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              ₹{money((session.amount || 0) / 100)}, set by the server
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => pretend("success")}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? "..." : "Payment succeeds"}
            </button>
            <button
              onClick={() => pretend("failure")}
              disabled={busy}
              className="rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60"
            >
              Payment fails
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default RazorpayPanel;
