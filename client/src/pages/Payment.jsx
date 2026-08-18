import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, QrCode, IndianRupee, CheckCircle, AlertCircle, Loader2, Ban } from "lucide-react";
import { QRCodeSVG } from "qrcode.react"; // Standardized named export to resolve Vite bundler error
import { toast } from "sonner";
import api from "../utils/axios";

const Payment = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [error, setError] = useState(null);
  // null while loading, then true/false from the server's lifecycle check.
  const [payable, setPayable] = useState(null);
  // Tracks whether the payment reached a final state, so leaving the screen
  // after paying does not also mark the order failed.
  const resolvedRef = useRef(false);
  const armedRef = useRef(false);
  const orderIdRef = useRef(orderId);
  orderIdRef.current = orderId;

  // Id of the payment session opened on load. Sent back on confirm so the
  // amount recorded is the one the QR code showed.
  const [paymentId, setPaymentId] = useState(null);
  const [upiReference, setUpiReference] = useState("");

  const markPaymentFailed = (remarks) =>
    api
      .put(`/api/orders/${orderIdRef.current}/payment-status`, {
        markFailed: true,
        remarks,
      })
      .catch(() => {});

  // Abandoning the QR screen (browser back, closing the view) fails the order.
  // Arming is delayed so React's development double-mount cannot cancel an
  // order the moment the page opens, and it never arms for an order that is
  // not awaiting payment: there is nothing left to abandon.
  useEffect(() => {
    if (payable !== true) return undefined;

    const timer = setTimeout(() => {
      armedRef.current = true;
    }, 1500);

    return () => {
      clearTimeout(timer);
      if (!armedRef.current || resolvedRef.current) return;
      markPaymentFailed("Buyer left the payment screen before paying");
    };
  }, [payable]);

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        const response = await api.get(`/api/orders/${orderId}/payment-details`);
        setPaymentDetails(response.data);
        // The server decides this from the order's state and balance, so a
        // cancelled or fully paid order never renders a live QR code.
        const canPay = response.data.payable !== false;
        setPayable(canPay);

        // Open a session so the server, not the browser, fixes the amount.
        // A failure here is not fatal: confirming without a session still
        // charges whatever the order actually owes.
        if (canPay) {
          try {
            const session = await api.post(`/api/orders/${orderId}/payment`);
            if (session.data?.success) setPaymentId(session.data.paymentId);
          } catch (sessionErr) {
            console.warn("Could not open a payment session:", sessionErr.message);
          }
        }
      } catch (err) {
        console.error("Error fetching payment details:", err);
        setError(err.response?.data?.message || "Failed to load payment details");
        toast.error("Failed to load payment details");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [orderId]);

  const generateUPIUrl = () => {
    if (!paymentDetails || !paymentDetails.supplierUpiId) return "";
    
    const { supplierUpiId, supplierName, amount } = paymentDetails;
    
    // UPI URL format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR
    const params = new URLSearchParams({
      pa: supplierUpiId,
      pn: supplierName || "Wholesale Merchant",
      am: amount.toString(),
      cu: "INR"
    });
    
    return `upi://pay?${params.toString()}`;
  };

  const handlePaymentComplete = async () => {
    setUpdating(true);
    try {
      const response = await api.put(`/api/orders/${orderId}/payment-status`, {
        paymentStatus: "paid",
        paymentId,
        upiTransactionReference: upiReference.trim() || undefined,
      });

      if (response.data.success) {
        resolvedRef.current = true;
        toast.success(
          response.data.fullyPaid
            ? "Payment confirmed. Your order is fully paid."
            : `Payment recorded. ₹${Number(response.data.remainingAmount).toLocaleString("en-IN")} still due.`,
        );
        // replace, so the browser back button cannot return to a payment
        // screen for an order that has already been settled.
        navigate("/order-success", { replace: true });
      }
    } catch (err) {
      console.error("Error updating payment status:", err);
      // 409 means the order moved on while this screen was open, so stop
      // offering to pay it rather than letting the buyer try again.
      if (err.response?.status === 409) {
        resolvedRef.current = true;
        setPayable(false);
        setPaymentDetails((prev) =>
          prev
            ? { ...prev, notPayableReason: err.response.data?.message }
            : prev,
        );
      }
      toast.error(err.response?.data?.message || "Failed to confirm payment");
    } finally {
      setUpdating(false);
    }
  };

  const handlePaymentFailed = async () => {
    setUpdating(true);
    try {
      const response = await api.put(`/api/orders/${orderId}/payment-status`, {
        paymentStatus: "failed"
      });

      if (response.data.success) {
        resolvedRef.current = true;
        toast.info("Payment cancelled");
        // replace, so browser back does not land on a live-looking QR code
        // for an order that has just been cancelled.
        navigate("/orders", { replace: true });
      }
    } catch (err) {
      console.error("Error updating payment status:", err);
      toast.error(err.response?.data?.message || "Failed to cancel payment");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-clay animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !paymentDetails) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Payment Error</h2>
          <p className="text-slate-600 mb-4">{error || "Unable to load payment details"}</p>
          <button
            onClick={() => navigate("/")}
            className="text-clay font-semibold hover:underline cursor-pointer"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Reached by browser history after cancelling or paying, or by opening an
  // old link. No QR code and no pay button: the order cannot take a payment,
  // and showing a live-looking one invites the buyer to send money that can
  // never be matched to it.
  if (payable === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Ban className="mx-auto mb-4 h-14 w-14 text-slate-300" />
          <h2 className="mb-2 text-xl font-bold text-slate-800">
            Payment closed
          </h2>
          <p className="mb-1 text-slate-600">
            {paymentDetails.notPayableReason ||
              "This order is no longer awaiting payment."}
          </p>
          {paymentDetails.orderNumber && (
            <p className="mb-6 font-mono text-xs text-slate-400">
              {paymentDetails.orderNumber}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              to={`/orders/${orderId}`}
              className="rounded-lg bg-clay px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-espresso"
            >
              View this order
            </Link>
            <Link
              to="/"
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Keep shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const upiUrl = generateUPIUrl();
  const onInstalments = paymentDetails.paymentPlan === "installment_50_50";
  const partPaid = Number(paymentDetails.amountPaid || 0) > 0;
  const money = (value) =>
    Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dueAfterThisPayment = Math.max(
    Number(paymentDetails.remainingAmount || 0) - Number(paymentDetails.paymentAmount || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={async () => {
              // Walking away from a later instalment must not cancel an order
              // the seller may already be preparing, so only an untouched
              // order is failed on the way out.
              resolvedRef.current = true;
              if (!partPaid) {
                await markPaymentFailed("Buyer went back from the payment screen");
                toast.info("Payment cancelled");
              }
              navigate("/orders", { replace: true });
            }}
            aria-label={partPaid ? "Back to orders" : "Cancel payment and go back"}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {onInstalments
                ? `Instalment ${paymentDetails.installmentNumber} of 2`
                : "Payment"}
            </h1>
            <p className="text-sm text-slate-500">
              {onInstalments
                ? "Pay 50% now and the balance later."
                : "Complete your payment to confirm order"}
            </p>
          </div>
        </div>

        {/* Instalment progress */}
        {onInstalments && (
          <div className="mb-6 rounded-xl border border-clay/20 bg-clay/5 p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Order total
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  ₹{money(paymentDetails.totalAmount)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Already paid
                </p>
                <p className="mt-1 text-lg font-bold text-emerald-600">
                  ₹{money(paymentDetails.amountPaid)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Due now
                </p>
                <p className="mt-1 text-lg font-black text-clay">
                  ₹{money(paymentDetails.paymentAmount)}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${Math.min(100, Math.round((Number(paymentDetails.amountPaid || 0) / Math.max(Number(paymentDetails.totalAmount || 1), 1)) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Code Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <QrCode className="w-5 h-5 text-clay" />
              <h2 className="text-lg font-bold text-slate-900">Scan QR Code to Pay</h2>
            </div>

            <div className="flex flex-col items-center">
              <div className="bg-white p-6 rounded-xl border-2 border-slate-200 mb-6">
                {upiUrl && paymentDetails.supplierUpiId ? (
                  <QRCodeSVG
                    value={upiUrl}
                    size={200}
                    includeMargin={true}
                    className="rounded-lg"
                  />
                ) : (
                  <div className="w-48 h-48 bg-slate-100 rounded-lg flex flex-col items-center justify-center p-4 text-center gap-2 border border-dashed">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                    <p className="text-xs text-rose-600 font-medium">Supplier has not configured a UPI ID yet.</p>
                  </div>
                )}
              </div>

              <div className="text-center space-y-2 mb-6">
                <div className="flex items-center justify-center gap-2">
                  <IndianRupee className="w-5 h-5 text-clay" />
                  <span className="text-3xl font-bold text-clay">
                    {paymentDetails.amount.toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="text-sm text-slate-600">Pay To: {paymentDetails.supplierName}</p>
                <p className="text-xs text-slate-500 font-mono">UPI ID: {paymentDetails.supplierUpiId || "Not Provided"}</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 w-full">
                <p className="text-sm text-amber-800">
                  <strong>Instructions:</strong>
                </p>
                <ol className="text-xs text-amber-700 mt-2 space-y-1 list-decimal list-inside">
                  <li>Open any UPI app (Google Pay, PhonePe, Paytm)</li>
                  <li>Scan the QR code above</li>
                  <li>Confirm the payment amount</li>
                  <li>Complete the payment</li>
                  <li>Click "I have completed payment" below</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Order Details</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Product</span>
                  <span className="text-sm font-semibold text-slate-900">{paymentDetails.productName || "Wholesale Package"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Supplier</span>
                  <span className="text-sm font-semibold text-slate-900">{paymentDetails.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Order ID</span>
                  <span className="text-sm font-mono text-slate-900">#{orderId}</span>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-slate-600">Total Amount</span>
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-4 h-4 text-clay" />
                      <span className="text-lg font-bold text-clay">
                        {paymentDetails.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Delivery Address</h3>
              
              {paymentDetails.deliveryAddress && (
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-slate-900">
                    {paymentDetails.deliveryAddress.name}
                  </p>
                  <p className="text-slate-600">
                    {paymentDetails.deliveryAddress.house}, {paymentDetails.deliveryAddress.street}
                  </p>
                  <p className="text-slate-600">
                    {paymentDetails.deliveryAddress.area}, {paymentDetails.deliveryAddress.city}
                  </p>
                  <p className="text-slate-600">
                    {paymentDetails.deliveryAddress.state}, {paymentDetails.deliveryAddress.country} - {paymentDetails.deliveryAddress.pincode}
                  </p>
                  <p className="text-slate-600">
                    Phone: {paymentDetails.deliveryAddress.phone}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="upi-ref"
                  className="block text-xs font-semibold text-slate-600 mb-1.5"
                >
                  UPI reference number{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="upi-ref"
                  type="text"
                  value={upiReference}
                  onChange={(e) => setUpiReference(e.target.value)}
                  placeholder="From your UPI app, e.g. 412345678901"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-clay"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Helps the seller match your payment if there is a query.
                </p>
              </div>

              <button
                onClick={handlePaymentComplete}
                disabled={updating || !paymentDetails.supplierUpiId}
                className="w-full bg-emerald-600 text-white text-sm font-bold py-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {onInstalments
                      ? `I have paid ₹${money(paymentDetails.paymentAmount)}`
                      : "I have completed payment"}
                  </>
                )}
              </button>

              {/* Cancelling kills the order and returns its stock, which is
                  only right while nothing has been paid. Once a deposit is in,
                  the way out is back to the order, not a cancellation. */}
              {partPaid ? (
                <button
                  onClick={() => navigate(`/orders/${orderId}`, { replace: true })}
                  disabled={updating}
                  className="w-full bg-slate-100 text-slate-700 text-sm font-semibold py-3 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Pay later
                </button>
              ) : (
                <button
                  onClick={handlePaymentFailed}
                  disabled={updating}
                  className="w-full bg-slate-100 text-slate-700 text-sm font-semibold py-3 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Cancel Payment
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 text-center">
              {onInstalments && paymentDetails.installmentNumber === 1
                ? `₹${money(dueAfterThisPayment)} will remain due. Your seller can start preparing the order once this deposit is in.`
                : "Your order will be confirmed after successful payment verification"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;