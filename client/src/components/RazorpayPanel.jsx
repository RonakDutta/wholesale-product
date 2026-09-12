import { useState } from "react";
import { CreditCard, FlaskConical } from "lucide-react";
import api from "../utils/axios";
import { toast } from "sonner";
import RazorpayCheckoutModal from "./RazorpayCheckoutModal";

/**
 * Paying by card, netbanking or a UPI app, through Razorpay.
 *
 * SCAFFOLD. There is no gateway behind this. The server mints a fake order and
 * stands in for Razorpay, and the only real part is the signature check, which
 * runs the genuine algorithm in both modes. See services/razorpayService.js on
 * the server for why that was worth doing rather than returning true.
 *
 * WHAT SAYS IT IS A TEST is the server, not this file. The reply to the order
 * call carries `stub: true`, and the badge below and the banner in the modal
 * are drawn from it. A constant in the client could disagree with the server
 * it is talking to, and the disagreement worth avoiding is the one where a
 * buyer is shown a real looking checkout by a server that is pretending.
 *
 * The three calls around the window are the real sequence and do not change
 * when the gateway does:
 *
 *   POST razorpay/order      the server opens an order for an amount it chose
 *   ...the window...         today ours, tomorrow Razorpay's iframe
 *   POST razorpay/verify     the handler payload, checked before anything moves
 *
 * Only the middle step is fake. When it becomes real, RazorpayCheckoutModal is
 * deleted and `new window.Razorpay(options).open()` goes in its place, with
 * the same two calls either side.
 */
const RazorpayPanel = ({ orderId, amount, merchant, onPaid }) => {
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(null);
  const [open, setOpen] = useState(false);

  const money = (value) =>
    Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  /** Opens the gateway order, then the window. The amount is never sent from here. */
  const start = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/api/orders/${orderId}/razorpay/order`);
      setSession(data);
      setOpen(true);
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
   * What the window hands back.
   *
   * In the real thing this is Razorpay's `handler` callback and the payload is
   * identical, which is the point: the verify call below is written against
   * the real shape, not against the stub's.
   */
  const pay = async (outcome) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/api/orders/${orderId}/razorpay/simulate`, {
        outcome,
      });

      if (data.outcome === "failure") {
        toast.error(data.error?.description || "Payment failed.");
        setOpen(false);
        setSession(null);
        setBusy(false);
        return;
      }

      const verified = await api.post(`/api/orders/${orderId}/razorpay/verify`, {
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
      });

      if (verified.data?.success) {
        setOpen(false);
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
    <>
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

        <p className="mt-2 text-xs text-slate-500">
          Pay the whole amount in one go instead of scanning the QR code and
          typing the reference yourself.
        </p>

        <button
          onClick={start}
          disabled={busy}
          className="mt-4 w-full rounded-lg bg-espresso px-4 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-clay disabled:opacity-60"
        >
          {busy && !open ? "Opening..." : `Pay ₹${money(amount)}`}
        </button>
      </div>

      <RazorpayCheckoutModal
        open={open && !!session}
        onClose={() => {
          setOpen(false);
          setSession(null);
        }}
        merchant={merchant}
        amountPaise={session?.amount}
        gatewayOrderId={session?.orderId}
        busy={busy}
        onPay={pay}
      />
    </>
  );
};

export default RazorpayPanel;
