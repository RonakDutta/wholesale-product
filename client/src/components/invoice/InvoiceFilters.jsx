import { useState, useEffect } from "react";
import { Search, X, Download, FileSpreadsheet, FileText } from "lucide-react";

export default function InvoiceFilters({
  filters,
  onFilterChange,
  onReset,
  onExportCSV,
  onExportExcel,
  onExportPDF,
}) {
  const [searchTerm, setSearchTerm] = useState(filters.search || "");

  // Search Debounce handler
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== filters.search) {
        onFilterChange({ search: searchTerm });
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm, filters.search, onFilterChange]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-xs">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice #, Buyer, GSTIN, Company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-espresso placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-clay/20 focus:border-clay transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                onFilterChange({ search: "" });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-espresso"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Invoice Status */}
          <select
            value={filters.invoiceStatus || ""}
            onChange={(e) => onFilterChange({ invoiceStatus: e.target.value })}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-espresso/70 focus:outline-none focus:ring-2 focus:ring-clay/20"
          >
            <option value="">All Invoice Statuses</option>
            <option value="Generated">Generated</option>
            <option value="Sent">Sent</option>
            <option value="Viewed">Viewed</option>
            <option value="Paid">Paid</option>
            <option value="Partial Paid">Partial Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Payment Status */}
          <select
            value={filters.paymentStatus || ""}
            onChange={(e) => onFilterChange({ paymentStatus: e.target.value })}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-espresso/70 focus:outline-none focus:ring-2 focus:ring-clay/20"
          >
            <option value="">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
            <option value="Failed">Failed</option>
            <option value="Refunded">Refunded</option>
          </select>

          {/* Date Picker Start */}
          <div className="relative">
            <input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => onFilterChange({ startDate: e.target.value })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-espresso/70 focus:outline-none focus:ring-2 focus:ring-clay/20"
            />
          </div>

          {/* Date Picker End */}
          <div className="relative">
            <input
              type="date"
              value={filters.endDate || ""}
              onChange={(e) => onFilterChange({ endDate: e.target.value })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-espresso/70 focus:outline-none focus:ring-2 focus:ring-clay/20"
            />
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setSearchTerm("");
              onReset();
            }}
            className="p-2.5 text-slate-500 hover:text-espresso border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            title="Reset Filters"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Export Actions */}
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <button
              onClick={onExportCSV}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-espresso/70 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={onExportExcel}
              className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
            <button
              onClick={onExportPDF}
              className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
