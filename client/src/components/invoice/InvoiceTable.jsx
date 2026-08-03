import { Link } from "react-router-dom";
import {
  Eye,
  Download,
  CreditCard,
  Send,
  Bell,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import InvoiceStatusBadge from "./InvoiceStatusBadge";
import { downloadFile } from "../../utils/download";

export default function InvoiceTable({
  invoices = [],
  pagination,
  onPageChange,
  onSort,
  sortBy,
  onRecordPayment,
  onSendEmail,
  onSendReminder,
}) {
  const getSortIcon = (field) => {
    if (sortBy !== field)
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return <ArrowUpDown className="w-3.5 h-3.5 text-clay" />;
  };

  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      await downloadFile(
        `/api/invoices/${invoiceId}/pdf`,
        `${invoiceNumber || "Invoice"}.pdf`,
      );
    } catch (err) {
      console.error("Download PDF error:", err);
      toast.error("Could not download the invoice PDF");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold text-espresso/50">
              <th
                className="py-3.5 px-4 cursor-pointer hover:text-espresso transition-colors"
                onClick={() => onSort("invoice_number")}
              >
                <div className="flex items-center gap-1.5">
                  Invoice # {getSortIcon("invoice_number")}
                </div>
              </th>
              <th
                className="py-3.5 px-4 cursor-pointer hover:text-espresso transition-colors"
                onClick={() => onSort("issue_date")}
              >
                <div className="flex items-center gap-1.5">
                  Issue Date {getSortIcon("issue_date")}
                </div>
              </th>
              <th className="py-3.5 px-4">Party (Buyer / Supplier)</th>
              <th
                className="py-3.5 px-4 text-right cursor-pointer hover:text-espresso transition-colors"
                onClick={() => onSort("grand_total")}
              >
                <div className="flex items-center justify-end gap-1.5">
                  Grand Total {getSortIcon("grand_total")}
                </div>
              </th>
              <th className="py-3.5 px-4 text-center">Invoice Status</th>
              <th className="py-3.5 px-4 text-center">Payment Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-espresso/70">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-espresso/40">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-espresso/60">
                    No invoices found
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Adjust search parameters or create a new invoice.
                  </p>
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => {
                const isPaid =
                  (invoice.payment_status || "").toLowerCase() === "paid";
                return (
                  <tr
                    key={invoice.id}
                    className="hover:bg-cream/40 transition-colors"
                  >
                    {/* Invoice Number */}
                    <td className="py-3.5 px-4 font-bold text-espresso">
                      <Link
                        to={`/seller/invoices/${invoice.id}`}
                        className="text-clay hover:underline flex items-center gap-1.5"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-xs font-medium text-espresso/50 whitespace-nowrap">
                      {invoice.issue_date
                        ? new Date(invoice.issue_date).toLocaleDateString(
                            "en-IN",
                          )
                        : "N/A"}
                    </td>

                    {/* Party */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-espresso">
                        {invoice.buyer_name ||
                          invoice.supplier_name ||
                          "Merchant"}
                      </div>
                      {(invoice.buyer_gstin || invoice.supplier_gstin) && (
                        <div className="text-xs text-slate-400">
                          GSTIN: {invoice.buyer_gstin || invoice.supplier_gstin}
                        </div>
                      )}
                    </td>

                    {/* Grand Total */}
                    <td className="py-3.5 px-4 text-right font-bold text-espresso whitespace-nowrap">
                      ₹
                      {Number(invoice.grand_total || 0).toLocaleString(
                        "en-IN",
                        { minimumFractionDigits: 2 },
                      )}
                    </td>

                    {/* Invoice Status */}
                    <td className="py-3.5 px-4 text-center">
                      <InvoiceStatusBadge
                        status={invoice.invoice_status}
                        type="invoice"
                      />
                    </td>

                    {/* Payment Status */}
                    <td className="py-3.5 px-4 text-center">
                      <InvoiceStatusBadge
                        status={invoice.payment_status}
                        type="payment"
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details */}
                        <Link
                          to={`/seller/invoices/${invoice.id}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-clay hover:bg-clay/10 transition-colors"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {/* PDF Stream Download */}
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadPDF(
                              invoice.id,
                              invoice.invoice_number,
                            )
                          }
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Record Payment */}
                        {!isPaid && onRecordPayment && (
                          <button
                            type="button"
                            onClick={() => onRecordPayment(invoice)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Record Payment"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}

                        {/* Send Email */}
                        {onSendEmail && (
                          <button
                            type="button"
                            onClick={() => onSendEmail(invoice.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sage hover:bg-sage/10 transition-colors cursor-pointer"
                            title="Send Invoice Email"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}

                        {/* Send Reminder */}
                        {!isPaid && onSendReminder && (
                          <button
                            type="button"
                            onClick={() => onSendReminder(invoice.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Send Payment Reminder"
                          >
                            <Bell className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-espresso/50">
          <div>
            Showing{" "}
            <span className="font-semibold text-espresso">
              {(pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{""}
            <span className="font-semibold text-espresso">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>
            {""}
            of{" "}
            <span className="font-semibold text-espresso">
              {pagination.total}
            </span>{" "}
            invoices
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold text-espresso/70">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
