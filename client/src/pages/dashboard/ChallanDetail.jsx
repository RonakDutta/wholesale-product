import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileText, Truck } from "lucide-react";
import api from "../../utils/axios";
import { downloadFile } from "../../utils/download";
import { toast } from "sonner";
import { rupees, trimmed, dateLabel } from "../../utils/money";

/**
 * One delivery challan in full.
 *
 * The list could only be downloaded from, so the only way to read what was
 * actually sent out was to open a PDF. That is a poor way to answer "what did
 * I send Ramesh on the 4th", and it is worse on a phone.
 *
 * Everything here is FROZEN on the document. The recipient's name, his GSTIN,
 * the quantities and the amount that had been received are all stored on the
 * challan row rather than joined from the customer or the sale, because this
 * is what the paper said on the day the goods were handed over. If the
 * customer later corrects his address, the challan he signed for does not
 * change. So nothing on this page is looked up live, and nothing is
 * recomputed: it is read back exactly as issued.
 *
 * A challan is NOT a tax invoice and carries no GST. The page says so, because
 * a wholesaler seeing a total and an HSN column could reasonably assume it is
 * a bill, and sending one instead of an invoice is his problem, not ours.
 */
const ChallanDetail = () => {
  const { challanId } = useParams();
  const navigate = useNavigate();
  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { data } = await api.get(`/api/challans/${challanId}`);
        if (alive) setChallan(data);
      } catch (error) {
        if (alive) {
          toast.error(
            error.response?.status === 404
              ? "That challan is not in your book."
              : "Could not load this challan.",
          );
        }
      }
      if (alive) setLoading(false);
    };
    load();
    return () => {
      alive = false;
    };
  }, [challanId]);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadFile(
        `/api/challans/${challanId}/pdf`,
        `${challan?.challan_number || "challan"}.pdf`,
      );
    } catch (err) {
      toast.error(err.message || "Could not download the challan");
    }
    setDownloading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
      </div>
    );
  }

  if (!challan) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <Truck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="font-semibold text-espresso">Could not load this challan</p>
        <Link
          to="/seller/challans"
          className="mt-2 inline-block text-sm font-bold text-clay"
        >
          Back to challans
        </Link>
      </div>
    );
  }

  const items = challan.items || [];
  const total = Number(challan.total_value || 0);
  const paid = Number(challan.amount_paid || 0);
  const due = Math.max(total - paid, 0);
  const billed = Boolean(challan.invoice_id);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <button
          onClick={() => navigate("/seller/challans")}
          className="mb-3 inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-clay"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All challans
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-mono text-xl font-black text-espresso sm:text-2xl">
            {challan.challan_number}
          </h2>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
              billed
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {billed ? "Billed" : "Not billed"}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Sent out {dateLabel(challan.issue_date)}
            {challan.sale_number ? ` · sale ${challan.sale_number}` : ""}
            {challan.order_number ? ` · order ${challan.order_number}` : ""}
          </p>
          <button
            onClick={download}
            disabled={downloading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-espresso transition-colors hover:border-clay hover:text-clay disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? "Preparing..." : "PDF"}
          </button>
        </div>
      </div>

      {/* Said plainly rather than in small print. A page with a total and an
          HSN column looks like a bill, and this one is not. */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs font-bold text-amber-900">
          This is a delivery challan, not a tax invoice.
        </p>
        <p className="mt-0.5 text-xs text-amber-800">
          It carries no GST and your customer cannot claim input credit on it.
          {billed
            ? " The tax invoice for these goods has since been raised."
            : " Raise the tax invoice once the money is in."}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Sent to. Frozen on the document, not joined from the customer. */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Sent to
          </h3>
          <p className="mt-2 font-bold text-espresso">
            {challan.recipient_name || "Customer"}
          </p>
          {challan.recipient_address && (
            <p className="mt-1 text-sm text-slate-600">
              {challan.recipient_address}
            </p>
          )}
          {challan.recipient_city && (
            <p className="text-sm text-slate-600">{challan.recipient_city}</p>
          )}
          {challan.recipient_phone && (
            <p className="mt-1 text-sm text-slate-500">
              {challan.recipient_phone}
            </p>
          )}
          {challan.recipient_gstin && (
            <p className="mt-1 font-mono text-xs text-slate-500">
              GSTIN {challan.recipient_gstin}
            </p>
          )}
          <p className="mt-3 text-[11px] text-slate-400">
            As it was written on the day the goods went out.
          </p>
        </div>

        {/* Sent by. */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Sent by
          </h3>
          <p className="mt-2 font-bold text-espresso">
            {challan.supplier?.company_name ||
              [challan.supplier?.first_name, challan.supplier?.last_name]
                .filter(Boolean)
                .join(" ") ||
              "You"}
          </p>
          {challan.supplier?.warehouse_address && (
            <p className="mt-1 text-sm text-slate-600">
              {challan.supplier.warehouse_address}
            </p>
          )}
          {challan.supplier?.warehouse_state && (
            <p className="text-sm text-slate-600">
              {challan.supplier.warehouse_state}
            </p>
          )}
          {(challan.supplier?.contact_phone || challan.supplier?.phone) && (
            <p className="mt-1 text-sm text-slate-500">
              {challan.supplier.contact_phone || challan.supplier.phone}
            </p>
          )}
          {challan.supplier?.gstin && (
            <p className="mt-1 font-mono text-xs text-slate-500">
              GSTIN {challan.supplier.gstin}
            </p>
          )}
        </div>
      </div>

      {/* What went out */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-espresso">What went out</h3>
        </div>

        {items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No items were recorded on this challan.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-2.5 text-left font-bold">Item</th>
                  <th className="px-3 py-2.5 text-center font-bold">HSN</th>
                  <th className="px-3 py-2.5 text-center font-bold">Qty</th>
                  <th className="px-3 py-2.5 text-right font-bold">Rate</th>
                  <th className="px-5 py-2.5 text-right font-bold">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-5 py-3 font-semibold text-espresso">
                      {item.item_name}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-xs text-slate-400">
                      {item.hsn_code || "-"}
                    </td>
                    {/* Through trimmed: the column is NUMERIC, so 2.500 metres
                        would otherwise read as a typo. */}
                    <td className="px-3 py-3 text-center font-bold">
                      {trimmed(item.quantity)}
                      {item.unit ? ` ${item.unit}` : ""}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">
                      {rupees(item.unit_price, { document: true })}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-espresso">
                      {rupees(item.total, { document: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* The money as it stood when the goods left, which is the whole
            reason a challan rather than an invoice was raised. */}
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
          <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Value of goods</span>
              <span>{rupees(total, { document: true })}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Received by then</span>
              <span>{rupees(paid, { document: true })}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-slate-200 pt-1.5 font-black text-espresso">
              <span className="text-xs uppercase tracking-wider">
                Outstanding
              </span>
              <span className="text-base">
                {rupees(due, { document: true })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {billed && (
        <Link
          to={`/seller/invoices/${challan.invoice_id}`}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-clay"
        >
          <FileText className="h-5 w-5 shrink-0 text-clay" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-espresso">
              The tax invoice for these goods
            </p>
            <p className="text-xs text-slate-500">
              Raised once the money came in. That is the document with the GST
              on it.
            </p>
          </div>
        </Link>
      )}
    </div>
  );
};

export default ChallanDetail;
