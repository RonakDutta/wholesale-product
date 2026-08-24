import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Download,
  FileText,
  Pencil,
  RotateCcw,
  Truck,
  X,
} from "lucide-react";
import api from "../../utils/axios";
import { toast } from "sonner";

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

const METHOD_LABELS = {
  cash: "Cash",
  upi: "UPI",
  bank: "Bank transfer",
  cheque: "Cheque",
  other: "Other",
};

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  confirmed: "bg-sky-50 text-sky-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
};

// Mirrors ALLOWED_NEXT in the sale controller. The server is the authority;
// this only decides which buttons are worth showing.
const NEXT_ACTIONS = {
  draft: [
    { status: "confirmed", label: "Confirm", icon: Check },
    { status: "cancelled", label: "Cancel", icon: X },
  ],
  confirmed: [
    { status: "delivered", label: "Mark delivered", icon: Truck },
    { status: "cancelled", label: "Cancel", icon: X },
  ],
  delivered: [],
  cancelled: [],
};

const SaleDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [billing, setBilling] = useState(false);
  // Set when the bill for this sale has been reversed. Kept beside the sale
  // rather than inside it because it is a document in its own right.
  const [creditNote, setCreditNote] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await api.get(`/api/sales/${id}`);
        if (alive) {
          setData(res.data);
          setCreditNote(res.data.creditNote || null);
        }
      } catch (error) {
        if (alive) {
          toast.error(
            error.response?.status === 404
              ? "That sale is not in your book."
              : "Could not load this sale.",
          );
        }
      }

      // A 404 here is the normal case: most sales have no invoice yet. Only a
      // real failure is worth saying anything about.
      try {
        const res = await api.get(`/api/sales/${id}/invoice`);
        if (alive) setInvoice(res.data);
      } catch (error) {
        if (alive && error.response?.status !== 404) {
          console.error("Could not check for an invoice", error);
        }
      }

      if (alive) setLoading(false);
    };
    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const makeBill = async () => {
    setBilling(true);
    try {
      const { data: raised } = await api.post(`/api/sales/${id}/invoice`);
      setInvoice(raised);
      toast.success(`Invoice ${raised.invoice_number} is ready.`);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not raise the invoice.",
      );
    }
    setBilling(false);
  };

  const changeStatus = async (status) => {
    setBusy(true);
    try {
      const { data: updated } = await api.patch(`/api/sales/${id}/status`, {
        status,
      });
      const { creditNote: raised, ...sale } = updated;
      setData((prev) => ({ ...prev, sale: { ...prev.sale, ...sale } }));

      // Cancelling a billed sale reverses the bill with a credit note. Saying
      // so here matters: he expects the invoice to disappear, and it does not.
      if (raised) {
        setCreditNote(raised);
        toast.success(`Sale cancelled. Credit note ${raised.note_number} raised.`);
      } else {
        toast.success(`Sale marked ${status}.`);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not update this sale.",
      );
    }
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="font-semibold text-espresso">Sale not found</p>
        <Link
          to="/seller/sales"
          className="mt-4 inline-block text-sm font-bold text-clay hover:underline"
        >
          Back to sales
        </Link>
      </div>
    );
  }

  const { sale, lines, payments } = data;
  const received = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const due = Number(sale.total) - received;
  const actions = NEXT_ACTIONS[sale.status] || [];
  const canEdit = sale.status !== "cancelled" && !invoice;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to="/seller/sales"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-clay"
      >
        <ArrowLeft className="h-4 w-4" />
        Sales
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-espresso">
                {sale.sale_number}
              </h2>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  STATUS_STYLES[sale.status] || STATUS_STYLES.draft
                }`}
              >
                {sale.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {dateLabel(sale.sale_date)}
            </p>
            <Link
              to={`/seller/customers/${sale.party_id}`}
              className="mt-3 inline-block text-sm font-bold text-clay hover:underline"
            >
              {sale.party_name}
              {sale.party_business_name ? ` · ${sale.party_business_name}` : ""}
            </Link>
          </div>

          <div className="w-full text-left sm:w-auto sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Bill total
            </p>
            <p className="text-3xl font-black text-espresso">
              ₹{money(sale.total)}
            </p>
            {sale.status !== "cancelled" && (
              <p
                className={`text-xs font-bold ${
                  due > 0 ? "text-amber-600" : "text-emerald-600"
                }`}
              >
                {due > 0 ? `₹${money(due)} still due` : "Fully paid"}
              </p>
            )}
          </div>
        </div>

        {(actions.length > 0 || canEdit) && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
            {/* Once an invoice exists the sale is frozen: an invoice is a fixed
                document and is corrected with a credit note, not by editing
                what it was raised from. The server refuses either way. */}
            {canEdit && (
              <Link
                to={`/seller/sales/${sale.id}/edit`}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            )}
            {actions.map((action) => (
              <button
                key={action.status}
                onClick={() => changeStatus(action.status)}
                disabled={busy}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${
                  action.status === "cancelled"
                    ? "border-slate-200 text-rose-600 hover:bg-rose-50"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* A cancelled sale can still have an invoice behind it, reversed by a
          credit note. Hiding the panel made an issued, numbered document
          vanish from the screen with nothing saying what became of it. */}
      {(sale.status !== "cancelled" || invoice) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {invoice ? (
            <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <p className="text-sm font-bold text-espresso">
                    {invoice.invoice_number}
                  </p>
                  {creditNote && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      Credited
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {creditNote
                    ? "This bill has been reversed. It stays as it was issued, because a bill that has gone out cannot be rewritten."
                    : invoice.recipient_gstin
                      ? `GST invoice for ${invoice.recipient_name || sale.party_name}`
                      : `Invoice for ${invoice.recipient_name || sale.party_name}. Add their GST number so they can claim input credit.`}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`${api.defaults.baseURL}/api/invoices/${invoice.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Open PDF
                </a>
                <Link
                  to={`/seller/invoices/${invoice.id}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Details
                </Link>
              </div>
            </div>

            {/* The reversing document. Its own number, because the customer
                needs it for his books as much as the wholesaler does. */}
            {creditNote && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sky-50 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <RotateCcw className="h-4 w-4 shrink-0 text-sky-700" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-sky-900">
                      Credit note {creditNote.note_number}
                    </p>
                    <p className="mt-0.5 text-xs text-sky-800">
                      ₹{money(creditNote.grand_total)} credited back against{" "}
                      {invoice.invoice_number}. Give this to{" "}
                      {sale.party_name} along with the original bill.
                    </p>
                  </div>
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-espresso">
                  No invoice raised for this sale
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {sale.status === "draft"
                    ? "Confirm the sale first, then you can raise its invoice."
                    : "Raise it once and the number is fixed. It cannot be raised twice."}
                </p>
              </div>
              <button
                onClick={makeBill}
                disabled={billing || sale.status === "draft" || sale.status === "cancelled"}
                className="flex items-center gap-2 rounded-lg bg-clay px-4 py-2 text-sm font-bold text-cream transition-colors hover:bg-espresso disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                {billing ? "Making invoice..." : "Make invoice"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lines */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Items
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/50">
              <tr>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Item
                </th>
                <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                  Qty
                </th>
                <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                  Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-6 py-3 font-semibold text-espresso">
                    {line.item_name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-600">
                    {Number(line.quantity)} {line.unit || ""}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-600">
                    ₹{money(line.rate)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-right font-bold text-espresso">
                    ₹{money(line.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 border-t border-slate-100 px-6 py-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Items total</span>
            <span className="font-semibold text-espresso">
              ₹{money(sale.subtotal)}
            </span>
          </div>
          {Number(sale.discount) > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Less discount</span>
              <span className="font-semibold text-espresso">
                -₹{money(sale.discount)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-100 pt-2">
            <span className="font-bold text-espresso">Bill total</span>
            <span className="text-lg font-black text-espresso">
              ₹{money(sale.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Payments against this sale */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Money received against this sale
          </h3>
        </div>

        {payments.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-slate-500">
            Nothing received against this sale yet. Payments recorded on the
            customer's account without naming a sale are not listed here.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between px-6 py-3.5"
              >
                <div>
                  <p className="text-sm font-bold text-espresso">
                    {METHOD_LABELS[payment.method] || payment.method}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dateLabel(payment.paid_on)}
                    {payment.note ? ` · ${payment.note}` : ""}
                  </p>
                </div>
                <p className="text-sm font-black text-emerald-700">
                  ₹{money(payment.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {sale.notes && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
            Note
          </h3>
          <p className="whitespace-pre-wrap text-sm text-slate-600">
            {sale.notes}
          </p>
        </div>
      )}
    </div>
  );
};

export default SaleDetail;
