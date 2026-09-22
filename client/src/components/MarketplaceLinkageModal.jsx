import { useState, useEffect } from "react";
import ModalShell from "./ModalShell";
import api from "../utils/axios";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Save, Layers } from "lucide-react";

/**
 * Modal to add or edit a marketplace/channel linkage with its own
 * independent series number configuration.
 */
const MarketplaceLinkageModal = ({
  linkage = null,
  marketplaces = [],
  onClose,
  onSaved,
}) => {
  const isEditing = Boolean(linkage?.id);

  const defaultMp = marketplaces[0]?.id || "amazon";

  const [marketplace, setMarketplace] = useState(
    linkage?.marketplace || defaultMp,
  );
  const [linkageName, setLinkageName] = useState(linkage?.linkage_name || "");
  const [code, setCode] = useState(linkage?.code || "");
  const [invoicePrefix, setInvoicePrefix] = useState(
    linkage?.invoice_prefix || "AZ/",
  );
  const [salePrefix, setSalePrefix] = useState(
    linkage?.sale_prefix || "S-AZ/",
  );
  const [orderPrefix, setOrderPrefix] = useState(
    linkage?.order_prefix || "SO-AZ/",
  );
  const [numberSuffix, setNumberSuffix] = useState(
    linkage?.number_suffix ?? "/{FY}",
  );
  const [numberPadTo, setNumberPadTo] = useState(
    String(linkage?.number_pad_to ?? 0),
  );
  const [saving, setSaving] = useState(false);

  // When switching marketplace while adding, suggest appropriate prefixes
  const handleMarketplaceChange = (newMp) => {
    setMarketplace(newMp);
    if (!isEditing) {
      const mpInfo = marketplaces.find((m) => m.id === newMp);
      const pref = mpInfo?.defaultPrefix || (newMp === "flipkart" ? "FK/" : "AZ/");
      const sPref = mpInfo?.defaultSalePrefix || `S-${pref}`;
      const oPref = mpInfo?.defaultOrderPrefix || `SO-${pref}`;
      setInvoicePrefix(pref);
      setSalePrefix(sPref);
      setOrderPrefix(oPref);
      if (!linkageName || linkageName.startsWith("Amazon") || linkageName.startsWith("Flipkart")) {
        setLinkageName(`${mpInfo?.name || "Marketplace"} Store`);
      }
    }
  };

  // Live preview calculation
  const cleanHead = (p) => {
    const s = String(p ?? "").trim().toUpperCase();
    if (!s) return "";
    return s.endsWith("/") || s.endsWith("-") ? s : `${s}/`;
  };

  const currentYear = () => {
    const d = new Date();
    const yr = d.getFullYear();
    const start = d.getMonth() >= 3 ? yr : yr - 1;
    const two = (n) => String(n % 100).padStart(2, "0");
    return `${two(start)}-${two(start + 1)}`;
  };

  const fy = currentYear();
  const fillFy = (text) => String(text ?? "").replace(/\{FY\}/g, fy);

  const pad = Number(numberPadTo) || 0;
  const seqStr = pad > 0 ? "1".padStart(pad, "0") : "1";

  const invHead = fillFy(cleanHead(invoicePrefix));
  const invTail = fillFy(numberSuffix);
  const sampleInvoice = `${invHead}${seqStr}${invTail}`;

  const saleHead = fillFy(cleanHead(salePrefix));
  const sampleSale = `${saleHead}1/${fy}`;

  const orderHead = fillFy(cleanHead(orderPrefix));
  const sampleOrder = `${orderHead}1/${fy}`;

  const GST_ALLOWED = /^[A-Za-z0-9/-]+$/;
  const isInvoiceValid =
    sampleInvoice.length <= 16 &&
    sampleInvoice.length > 0 &&
    GST_ALLOWED.test(sampleInvoice);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!linkageName.trim()) {
      toast.error("Please provide a linkage name.");
      return;
    }

    if (!isEditing && code && !/^[a-z0-9_-]+$/.test(code.trim().toLowerCase())) {
      toast.error(
        "Identifier may only contain lowercase letters, numbers, hyphens, and underscores.",
      );
      return;
    }

    if (!cleanHead(invoicePrefix) || !GST_ALLOWED.test(cleanHead(invoicePrefix))) {
      toast.error("Invoice prefix may only use letters, digits, hyphen, and slash.");
      return;
    }

    if (!isInvoiceValid) {
      toast.error(
        `Invoice number would be ${sampleInvoice.length} characters. GST Rule 46(b) limits tax invoices to 16 characters.`,
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        marketplace,
        linkageName: linkageName.trim(),
        code: code.trim().toLowerCase() || undefined,
        invoicePrefix: cleanHead(invoicePrefix),
        salePrefix: cleanHead(salePrefix),
        orderPrefix: cleanHead(orderPrefix),
        numberSuffix: numberSuffix.trim(),
        numberPadTo: Number(numberPadTo) || 0,
      };

      if (isEditing) {
        await api.put(`/api/marketplace-linkages/${linkage.id}`, payload);
        toast.success(`Marketplace linkage "${linkageName}" updated.`);
      } else {
        await api.post("/api/marketplace-linkages", payload);
        toast.success(`Marketplace linkage "${linkageName}" created.`);
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error("Failed to save linkage", err);
      toast.error(
        err.response?.data?.message || "Could not save marketplace linkage.",
      );
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-espresso focus:border-clay focus:bg-white focus:outline-none";

  return (
    <ModalShell
      onClose={onClose}
      maxWidth="max-w-xl"
      title={isEditing ? "Edit Marketplace Linkage" : "Add Marketplace Linkage"}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !isInvoiceValid}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-clay px-5 py-2 text-xs font-bold text-white shadow-sm shadow-clay/20 transition-colors hover:bg-espresso disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : isEditing ? "Update Linkage" : "Save Linkage"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Marketplace Selection */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-espresso/80">
            Marketplace Platform <span className="text-rose-500">*</span>
          </label>
          <select
            value={marketplace}
            onChange={(e) => handleMarketplaceChange(e.target.value)}
            disabled={isEditing}
            className={`${fieldClass} ${isEditing ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
          >
            {marketplaces.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-500">
            {isEditing
              ? "Platform cannot be changed once created."
              : "Select the marketplace platform for this connection."}
          </p>
        </div>

        {/* Linkage Name & Identifier */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-espresso/80">
              Linkage Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={linkageName}
              onChange={(e) => setLinkageName(e.target.value)}
              placeholder="e.g. Amazon Store 2"
              className={fieldClass}
            />
            <span className="text-[11px] text-slate-400">
              Label displayed in dropdowns
            </span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-espresso/80">
              Channel Identifier
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase())}
              disabled={isEditing}
              placeholder="e.g. amazon_2"
              className={`${fieldClass} ${isEditing ? "cursor-not-allowed opacity-70" : ""}`}
            />
            <span className="text-[11px] text-slate-400">
              Unique internal code (auto-generated if blank)
            </span>
          </div>
        </div>

        {/* Independent Series Number Configuration */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
            <Layers className="h-4 w-4 text-clay" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-espresso">
              Independent Series Number Configuration
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-espresso/80">
                Invoice Prefix <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                placeholder="AZ2/"
                maxLength={10}
                className={fieldClass}
              />
              <span className="text-[11px] text-slate-400">
                E.g. AZ2/ or FK2/
              </span>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-espresso/80">
                Sale Prefix
              </label>
              <input
                type="text"
                value={salePrefix}
                onChange={(e) => setSalePrefix(e.target.value.toUpperCase())}
                placeholder="S-AZ2/"
                maxLength={10}
                className={fieldClass}
              />
              <span className="text-[11px] text-slate-400">
                E.g. S-AZ2/
              </span>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-espresso/80">
                Order Prefix
              </label>
              <input
                type="text"
                value={orderPrefix}
                onChange={(e) => setOrderPrefix(e.target.value.toUpperCase())}
                placeholder="SO-AZ2/"
                maxLength={10}
                className={fieldClass}
              />
              <span className="text-[11px] text-slate-400">
                E.g. SO-AZ2/
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-espresso/80">
                Invoice Number Suffix
              </label>
              <input
                type="text"
                value={numberSuffix}
                onChange={(e) => setNumberSuffix(e.target.value)}
                placeholder="/{FY}"
                className={fieldClass}
              />
              <span className="text-[11px] text-slate-400">
                Use <code className="font-bold">{"{FY}"}</code> for financial year
              </span>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-espresso/80">
                Leading Zeros (Padding)
              </label>
              <input
                type="number"
                min="0"
                max="9"
                value={numberPadTo}
                onChange={(e) => setNumberPadTo(e.target.value)}
                className={fieldClass}
              />
              <span className="text-[11px] text-slate-400">
                0 for plain 1, 2, 3; 4 for 0001
              </span>
            </div>
          </div>

          {/* Live Document Number Samples Card */}
          <div
            className={`rounded-xl border p-3.5 ${
              isInvoiceValid
                ? "border-slate-200 bg-white"
                : "border-rose-200 bg-rose-50"
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Live Series Number Preview
              </span>
              <div className="flex items-center gap-1.5">
                {isInvoiceValid ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Rule 46(b) compliant ({sampleInvoice.length}/16 chars)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {sampleInvoice.length > 16
                      ? `Exceeds 16 chars (${sampleInvoice.length} chars)`
                      : "Invalid characters"}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5">
              <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                <span className="block text-[10px] uppercase font-bold text-slate-400">
                  Next Invoice
                </span>
                <span className="font-mono text-xs font-black text-espresso">
                  {sampleInvoice}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                <span className="block text-[10px] uppercase font-bold text-slate-400">
                  Next Sale
                </span>
                <span className="font-mono text-xs font-black text-espresso">
                  {sampleSale}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                <span className="block text-[10px] uppercase font-bold text-slate-400">
                  Next Order
                </span>
                <span className="font-mono text-xs font-black text-espresso">
                  {sampleOrder}
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </ModalShell>
  );
};

export default MarketplaceLinkageModal;
