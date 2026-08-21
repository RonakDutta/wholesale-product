import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Download, FileText, Truck, X } from "lucide-react";
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

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await api.get(`/api/sales/${id}`);
        if (alive) setData(res.data);
      } catch (error) {
        if (alive) {
          toast.error(
            error.response?.status === 404
              ? "That sale is not in your book."
              : "Could not load this sale.",
          );
        }
      }

      // A 404 here is the normal case: most sales have no bill yet. Only a
      // real failure is worth saying anything about.
      try {
        const res = await api.get(`/api/sales/${id}/invoice`);
        if (alive) setInvoice(res.data);
      } catch (error) {
        if (alive && error.response?.status !== 404) {
          console.error("Could not check for a bill", error);
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
      toast.success(`Bill ${raised.invoice_number} is ready.`);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not raise the bill.",
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
      setData((prev) => ({ ...prev, sale: { ...prev.sale, ...updated } }));
      toast.success(`Sale marked ${status}.`);
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

          <div className="text-right">
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

        {actions.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
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

      {/* The bill. A cancelled sale cannot have one, so nothing is offered. */}
      {sale.status !== "cancelled" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {invoice ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <p className="text-sm font-bold text-espresso">
                    {invoice.invoice_number}
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {invoice.recipient_gstin
                    ? `GST bill for ${invoice.recipient_name || sale.party_name}`
                    : `Bill for ${invoice.recipient_name || sale.party_name}. Add their GST number to make it claimable.`}
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
                  Open bill
                </a>
                <Link
                  to={`/seller/invoices/${invoice.id}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Details
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-espresso">
                  No bill raised for this sale
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {sale.status === "draft"
                    ? "Confirm the sale first, then you can raise its bill."
                    : "Raise it once and the number is fixed. It cannot be raised twice."}
                </p>
              </div>
              <button
                onClick={makeBill}
                disabled={billing || sale.status === "draft"}
                className="flex items-center gap-2 rounded-lg bg-clay px-4 py-2 text-sm font-bold text-cream transition-colors hover:bg-espresso disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                {billing ? "Making bill..." : "Make bill"}
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
