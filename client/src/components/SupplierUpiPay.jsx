import { useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone } from "lucide-react";
import { rupees } from "../utils/money";

/**
 * Pay a supplier by UPI, without leaving the book to type his VPA out again.
 *
 * ---------------------------------------------------------------------------
 * THE PRODUCT NEVER TOUCHES THIS MONEY
 * ---------------------------------------------------------------------------
 * This builds a UPI intent and hands it to the wholesaler's own UPI app. He
 * pays his supplier directly, bank to bank. No gateway, no platform account,
 * no custody, nothing held in the middle. What it saves him is the part that
 * goes wrong: reading a VPA off an old bill, retyping the amount, then
 * retyping the amount a second time into the book.
 *
 * It follows that the payment is SELF DECLARED, exactly like the buyer side
 * QR. Nothing here can confirm the money moved, and the screen says so rather
 * than implying a confirmation that would need a bank feed to be true. The
 * reference box is for the UTR his app gives him, so a bank statement can be
 * reconciled against the book later by a person.
 *
 * ---------------------------------------------------------------------------
 * WHY THE LINK IS BUILT HERE AND NOT ON THE SERVER
 * ---------------------------------------------------------------------------
 * Everywhere a BUYER pays, the amount is decided by the server and the browser
 * is never allowed to name one, because it is somebody else's money and a
 * browser that can name a figure is a discount coupon.
 *
 * This is the opposite case. It is the wholesaler's own money leaving his own
 * account to his own supplier, and part payment is ordinary trade: he owes
 * four lakh and pays sixty thousand today. The outstanding balance is only a
 * sensible default, not a rule, so there is nothing for a server to enforce
 * and a round trip on every keystroke would buy nothing.
 */
const SupplierUpiPay = ({ supplier, owed, onRecord, busy }) => {
  const suggested = owed > 0 ? String(Number(owed.toFixed(2))) : "";
  const [amount, setAmount] = useState(suggested);
  const [reference, setReference] = useState("");
  const [opened, setOpened] = useState(false);

  const vpa = supplier?.upi_id;
  const value = Number(amount);
  const payable = Number.isFinite(value) && value > 0;

  // Nothing to pay to. Said as a next step rather than an error, because most
  // suppliers in an existing book will not have a UPI ID until somebody adds
  // one.
  if (!vpa) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-espresso">Pay by UPI</h3>
        <p className="mt-1 text-sm text-slate-500">
          Add {supplier?.name || "this supplier"}&apos;s UPI ID and you can pay
          him from here, with the amount already filled in.
        </p>
        <Link
          to="/seller/suppliers"
          className="mt-3 inline-block rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-espresso transition-colors hover:border-clay hover:text-clay"
        >
          Add his UPI ID
        </Link>
      </div>
    );
  }

  /**
   * The UPI intent.
   *
   * `tn` is the note the supplier sees against the payment in his own app,
   * which is what makes it recognisable to him later. Everything is encoded
   * by URLSearchParams: a firm name with an ampersand in it would otherwise
   * cut the link in half.
   */
  const link = `upi://pay?${new URLSearchParams({
    pa: vpa,
    pn: supplier.business_name || supplier.name || "Supplier",
    am: payable ? value.toFixed(2) : "",
    cu: "INR",
    tn: `Payment from ${supplier.wholesaler_name || "your customer"}`.slice(0, 50),
  })
    .toString()
    // URLSearchParams writes a space as "+", which is only a space in form
    // encoding. UPI apps vary in how carefully they decode, and the ones that
    // do it naively show the payee as "Arvind+Mills". %20 is read correctly
    // by all of them, and this is the name he checks before pressing pay.
    .replace(/\+/g, "%20")}`;

  const record = () => {
    onRecord({
      amount: value,
      reference: reference.trim() || undefined,
      method: "upi",
    });
    setReference("");
    setOpened(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-espresso">Pay by UPI</h3>
      <p className="mt-0.5 text-xs text-slate-500">
        Straight to {vpa} from your own UPI app. Nothing goes through this
        product.
      </p>

      <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <div>
            <label
              htmlFor="upi-amount"
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              How much
            </label>
            <input
              id="upi-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-clay"
            />
            {owed > 0 && (
              <p className="mt-1 text-[11px] text-slate-400">
                {rupees(owed)} outstanding. Pay less if that is what you are
                paying today.
              </p>
            )}
          </div>

          {/* On a phone this opens his UPI app. On a laptop nothing will
              happen, which is what the QR beside it is for, so the button
              does not pretend otherwise. */}
          <a
            href={payable ? link : undefined}
            onClick={() => payable && setOpened(true)}
            aria-disabled={!payable}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
              payable
                ? "bg-clay text-cream hover:bg-espresso"
                : "pointer-events-none bg-slate-100 text-slate-400"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            Open my UPI app
          </a>
          <p className="text-[11px] text-slate-400">
            On a computer, scan the code with your phone instead.
          </p>
        </div>

        {payable && (
          <div className="flex flex-col items-center justify-start rounded-xl border border-slate-200 bg-white p-3">
            <QRCodeSVG value={link} size={132} />
            <p className="mt-2 text-center text-[11px] font-bold text-espresso">
              {rupees(value)}
            </p>
          </div>
        )}
      </div>

      {/* Recording it is a separate act from paying it, and deliberately so.
          The product cannot tell whether the money moved, so it asks. */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-xs font-bold text-espresso">
          {opened ? "Did it go through?" : "Already paid him?"}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          This records it in your book. Nothing here checks with the bank, so
          only say yes once your UPI app has.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label
              htmlFor="upi-reference"
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              UPI reference number
            </label>
            <input
              id="upi-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="12 digits, from your UPI app"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-clay"
            />
          </div>
          <button
            type="button"
            onClick={record}
            disabled={!payable || busy}
            className="rounded-lg bg-espresso px-4 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-clay disabled:opacity-50"
          >
            {busy ? "Recording..." : `Record ${payable ? rupees(value) : "payment"}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierUpiPay;
