import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { FileText, Plus, RefreshCw, BarChart2, Settings, Download } from "lucide-react";
import axios from "../../utils/axios";
import InvoiceStats from "../../components/invoice/InvoiceStats";
import InvoiceAnalytics from "../../components/invoice/InvoiceAnalytics";
import InvoiceFilters from "../../components/invoice/InvoiceFilters";
import InvoiceTable from "../../components/invoice/InvoiceTable";
import PaymentHistory from "../../components/invoice/PaymentHistory";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    invoiceStatus: "",
    paymentStatus: "",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortOrder: "DESC",
  });

  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);

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
        setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error("Error loading invoices:", err);
      setError(err.response?.data?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch Dashboard Stats
  const fetchDashboardStats = async () => {
    try {
      const res = await axios.get("/api/invoices/dashboard");
      if (res.data.success) {
        setDashboardStats(res.data.stats);
      }
    } catch (err) {
      console.error("Error loading dashboard stats:", err);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchDashboardStats();
  }, [fetchInvoices]);

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      invoiceStatus: "",
      paymentStatus: "",
      startDate: "",
      endDate: "",
      page: 1,
      limit: 10,
      sortBy: "created_at",
      sortOrder: "DESC",
    });
  };

  const handleSort = (field) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === "DESC" ? "ASC" : "DESC",
      page: 1,
    }));
  };

  const handleRecordPayment = async (paymentPayload) => {
    if (!selectedInvoiceForPayment) return;
    try {
      const res = await axios.post(
        `/api/invoices/${selectedInvoiceForPayment.id}/payment`,
        paymentPayload
      );
      if (res.data.success) {
        alert("Payment recorded successfully!");
        setSelectedInvoiceForPayment(null);
        fetchInvoices();
        fetchDashboardStats();
      }
    } catch (err) {
      console.error("Payment error:", err);
      alert(err.response?.data?.message || "Failed to record payment");
    }
  };

  const handleSendEmail = async (id) => {
    try {
      const res = await axios.post(`/api/invoices/${id}/send`);
      if (res.data.success) {
        alert(res.data.message || "Invoice email sent successfully!");
        fetchInvoices();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send email");
    }
  };

  const handleSendReminder = async (id) => {
    try {
      const res = await axios.post(`/api/invoices/${id}/reminder`);
      if (res.data.success) {
        alert(res.data.message || "Payment reminder sent!");
        fetchInvoices();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send reminder");
    }
  };

  const handleExportCSV = () => {
    window.open("/api/invoices/export/csv", "_blank");
  };

  const handleExportExcel = () => {
    window.open("/api/invoices/export/excel", "_blank");
  };

  const handleExportPDF = () => {
    window.open("/api/invoices/export/pdf", "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Enterprise Invoice Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage tax invoices, record payments, track receivables, and analyze GST metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchInvoices();
              fetchDashboardStats();
            }}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl transition-colors shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            to="/dashboard/invoices/reports"
            className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
          >
            <BarChart2 className="w-4 h-4 text-emerald-600" /> GST Reports
          </Link>

          <Link
            to="/dashboard/invoices/create"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" /> Create Invoice
          </Link>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      {dashboardStats?.summary && <InvoiceStats summary={dashboardStats.summary} />}

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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-500 opacity-60" />
          <p className="text-xs font-semibold">Loading ERP Invoice Registry...</p>
        </div>
      ) : (
        <InvoiceTable
          invoices={invoices}
          pagination={pagination}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          onSort={handleSort}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
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
