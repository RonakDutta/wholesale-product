import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Send, Bell, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import axios from "../../utils/axios";
import { downloadFile } from "../../utils/download";
import InvoiceStatusBadge from "../../components/invoice/InvoiceStatusBadge";
import PaymentHistory from "../../components/invoice/PaymentHistory";
import InvoiceTimeline from "../../components/invoice/InvoiceTimeline";
import InvoicePreview from "../../components/invoice/InvoicePreview";

export default function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const fetchInvoiceDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`/api/invoices/${id}`);
      if (res.data.success) {
        setInvoice(res.data.invoice);
      }
    } catch (err) {
      console.error("Error loading invoice details:", err);
      setError(
        err.response?.data?.message || "Invoice not found or access denied.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      await fetchInvoiceDetails();
    })();
  }, [id, fetchInvoiceDetails]);

  const handleRecordPayment = async (paymentPayload) => {
    try {
      const res = await axios.post(
        `/api/invoices/${id}/payment`,
        paymentPayload,
      );
      if (res.data.success) {
        toast.success("Payment recorded");
        fetchInvoiceDetails();
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast.error(err.response?.data?.message || "Failed to record payment");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      await downloadFile(
        `/api/invoices/${id}/pdf`,
        `${invoice?.invoice_number || "Invoice"}.pdf`,
      );
    } catch (err) {
      console.error("Download PDF error:", err);
      toast.error("Could not download the invoice PDF");
    }
  };

  const handleSendEmail = async () => {
    try {
      const res = await axios.post(`/api/invoices/${id}/send`);
      if (res.data.success) {
        toast.success(
          res.data.message ||
            `Invoice sent to ${invoice?.buyer_email || "the buyer"}`,
        );
        fetchInvoiceDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send email");
    }
  };

  const handleSendReminder = async () => {
    try {
      const res = await axios.post(`/api/invoices/${id}/reminder`);
      if (res.data.success) {
        toast.success(res.data.message || "Payment reminder sent");
        fetchInvoiceDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send reminder");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <FileText className="w-12 h-12 text-slate-300 mb-3" />
        <h2 className="text-lg font-bold text-espresso">
          {error || "Invoice not found"}
        </h2>
        <button
          onClick={() => navigate("/seller/invoices")}
          className="mt-4 px-4 py-2 bg-clay text-white rounded-xl text-xs font-bold"
        >
          Back to invoices
        </button>
      </div>
    );
  }

  const items = invoice.items || [];
  const payments = invoice.payments || [];
  const logs = invoice.logs || [];
  const isPaid = (invoice.payment_status || "").toLowerCase() === "paid";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/seller/invoices")}
            className="p-2 text-slate-500 hover:text-espresso border border-slate-200 rounded-xl hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-espresso font-mono">
                {invoice.invoice_number}
              </h1>
              <InvoiceStatusBadge status={invoice.invoice_status} />
              <InvoiceStatusBadge status={invoice.payment_status} />
            </div>
            <p className="text-xs text-espresso/50 mt-0.5">
              Issued:{" "}
              {invoice.issue_date
                ? new Date(invoice.issue_date).toLocaleDateString("en-IN")
                : "N/A"}{" "}
              | Due:{" "}
              {invoice.due_date
                ? new Date(invoice.due_date).toLocaleDateString("en-IN")
                : "N/A"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPreview(true)}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-espresso/70 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-4 h-4 text-clay" /> Preview
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-espresso/70 transition-colors hover:bg-slate-100"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>

          <button
            onClick={handleSendEmail}
            className="px-3 py-2 bg-clay hover:bg-espresso text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Send className="w-4 h-4" /> Send Email
          </button>

          {!isPaid && (
            <button
              onClick={handleSendReminder}
              className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Bell className="w-4 h-4" /> Send Reminder
            </button>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Invoice Sheet */}
        <div className="lg:col-span-2 space-y-6">
          {/* Parties Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Supplier / Issuer
              </span>
              <div className="font-bold text-espresso text-sm">
                {invoice.supplier_company || invoice.supplier_name}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                GSTIN: {invoice.supplier_gstin || "N/A"}
              </p>
              <p className="text-xs text-slate-500">
                Phone: {invoice.supplier_phone || "N/A"}
              </p>
              <p className="text-xs text-slate-500">
                Email: {invoice.supplier_email || "N/A"}
              </p>
              {invoice.supplier_upi_id && (
                <p className="text-xs font-bold text-clay mt-1">
                  UPI ID: {invoice.supplier_upi_id}
                </p>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Billed Buyer
              </span>
              <div className="font-bold text-espresso text-sm">
                {invoice.buyer_company || invoice.buyer_name}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                GSTIN: {invoice.buyer_gstin || "N/A"}
              </p>
              <p className="text-xs text-slate-500">
                Phone: {invoice.buyer_phone || "N/A"}
              </p>
              <p className="text-xs text-slate-500">
                Email: {invoice.buyer_email || "N/A"}
              </p>
              {invoice.order_number && (
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Linked Order: #{invoice.order_number}
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs overflow-hidden">
            <h3 className="text-sm font-bold text-espresso mb-4">
              Itemized Product List
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-espresso/50 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">Product Name</th>
                    <th className="py-3 px-3 text-center">HSN</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-3 text-right">Unit Price</th>
                    <th className="py-3 px-3 text-center">GST %</th>
                    <th className="py-3 px-3 text-right">Tax Amount</th>
                    <th className="py-3 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-espresso/70">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-3 font-semibold text-espresso">
                        {item.product_name}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {item.hsn_code || "8504"}
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-3 text-right">
                        ₹{Number(item.unit_price).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.gst_percent}%
                      </td>
                      <td className="py-3 px-3 text-right">
                        ₹{Number(item.tax_amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-espresso">
                        ₹{Number(item.total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start pt-6 mt-4 border-t border-slate-100 gap-4 text-xs">
              <div className="text-slate-500 max-w-sm">
                <span className="font-bold text-espresso/70 block mb-1">
                  Notes:
                </span>
                <p className="text-[11px]">
                  {invoice.notes || "No custom notes."}
                </p>
              </div>

              <div className="w-full sm:w-64 space-y-2 text-right">
                <div className="flex justify-between text-espresso/60">
                  <span>Subtotal:</span>
                  <span>₹{Number(invoice.subtotal || 0).toFixed(2)}</span>
                </div>
                {Number(invoice.discount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-₹{Number(invoice.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-espresso pt-1 border-t border-slate-100">
                  <span>Taxable Amount:</span>
                  <span>₹{Number(invoice.taxable_amount || 0).toFixed(2)}</span>
                </div>
                {Number(invoice.cgst) > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>CGST:</span>
                    <span>₹{Number(invoice.cgst).toFixed(2)}</span>
                  </div>
                )}
                {Number(invoice.sgst) > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>SGST:</span>
                    <span>₹{Number(invoice.sgst).toFixed(2)}</span>
                  </div>
                )}
                {Number(invoice.igst) > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>IGST:</span>
                    <span>₹{Number(invoice.igst).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Total Tax:</span>
                  <span>₹{Number(invoice.total_tax || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-white bg-slate-900 p-3 rounded-xl mt-2">
                  <span>Grand Total:</span>
                  <span>₹{Number(invoice.grand_total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History Sub-Component */}
          <PaymentHistory
            invoice={invoice}
            payments={payments}
            onRecordPayment={handleRecordPayment}
          />
        </div>

        {/* Right Column: Activity Timeline */}
        <div>
          <InvoiceTimeline logs={logs} />
        </div>
      </div>

      {/* Modal Preview Component */}
      {showPreview && (
        <InvoicePreview
          invoice={invoice}
          onClose={() => setShowPreview(false)}
          onSendEmail={handleSendEmail}
        />
      )}
    </div>
  );
}
