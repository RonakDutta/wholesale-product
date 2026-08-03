import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import axios from "../../utils/axios";

export default function InvoiceSettings() {
  const navigate = useNavigate();
  const [prefix, setPrefix] = useState("INV");
  const [dueDays, setDueDays] = useState("15");
  const [defaultTaxRate, setDefaultTaxRate] = useState("18");
  const [defaultNotes, setDefaultNotes] = useState("");
  const [defaultTerms, setDefaultTerms] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await axios.get("/api/invoices/settings");
        if (!cancelled && res.data.success) {
          const s = res.data.settings;
          setPrefix(s.prefix);
          setDueDays(String(s.dueDays));
          setDefaultTaxRate(String(s.defaultTaxRate));
          setDefaultNotes(s.defaultNotes || "");
          setDefaultTerms(s.defaultTerms || "");
        }
      } catch (err) {
        console.error("Failed to load invoice settings", err);
        if (!cancelled) toast.error("Could not load your invoice settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await axios.put("/api/invoices/settings", {
        prefix,
        dueDays: Number(dueDays),
        defaultTaxRate: Number(defaultTaxRate),
        defaultNotes,
        defaultTerms,
      });
      if (res.data.success) {
        toast.success("Invoice settings saved");
      }
    } catch (err) {
      console.error("Failed to save invoice settings", err);
      toast.error(err.response?.data?.message || "Could not save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/seller/invoices")}
            className="p-2 text-slate-500 hover:text-espresso border border-slate-200 rounded-xl hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-espresso">
              Invoice defaults
            </h1>
            <p className="mt-0.5 text-sm text-espresso/60">
              Applied to every invoice you raise from here on.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-espresso pb-3 border-b border-slate-100">
            Invoice Numbering & Defaults
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-espresso/70 mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-espresso"
              />
              <span className="text-[11px] text-slate-400">
                e.g. INV ➔ INV-2026-000001
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-espresso/70 mb-1">
                Default Payment Due Days
              </label>
              <input
                type="number"
                value={dueDays}
                onChange={(e) => setDueDays(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-espresso"
              />
              <span className="text-[11px] text-slate-400">
                Number of days from issue date
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-espresso/70 mb-1">
              Standard GST Tax Rate (%)
            </label>
            <select
              value={defaultTaxRate}
              onChange={(e) => setDefaultTaxRate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-espresso"
            >
              <option value="0">0% (Exempt)</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST (Standard B2B)</option>
              <option value="28">28% GST</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-espresso pb-3 border-b border-slate-100">
            Terms & Footers
          </h3>

          <div>
            <label className="block text-xs font-semibold text-espresso/70 mb-1">
              Default Invoice Notes
            </label>
            <textarea
              rows={2}
              value={defaultNotes}
              onChange={(e) => setDefaultNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-espresso"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-espresso/70 mb-1">
              Standard Terms & Conditions
            </label>
            <textarea
              rows={4}
              value={defaultTerms}
              onChange={(e) => setDefaultTerms(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-espresso"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-clay px-6 py-2.5 text-xs font-bold text-white shadow-sm shadow-clay/20 transition-colors hover:bg-espresso disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {isSaving ? "Saving" : "Save settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
