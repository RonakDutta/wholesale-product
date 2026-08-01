import React from "react";
import { Link } from "react-router-dom";
import { Eye, Download, CreditCard, Send, Bell, ArrowUpDown, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import InvoiceStatusBadge from "./InvoiceStatusBadge";

export default function InvoiceTable({
  invoices = [],
  pagination,
  onPageChange,
  onSort,
  sortBy,
  sortOrder,
  onRecordPayment,
  onSendEmail,
  onSendReminder,
}) {
  const getSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return <ArrowUpDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              <th
                className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => onSort("invoice_number")}
              >
                <div className="flex items-center gap-1.5">
                  Invoice # {getSortIcon("invoice_number")}
                </div>
              </th>
              <th
                className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => onSort("issue_date")}
              >
                <div className="flex items-center gap-1.5">
                  Issue Date {getSortIcon("issue_date")}
                </div>
              </th>
              <th className="py-3.5 px-4">Party (Buyer / Supplier)</th>
              <th
                className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
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
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-slate-600 dark:text-slate-300">No invoices found</p>
                  <p className="text-xs text-slate-400 mt-1">Adjust search parameters or create a new invoice.</p>
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => {
                const isPaid = (invoice.payment_status || "").toLowerCase() === "paid";
                return (
                  <tr
                    key={invoice.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Invoice Number */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <Link
                        to={`/dashboard/invoices/${invoice.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString("en-IN") : "N/A"}
                    </td>

                    {/* Party */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {invoice.buyer_name || invoice.supplier_name || "Merchant"}
                      </div>
                      {(invoice.buyer_gstin || invoice.supplier_gstin) && (
                        <div className="text-xs text-slate-400">
                          GSTIN: {invoice.buyer_gstin || invoice.supplier_gstin}
                        </div>
                      )}
                    </td>

                    {/* Grand Total */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      ₹{Number(invoice.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Invoice Status */}
                    <td className="py-3.5 px-4 text-center">
                      <InvoiceStatusBadge status={invoice.invoice_status} type="invoice" />
                    </td>

                    {/* Payment Status */}
                    <td className="py-3.5 px-4 text-center">
                      <InvoiceStatusBadge status={invoice.payment_status} type="payment" />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details */}
                        <Link
                          to={`/dashboard/invoices/${invoice.id}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 dark:text-slate-400 transition-colors"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {/* PDF Stream Download */}
                        <a
                          href={`/api/invoices/${invoice.id}/pdf?token=${localStorage.getItem("token") || ""}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 dark:text-slate-400 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>

                        {/* Record Payment */}
                        {!isPaid && onRecordPayment && (
                          <button
                            onClick={() => onRecordPayment(invoice)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 dark:text-slate-400 transition-colors"
                            title="Record Payment"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}

                        {/* Send Email */}
                        {onSendEmail && (
                          <button
                            onClick={() => onSendEmail(invoice.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 dark:text-slate-400 transition-colors"
                            title="Send Invoice Email"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}

                        {/* Send Reminder */}
                        {!isPaid && onSendReminder && (
                          <button
                            onClick={() => onSendReminder(invoice.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 dark:text-slate-400 transition-colors"
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
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-900 dark:text-white">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-semibold text-slate-900 dark:text-white">{pagination.total}</span> invoices
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold text-slate-700 dark:text-slate-200">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
