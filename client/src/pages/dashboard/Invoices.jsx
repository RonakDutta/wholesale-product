import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  FileText,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import axios from "../../utils/axios";
import { downloadFile } from "../../utils/download";

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

// Two words a trader reads, not four words an accountant reads.
const PAYMENT_LABELS = {
  Paid: { label: "Paid", className: "bg-emerald-50 text-emerald-700" },
  Pending: { label: "Not paid", className: "bg-amber-50 text-amber-700" },
  Refunded: { label: "Refunded", className: "bg-slate-100 text-slate-600" },
};

const isOverdue = (invoice) =>
  invoice.payment_status === "Pending" &&
  invoice.due_date &&
  new Date(invoice.due_date) < new Date();

const SummaryCard = ({ label, value, hint, tone }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
    <p className="text-[11px] font-semibold leading-tight text-slate-500 sm:text-sm">
      {label}
    </p>
    <p
      className={`mt-1 text-base font-black sm:text-2xl ${
        tone === "amber"
          ? "text-amber-600"
          : tone === "rose"
            ? "text-rose-600"
            : "text-espresso"
      }`}
    >
      ₹{money(value)}
    </p>
    <p className="mt-1 hidden text-xs font-medium text-slate-500 sm:block">
      {hint}
    </p>
  </div>
);

