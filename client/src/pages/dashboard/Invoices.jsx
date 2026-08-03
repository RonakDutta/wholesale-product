import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw, BarChart2, Settings } from "lucide-react";
import { toast } from "sonner";
import axios from "../../utils/axios";
import { downloadFile } from "../../utils/download";
import InvoiceStats from "../../components/invoice/InvoiceStats";
import InvoiceAnalytics from "../../components/invoice/InvoiceAnalytics";
import InvoiceFilters from "../../components/invoice/InvoiceFilters";
import InvoiceTable from "../../components/invoice/InvoiceTable";
import PaymentHistory from "../../components/invoice/PaymentHistory";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    invoiceStatus: "",
    paymentStatus: "",
    startDate: "",
    endDate: "",
    // This is the seller workspace, so it opens on what you billed out.
    // Purchases are still reachable through the toggle.
    side: "sales",
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortOrder: "DESC",
  });

  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] =
    useState(null);

  // Fetch Invoices List
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== "" && val !== null && val !== undefined) {
          params.append(key, val);
        }
      });

      const res = await axios.get(`/api/invoices?${params.toString()}`);
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
      setError(err.response?.data?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch Dashboard Stats
  const fetchDashboardStats = useCallback(async () => {
    try {
      const res = await axios.get("/api/invoices/dashboard", {
        params: { side: filters.side },
      });
      if (res.data.success) {
        setDashboardStats(res.data.stats);
      }
    } catch (err) {
      console.error("Error loading dashboard stats:", err);
    }
  }, [filters.side]);

  useEffect(() => {
    void (async () => {
      await Promise.all([fetchInvoices(), fetchDashboardStats()]);
    })();
  }, [fetchInvoices, fetchDashboardStats]);

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters((prev) => ({
      search: "",
      invoiceStatus: "",
      paymentStatus: "",
      startDate: "",
      endDate: "",
      side: prev.side,
      page: 1,
      limit: 10,
      sortBy: "created_at",
      sortOrder: "DESC",
    }));
  };

  const handleSort = (field) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder:
        prev.sortBy === field && prev.sortOrder === "DESC" ? "ASC" : "DESC",
      page: 1,
    }));
  };

  const handleRecordPayment = async (paymentPayload) => {
    if (!selectedInvoiceForPayment) return;
    try {
      const res = await axios.post(
        `/api/invoices/${selectedInvoiceForPayment.id}/payment`,
        paymentPayload,
      );
      if (res.data.success) {
        toast.success("Payment recorded");
        setSelectedInvoiceForPayment(null);
        fetchInvoices();
        fetchDashboardStats();
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast.error(err.response?.data?.message || "Failed to record payment");
    }
  };

  const handleSendEmail = async (id) => {
    try {
      const res = await axios.post(`/api/invoices/${id}/send`);
      if (res.data.success) {
        toast.success(res.data.message || "Invoice emailed to the buyer");
        fetchInvoices();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send email");
    }
  };

  const handleSendReminder = async (id) => {
    try {
      const res = await axios.post(`/api/invoices/${id}/reminder`);
      if (res.data.success) {
        toast.success(res.data.message || "Payment reminder sent");
        fetchInvoices();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send reminder");
    }
  };

  // Exports carry the current filters, so what downloads matches what is on
  // screen, and go through axios so the request is actually authenticated.
  const exportParams = () => {
    const rest = { ...filters };
    delete rest.page;
    delete rest.limit;
    return rest;
  };

  const runExport = async (path, filename) => {
    try {
      await downloadFile(path, filename, { params: exportParams() });
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Could not prepare that export");
    }
  };

  const handleExportCSV = () =>
    runExport("/api/invoices/export/csv", "invoices.csv");

  const handleExportExcel = () =>
    runExport("/api/invoices/export/excel", "invoices.xls");

  const handleExportPDF = () =>
    runExport("/api/invoices/export/pdf", "invoices-summary.pdf");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-espresso">
            Invoices
          </h1>
          <p className="mt-1 text-sm text-espresso/60">
            Tax invoices, payments received and what is still outstanding.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchInvoices();
              fetchDashboardStats();
            }}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-espresso/70 shadow-sm transition-colors hover:bg-slate-100"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            to="/seller/invoices/reports"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-espresso/70 shadow-sm transition-colors hover:bg-slate-100"
          >
            <BarChart2 className="w-4 h-4 text-sage" /> GST reports
          </Link>

          <Link
            to="/seller/invoices/settings"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-espresso/70 shadow-sm transition-colors hover:bg-slate-100"
            title="Invoice defaults"
          >
            <Settings className="w-4 h-4" />
          </Link>

          <Link
            to="/seller/invoices/create"
            className="flex items-center gap-2 rounded-xl bg-clay px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-clay/20 transition-colors hover:bg-espresso"
          >
            <Plus className="w-4 h-4" /> New invoice
          </Link>
        </div>
      </div>

      {/* Sales you raised versus invoices billed to you. Both sides belong to
          the same account, so neither is hidden behind a role. */}
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        {[
          { key: "sales", label: "Billed by me" },
          { key: "purchases", label: "Billed to me" },
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => handleFilterChange({ side: option.key })}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              filters.side === option.key
                ? "bg-clay text-white"
                : "text-espresso/60 hover:text-espresso"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* KPI Metric Summary Cards */}
      {dashboardStats?.summary && (
        <InvoiceStats summary={dashboardStats.summary} />
      )}

      {/* Visual Analytics Charts */}
      {dashboardStats && <InvoiceAnalytics stats={dashboardStats} />}

      {/* Filter Bar */}
      <InvoiceFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
      />

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Invoice Table Component */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-espresso/50">
            Loading invoices
          </p>
        </div>
      ) : (
        <InvoiceTable
          invoices={invoices}
          pagination={pagination}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          onSort={handleSort}
          sortBy={filters.sortBy}
          onRecordPayment={(inv) => setSelectedInvoiceForPayment(inv)}
          onSendEmail={handleSendEmail}
          onSendReminder={handleSendReminder}
        />
      )}

      {/* Payment Recording Modal Trigger */}
      {selectedInvoiceForPayment && (
        <PaymentHistory
          invoice={selectedInvoiceForPayment}
          payments={selectedInvoiceForPayment.payments || []}
          onRecordPayment={handleRecordPayment}
        />
      )}
    </div>
  );
}
