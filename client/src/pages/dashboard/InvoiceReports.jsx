import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart2, ArrowLeft, Download, Calendar, Percent, Clock, AlertTriangle, FileSpreadsheet } from "lucide-react";
import axios from "../../utils/axios";

export default function InvoiceReports() {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await axios.get(`/api/invoices/report?${params.toString()}`);
      if (res.data.success) {
        setReport(res.data.report);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const gstSummary = report?.gstSummary || {};
  const agingReport = report?.agingReport || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard/invoices")}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-emerald-600" /> GST & Invoice Aging Financial Reports
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive GST collection summaries and overdue payment aging reports.
            </p>
          </div>
        </div>

        {/* Date Filter & Export */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
          />
          <button
            onClick={fetchReports}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Filter
          </button>

          <a
            href="/api/invoices/export/excel"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Report
          </a>
        </div>
      </div>

      {/* GST Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Taxable</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            ₹{Number(gstSummary.total_taxable || 0).toLocaleString("en-IN")}
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">CGST Collected</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
            ₹{Number(gstSummary.total_cgst || 0).toLocaleString("en-IN")}
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">SGST Collected</span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
            ₹{Number(gstSummary.total_sgst || 0).toLocaleString("en-IN")}
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">IGST Collected</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
            ₹{Number(gstSummary.total_igst || 0).toLocaleString("en-IN")}
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs bg-emerald-50/50 dark:bg-emerald-950/20">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Total GST Tax
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            ₹{Number(gstSummary.total_gst || 0).toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Invoice Aging Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-rose-500" /> Invoice Aging Analysis (Accounts Receivable)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                <th className="py-3 px-4">Aging Bracket</th>
                <th className="py-3 px-4 text-center">Overdue Invoice Count</th>
                <th className="py-3 px-4 text-right">Outstanding Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {agingReport.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">
                    No overdue receivables recorded.
                  </td>
                </tr>
              ) : (
                agingReport.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {row.aging_bucket}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">{row.count}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-rose-600 dark:text-rose-400">
                      ₹{Number(row.amount).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
