import { useState } from "react";
import {
  Building2,
  CreditCard,
  FlaskConical,
  Loader2,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";
import ModalShell from "./ModalShell";

/**
 * The checkout window, standing in for Razorpay's.
 *
 * The real one is an iframe served from checkout.razorpay.com and opened by
 * `new window.Razorpay(options).open()`. This is a local imitation of it, with
 * the same shape: the merchant and the amount at the top, a method down the
 * side, a form, and a handler payload at the end.
 *
 * IT IS AN IMITATION AND IT SAYS SO, twice, in the banner and on the button.
 * That is not decoration. A convincing fake payment screen is the one thing in
 * this repository that could actually mislead somebody into thinking money had
 * moved, so the test badge is not dismissible and the amount line repeats it.
 *
 * NOTHING TYPED HERE IS SENT ANYWHERE. The card and UPI fields are not read,
 * not validated and not posted: the server mints the outcome on its own. They
 * exist so the screen is the right size and shape to judge, and so the flow
 * has the number of taps it will really have. Do not wire them up. When the
 * real gateway goes in, this whole file is deleted rather than extended,
 * because Razorpay collects those details inside its own iframe for the very
 * good reason that they must never touch our code.
 */

const METHODS = [
  { key: "card", label: "Card", icon: CreditCard, hint: "Credit or debit" },
  { key: "upi", label: "UPI", icon: Smartphone, hint: "GPay, PhonePe, Paytm" },
  { key: "netbanking", label: "Netbanking", icon: Building2, hint: "All major banks" },
  { key: "wallet", label: "Wallet", icon: Wallet, hint: "Paytm, Mobikwik" },
];

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const RazorpayCheckoutModal = ({
  open,
  onClose,
  merchant,
  amountPaise,
  gatewayOrderId,
  busy,
  onPay,
}) => {
  const [method, setMethod] = useState("card");
  // Held only so the inputs are controlled. Never read, never sent.
  const [scratch, setScratch] = useState({});

  if (!open) return null;

  const field = (name, placeholder, extra = "") => (
    <input
      value={scratch[name] || ""}
      onChange={(e) => setScratch({ ...scratch, [name]: e.target.value })}
      placeholder={placeholder}
      aria-label={placeholder}
      className={`rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay ${extra}`}
    />
  );

  return (
    <ModalShell onClose={busy ? () => {} : onClose} maxWidth="max-w-sm">
      {/* Header, the way the real one carries the merchant and the amount */}
      <div className="bg-espresso px-5 py-4 text-cream">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{merchant || "Wholesaler"}</p>
            <p className="mt-0.5 text-2xl font-black">
              ₹{money((amountPaise || 0) / 100)}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="-mr-1 rounded-lg p-1.5 text-cream/60 transition-colors hover:bg-white/10 hover:text-cream disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 truncate font-mono text-[10px] text-cream/50">
          {gatewayOrderId}
        </p>
      </div>

      {/* Not dismissible, and above the fold. See the note at the top. */}
      <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2.5">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-[11px] font-semibold leading-snug text-amber-900">
          Test mode. No gateway is connected and no money will move. What you
          type below is not sent anywhere.
        </p>
      </div>

      <div className="p-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Pay using
        </p>
        <div className="grid grid-cols-2 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMethod(m.key)}
              disabled={busy}
              className={`flex items-start gap-2 rounded-xl border p-3 text-left transition-colors disabled:opacity-60 ${
                method === m.key
                  ? "border-clay bg-clay/5"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <m.icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  method === m.key ? "text-clay" : "text-slate-400"
                }`}
              />
              <span className="min-w-0">
                <span className="block text-xs font-bold text-espresso">
                  {m.label}
                </span>
                <span className="block truncate text-[10px] text-slate-500">
                  {m.hint}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-2">
          {method === "card" && (
            <>
              {field("number", "Card number")}
              <div className="grid grid-cols-2 gap-2">
                {field("expiry", "MM / YY")}
                {field("cvv", "CVV")}
              </div>
              {field("name", "Name on card")}
            </>
          )}
          {method === "upi" && field("vpa", "yourname@upi")}
          {method === "netbanking" && (
            <select
              value={scratch.bank || ""}
              onChange={(e) => setScratch({ ...scratch, bank: e.target.value })}
              aria-label="Bank"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-clay"
            >
              <option value="">Choose your bank</option>
              <option>State Bank of India</option>
              <option>HDFC Bank</option>
              <option>ICICI Bank</option>
              <option>Axis Bank</option>
              <option>Bank of Baroda</option>
            </select>
          )}
          {method === "wallet" && field("wallet", "Mobile number")}
        </div>

        <button
          onClick={() => onPay("success")}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-clay px-4 py-3 text-sm font-bold text-cream transition-colors hover:bg-espresso disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Confirming..." : `Pay ₹${money((amountPaise || 0) / 100)} (test)`}
        </button>

        {/* A declined card is the commoner outcome in real life, and a
            checkout that can only succeed teaches nobody what the screen
            behind it does when it does not. */}
        <button
          onClick={() => onPay("failure")}
          disabled={busy}
          className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-600 disabled:opacity-60"
        >
          Simulate a declined payment
        </button>

        <p className="mt-3 text-center text-[10px] text-slate-400">
          The signature that comes back is checked for real, with the same
          algorithm the live gateway is checked with.
        </p>
      </div>
    </ModalShell>
  );
};

export default RazorpayCheckoutModal;
