import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ArrowLeft, Save, FileText, Calculator } from "lucide-react";
import axios from "../../utils/axios";

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [buyerId, setBuyerId] = useState("");
  const [buyers, setBuyers] = useState([]);
  const [loadingBuyers, setLoadingBuyers] = useState(true);
  const [discount, setDiscount] = useState("0");
  const [shippingCharge, setShippingCharge] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("Thank you for your business!");
  const [termsConditions, setTermsConditions] = useState("1. Goods once sold will not be taken back.\n2. Payment is due within 15 days.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchBuyers = async () => {
      try {
        const res = await axios.get("/api/invoices/buyers");
        if (res.data.success) {
          setBuyers(res.data.buyers || []);
          if (res.data.buyers?.length > 0) {
            setBuyerId(res.data.buyers[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch buyers list:", err);
      } finally {
        setLoadingBuyers(false);
      }
    };
    fetchBuyers();
  }, []);

  const [items, setItems] = useState([
    { productName: "", hsnCode: "8504", quantity: 1, unitPrice: 0, gstPercent: 18 },
  ]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { productName: "", hsnCode: "8504", quantity: 1, unitPrice: 0, gstPercent: 18 },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Compute live calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const gst = Number(item.gstPercent) || 0;

      const lineTaxable = qty * price;
      const lineTax = (lineTaxable * gst) / 100;

      subtotal += lineTaxable;
      totalTax += lineTax;
    });

    const disc = Number(discount) || 0;
    const ship = Number(shippingCharge) || 0;

    const taxableAmount = Math.max(0, subtotal - disc + ship);
    const grandTotal = Math.round((taxableAmount + totalTax) * 100) / 100;

    return { subtotal, totalTax, taxableAmount, grandTotal };
  };

  const { subtotal, totalTax, taxableAmount, grandTotal } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!buyerId) {
      alert("Please select or enter a valid Buyer.");
      return;
    }

    if (items.some((item) => !item.productName || Number(item.quantity) <= 0)) {
      alert("Please ensure all items have a name and quantity greater than 0.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await axios.post("/api/invoices", {
        buyerId: buyerId,
        items: items.map((i) => ({
          productName: i.productName,
          hsnCode: i.hsnCode,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          gstPercent: Number(i.gstPercent),
        })),
        discount: Number(discount),
        shippingCharge: Number(shippingCharge),
        dueDate: dueDate || null,
        notes,
        termsConditions,
      });

      if (res.data.success) {
        alert("Invoice created successfully!");
        navigate(`/dashboard/invoices/${res.data.invoice.id}`);
      }
    } catch (err) {
      console.error("Create invoice error:", err);
      alert(err.response?.data?.message || "Failed to create manual invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-8 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard/invoices")}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" /> Create Custom B2B Tax Invoice
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Generate a standalone invoice with automated sequential invoice numbers and GST calculations.
            </p>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Metadata Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Buyer Account *
            </label>
            {buyers.length > 0 ? (
              <select
                value={buyerId}
                onChange={(e) => setBuyerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                required
              >
                <option value="">-- Select Buyer Account --</option>
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.company_name} ({b.email})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Enter Buyer Account UUID"
                value={buyerId}
                onChange={(e) => setBuyerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                required
              />
            )}
            <span className="text-[11px] text-slate-400">Target customer account receiving tax invoice</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Invoice Prefix
            </label>
            <input
              type="text"
              value="INV-2026-XXXXXX (Auto)"
              disabled
              className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-500"
            />
          </div>
        </div>

        {/* Dynamic Line Items Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Line Items Breakdown</h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-3 items-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800"
              >
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                    Product Description *
                  </label>
                  <input
                    type="text"
                    placeholder="Item name / spec..."
                    value={item.productName}
                    onChange={(e) => handleItemChange(idx, "productName", e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    value={item.hsnCode}
                    onChange={(e) => handleItemChange(idx, "hsnCode", e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-center text-slate-900 dark:text-white"
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                    Qty *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                    Unit Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-right text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div className="col-span-10 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                    GST %
                  </label>
                  <select
                    value={item.gstPercent}
                    onChange={(e) => handleItemChange(idx, "gstPercent", e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-center text-slate-900 dark:text-white"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1 text-center pt-3">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length <= 1}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Totals & Terms Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Invoice Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Terms & Conditions
              </label>
              <textarea
                rows={3}
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" /> Summary Breakdown
            </h4>

            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-600 dark:text-slate-400">Discount (₹):</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-28 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-semibold"
              />
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-slate-600 dark:text-slate-400">Shipping Charge (₹):</span>
              <input
                type="number"
                value={shippingCharge}
                onChange={(e) => setShippingCharge(e.target.value)}
                className="w-28 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-semibold"
              />
            </div>

            <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Taxable Amount:</span>
              <span>₹{taxableAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Total Tax (GST):</span>
              <span>₹{totalTax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-base font-black text-white bg-slate-900 p-3 rounded-xl mt-2">
              <span>Grand Total:</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate("/dashboard/invoices")}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {isSubmitting ? "Generating..." : "Generate Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
