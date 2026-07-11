import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, QrCode, IndianRupee, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
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

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        const response = await api.get(`/api/orders/${orderId}/payment-details`);
        setPaymentDetails(response.data);
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
        paymentStatus: "paid"
      });

      if (response.data.success) {
        toast.success("Payment confirmed successfully!");
        navigate("/order-success");
      }
    } catch (err) {
      console.error("Error updating payment status:", err);
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
        toast.info("Payment cancelled");
        navigate("/");
      }
    } catch (err) {
      console.error("Error updating payment status:", err);
      toast.error("Failed to cancel payment");
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

  const upiUrl = generateUPIUrl();

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Payment</h1>
            <p className="text-sm text-slate-500">Complete your payment to confirm order</p>
          </div>
        </div>

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
                    I have completed payment
                  </>
                )}
              </button>

              <button
                onClick={handlePaymentFailed}
                disabled={updating}
                className="w-full bg-slate-100 text-slate-700 text-sm font-semibold py-3 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Cancel Payment
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Your order will be confirmed after successful payment verification
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;