const StatusChip = ({ invoice }) => {
  if (isOverdue(invoice)) {
    return (
      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700">
        Overdue
      </span>
    );
  }
  const chip =
    PAYMENT_LABELS[invoice.payment_status] || PAYMENT_LABELS.Pending;
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${chip.className}`}
    >
      {chip.label}
    </span>
  );
};

/**
 * The invoices a wholesaler has issued.
 *
 * Rebuilt for 3.0. The marketplace version led with a row of export chips and
 * five filter controls before any bill was visible, called the customer
 * "Party" and "Buyer" on the same screen, and clipped its own empty state on
 * a phone because the whole thing lived inside one horizontally scrolling
 * table.
 *
 * Recording a payment used to be possible from here, and that has been
 * removed rather than restyled. It wrote to the invoice module's own payments
 * table, which the customer's running balance does not read, so a bill would
 * show Paid while the customer still owed the full amount. Payments belong on
 * the customer's page until those two ledgers are made one.
 */
export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    paymentStatus: "",
    startDate: "",
    endDate: "",
    // Fixed, not a filter. This workspace is wholesalers only, so it shows
    // what you billed out.
    side: "sales",
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortOrder: "DESC",
  });

  // Defined inside the effect rather than as a callback above it, so the
  // linter can see that nothing sets state synchronously on render.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        if (alive) setLoading(true);
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, val]) => {
          if (val !== "" && val !== null && val !== undefined) {
            params.append(key, val);
          }
        });
        const res = await axios.get(`/api/invoices?${params.toString()}`);
        if (!alive) return;
        setError("");
        if (res.data.success) {
          setInvoices(res.data.invoices || []);
          setPagination(
            res.data.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 1,
            },
          );
        }
      } catch (err) {
        console.error("Error loading invoices:", err);
        if (alive) {
          setError(err.response?.data?.message || "Could not load your invoices.");
        }
      }
      if (alive) setLoading(false);
    };
    load();
    return () => {
      alive = false;
    };
  }, [filters]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await axios.get("/api/invoices/dashboard", {
          params: { side: "sales" },
        });
        if (alive && res.data.success) {
          setStats(res.data.stats?.summary || res.data.stats || null);
        }
      } catch (err) {
        // The list is the page. Missing totals is not worth an error message.
        console.error("Error loading invoice totals:", err);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  const setFilter = (patch) =>
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));

  const clearFilters = () =>
    setFilters((prev) => ({
      ...prev,
      search: "",
      paymentStatus: "",
      startDate: "",
      endDate: "",
      page: 1,
    }));

  const activeFilters =
    (filters.paymentStatus ? 1 : 0) +
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const params = new URLSearchParams({ side: "sales" });
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      await downloadFile(
        `/api/invoices/export/${format}?${params.toString()}`,
        `invoices.${format === "excel" ? "xlsx" : format}`,
      );
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Could not download that file.");
    }
    setExporting("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-espresso">Invoices</h2>
          <p className="mt-1 text-sm text-slate-500">
            Every invoice you have issued, and what is still to come in.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/seller/invoices/reports"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            GST reports
          </Link>
          <Link
            to="/seller/invoices/settings"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50"
            title="Invoice settings"
            aria-label="Invoice settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <SummaryCard
            label="Still to come in"
            value={stats.pending_amount}
            hint={`${stats.pending_count || 0} unpaid`}
            tone="amber"
          />
          <SummaryCard
            label="Received"
            value={stats.paid_amount}
            hint={`${stats.paid_count || 0} settled`}
          />
          <SummaryCard
            label="Past the due date"
            value={stats.overdue_amount}
            hint={`${stats.overdue_count || 0} overdue`}
            tone="rose"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full min-w-0 sm:w-auto sm:max-w-xs sm:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.search}
                onChange={(e) => setFilter({ search: e.target.value })}
                placeholder="Search invoice number or customer"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-clay"
              />
            </div>

            {/* Five controls in a row pushed the bills below the fold on a
                phone. They fold away until asked for. */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                activeFilters > 0
                  ? "border-clay bg-clay/10 text-clay"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {activeFilters > 0 && ` (${activeFilters})`}
            </button>

            <div className="ml-auto flex shrink-0 items-center gap-1">
              {["csv", "excel", "pdf"].map((format) => (
                <button
                  key={format}
                  onClick={() => handleExport(format)}
                  disabled={Boolean(exporting)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-bold uppercase text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  title={`Download as ${format.toUpperCase()}`}
                >
                  {exporting === format ? (
                    "..."
                  ) : (
                    <span className="flex items-center gap-1">
                      <Download className="h-3.5 w-3.5" />
                      {format}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-4">
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilter({ paymentStatus: e.target.value })}
                aria-label="Payment status"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-clay"
              >
                <option value="">Paid and unpaid</option>
                <option value="Pending">Not paid</option>
                <option value="Paid">Paid</option>
              </select>
              <div>
                <label
                  htmlFor="invoice-from"
                  className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400"
                >
                  From
                </label>
                <input
                  id="invoice-from"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilter({ startDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-clay"
                />
              </div>
              <div>
                <label
                  htmlFor="invoice-to"
                  className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400"
                >
                  To
                </label>
                <input
                  id="invoice-to"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilter({ endDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-clay"
                />
              </div>
              {activeFilters > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center justify-center gap-1.5 self-end rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="border-b border-rose-100 bg-rose-50 px-6 py-3 text-sm font-semibold text-rose-700">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-semibold text-espresso">No invoices yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Record a sale, then raise its invoice from the sale page. It
              carries the customer's GST number so they can claim input credit.
            </p>
            <Link
              to="/seller/sales"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-clay px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-espresso"
            >
              <Plus className="h-4 w-4" />
              Go to sales
            </Link>
          </div>
        ) : (
          <>
            {/* Phone: stacked rows. The old table scrolled sideways and cut
                off its own content at this width. */}
            <ul className="divide-y divide-slate-100 sm:hidden">
              {invoices.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    to={`/seller/invoices/${invoice.id}`}
                    className="block px-4 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm font-bold text-espresso">
                        {invoice.buyer_name}
                      </p>
                      <p className="shrink-0 text-sm font-black text-espresso">
                        ₹{money(invoice.grand_total)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-xs font-medium text-slate-500">
                        {invoice.invoice_number} ·{" "}
                        {dateLabel(invoice.issue_date)}
                      </p>
                      <StatusChip invoice={invoice} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Invoice
                    </th>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Customer
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Date
                    </th>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="cursor-pointer transition-colors hover:bg-slate-50/60"
                      onClick={() => {
                        window.location.href = `/seller/invoices/${invoice.id}`;
                      }}
                    >
                      <td className="whitespace-nowrap px-6 py-3">
                        <Link
                          to={`/seller/invoices/${invoice.id}`}
                          className="font-bold text-espresso hover:text-clay"
                        >
                          {invoice.invoice_number}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <p className="max-w-xs truncate text-slate-700">
                          {invoice.buyer_name}
                        </p>
                        {invoice.buyer_gstin && (
                          <p className="text-[11px] text-slate-400">
                            {invoice.buyer_gstin}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                        {dateLabel(invoice.issue_date)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusChip invoice={invoice} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right font-black text-espresso">
                        ₹{money(invoice.grand_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6">
            <p className="text-xs font-semibold text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page <= 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                Back
              </button>
              <button
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
