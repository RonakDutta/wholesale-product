import { X, Printer, Download, Send } from "lucide-react";
import InvoiceStatusBadge from "./InvoiceStatusBadge";

export default function InvoicePreview({ invoice, onClose, onSendEmail }) {
  if (!invoice) return null;

  const isPaid = (invoice.payment_status || "").toLowerCase() === "paid";
  const items = invoice.items || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-espresso">
              Invoice Preview #{invoice.invoice_number}
            </h2>
            <InvoiceStatusBadge status={invoice.invoice_status} />
            <InvoiceStatusBadge status={invoice.payment_status} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-600 hover:text-espresso border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              title="Print Invoice"
            >
              <Printer className="w-4 h-4" />
            </button>

            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" /> PDF
            </a>

            {onSendEmail && (
              <button
                onClick={() => onSendEmail(invoice.id)}
                className="px-3 py-2 bg-clay hover:bg-espresso text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Send className="w-4 h-4" /> Email
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-espresso"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Modal Body */}
        <div className="p-8 overflow-y-auto flex-1 relative bg-white print:p-0 print:overflow-visible">
          {/* Watermark Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-10">
            <span
              className={`text-8xl font-extrabold uppercase -rotate-45 tracking-widest ${
                isPaid ? "text-emerald-600" : "text-amber-500"
              }`}
            >
              {isPaid ? "PAID" : "UNPAID"}
            </span>
          </div>

          {/* Header Bar */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-espresso uppercase">
                Tax Invoice
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
                {invoice.supplier_company ||
                  invoice.supplier_name ||
                  "Wholesale Merchant"}
              </p>
              {invoice.supplier_gstin && (
                <p className="text-xs text-slate-500">
                  GSTIN: {invoice.supplier_gstin}
                </p>
              )}
            </div>

            <div className="text-right">
              <div className="text-base font-bold text-clay font-mono">
                {invoice.invoice_number}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Date:{" "}
                {invoice.issue_date
                  ? new Date(invoice.issue_date).toLocaleDateString("en-IN")
                  : "N/A"}
              </div>
              {invoice.due_date && (
                <div className="text-xs text-slate-500">
                  Due Date:{" "}
                  {new Date(invoice.due_date).toLocaleDateString("en-IN")}
                </div>
              )}
            </div>
          </div>

          {/* Party Details Grid */}
          <div className="grid grid-cols-2 gap-6 mb-6 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                Billed From (Supplier)
              </span>
              <div className="font-bold text-espresso text-sm">
                {invoice.supplier_company || invoice.supplier_name}
              </div>
              <p className="text-espresso/60 mt-1">
                Phone: {invoice.supplier_phone || "N/A"}
              </p>
              <p className="text-espresso/60">
                Email: {invoice.supplier_email || "N/A"}
              </p>
              {invoice.supplier_upi_id && (
                <p className="text-espresso/60 font-semibold text-clay">
                  UPI ID: {invoice.supplier_upi_id}
                </p>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                Billed To (Buyer)
              </span>
              <div className="font-bold text-espresso text-sm">
                {invoice.buyer_company || invoice.buyer_name}
              </div>
              <p className="text-espresso/60 mt-1">
                GSTIN: {invoice.buyer_gstin || "N/A"}
              </p>
              <p className="text-espresso/60">
                Phone: {invoice.buyer_phone || "N/A"}
              </p>
              <p className="text-espresso/60">
                Email: {invoice.buyer_email || "N/A"}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left text-xs mb-6 border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 text-center">HSN</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-center">GST %</th>
                <th className="py-2.5 px-3 text-right">Tax</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-espresso/70">
              {items.map((item, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-slate-50/50/30" : ""}
                >
                  <td className="py-2.5 px-3 font-semibold text-espresso">
                    {item.product_name}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                    {item.hsn_code || "8504"}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold">
                    {Number(item.quantity)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    ₹{Number(item.unit_price).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {item.gst_percent}%
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    ₹{Number(item.tax_amount).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold">
                    ₹{Number(item.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Breakdown */}
          <div className="flex justify-between items-start pt-4 border-t border-slate-200 text-xs">
            <div className="max-w-xs text-slate-500 space-y-2">
              <div className="font-bold text-espresso/70 uppercase tracking-wider text-[10px]">
                Terms & Conditions
              </div>
              <p className="text-[11px] whitespace-pre-line">
                {invoice.terms_conditions || "Standard B2B terms apply."}
              </p>
            </div>

            <div className="w-64 space-y-1.5 text-right font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal:</span>
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
              <div className="flex justify-between text-base font-black text-espresso bg-slate-900 text-white p-2.5 rounded-xl mt-2">
                <span>GRAND TOTAL:</span>
                <span>₹{Number(invoice.grand_total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
