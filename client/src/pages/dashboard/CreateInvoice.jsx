import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, Trash2, ArrowLeft, Save, Users, Calculator } from "lucide-react";
import { toast } from "sonner";
import axios from "../../utils/axios";

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [buyerId, setBuyerId] = useState("");
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [defaultTaxRate, setDefaultTaxRate] = useState(18);
  const [discount, setDiscount] = useState("0");
  const [shippingCharge, setShippingCharge] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [termsConditions, setTermsConditions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState([
    {
      productName: "",
      hsnCode: "",
      quantity: 1,
      unitPrice: 0,
      gstPercent: 18,
    },
  ]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // Your saved defaults fill the form, so a manual invoice matches the
        // ones raised automatically from orders.
        const [buyersRes, settingsRes] = await Promise.all([
          axios.get("/api/invoices/buyers"),
          axios.get("/api/invoices/settings"),
        ]);

        if (cancelled) return;

        if (buyersRes.data.success) {
          const list = buyersRes.data.buyers || [];
          setBuyers(list);
          if (list.length > 0) setBuyerId(list[0].id);
        }

        if (settingsRes.data.success) {
          const s = settingsRes.data.settings;
          setDefaultTaxRate(s.defaultTaxRate);
          setNotes(s.defaultNotes || "");
          setTermsConditions(s.defaultTerms || "");
          setItems((prev) =>
            prev.map((item) => ({ ...item, gstPercent: s.defaultTaxRate })),
          );
        }
      } catch (err) {
        console.error("Failed to prepare the invoice form:", err);
        if (!cancelled) toast.error("Could not load your customers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productName: "",
        hsnCode: "",
        quantity: 1,
        unitPrice: 0,
        gstPercent: defaultTaxRate,
      },
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
      toast.error("Pick the customer this invoice is for");
      return;
    }

    if (items.some((item) => !item.productName || Number(item.quantity) <= 0)) {
      toast.error("Every line needs a name and a quantity above zero");
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
        toast.success("Invoice created");
        navigate(`/seller/invoices/${res.data.invoice.id}`);
      }
    } catch (err) {
      console.error("Create invoice error:", err);
      toast.error(
        err.response?.data?.message || "Failed to create the invoice",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
      </div>
    );
  }

  // Manual invoices go to people you already trade with, so with no customers
  // yet there is nothing sensible to select and no point showing the form.
  if (buyers.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
        <Users className="mb-3 h-10 w-10 text-espresso/15" />
        <h2 className="text-lg font-bold text-espresso">No customers yet</h2>
        <p className="mt-1 text-sm text-espresso/60">
          You can raise a manual invoice once someone has ordered from you.
          Orders generate their own invoice automatically.
        </p>
        <Link
          to="/seller/invoices"
          className="mt-5 rounded-xl bg-clay px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-espresso"
        >
          Back to invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Bar */}
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
              New invoice
            </h1>
            <p className="mt-0.5 text-sm text-espresso/60">
              For billing outside a marketplace order. The number and GST are
              worked out for you.
            </p>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Metadata Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-espresso/70 mb-1">
              Select Buyer Account *
            </label>
            <select
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-espresso focus:outline-none focus:ring-2 focus:ring-clay/20"
              required
            >
              <option value="">Select a customer</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.company_name} ({b.email})
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-400">
              People who have ordered from you
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-espresso/70 mb-1">
              Payment Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-espresso focus:ring-2 focus:ring-clay/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-espresso/70 mb-1">
              Invoice number
            </label>
            <p className="rounded-xl border border-slate-200 bg-slate-100/50 px-3.5 py-2 font-mono text-sm text-slate-500">
              Assigned on save
            </p>
            <Link
              to="/seller/invoices/settings"
              className="text-[11px] font-semibold text-clay hover:underline"
            >
              Change the prefix and defaults
            </Link>
          </div>
        </div>

        {/* Dynamic Line Items Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-espresso">
              Line Items Breakdown
            </h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 bg-clay/10 text-clay hover:bg-clay/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-3 items-center p-3 bg-slate-50 rounded-xl border border-slate-200"
              >
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                    Product Description *
                  </label>
                  <input
                    type="text"
                    placeholder="Item name / spec..."
                    value={item.productName}
                    onChange={(e) =>
                      handleItemChange(idx, "productName", e.target.value)
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-espresso"
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
                    onChange={(e) =>
                      handleItemChange(idx, "hsnCode", e.target.value)
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center text-espresso"
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
                    onChange={(e) =>
                      handleItemChange(idx, "quantity", e.target.value)
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center text-espresso"
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
                    onChange={(e) =>
                      handleItemChange(idx, "unitPrice", e.target.value)
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right text-espresso"
                    required
                  />
                </div>

                <div className="col-span-10 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                    GST %
                  </label>
                  <select
                    value={item.gstPercent}
                    onChange={(e) =>
                      handleItemChange(idx, "gstPercent", e.target.value)
                    }
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-center text-espresso"
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
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-semibold text-espresso/70 mb-1">
                Invoice Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-espresso"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-espresso/70 mb-1">
                Terms & Conditions
              </label>
              <textarea
                rows={3}
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-espresso"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3 text-xs">
            <h4 className="flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-bold text-espresso">
              <Calculator className="w-4 h-4 text-clay" /> Summary
            </h4>

            <div className="flex justify-between text-espresso/60">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-espresso/60">Discount (₹):</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-semibold"
              />
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-espresso/60">Shipping Charge (₹):</span>
              <input
                type="number"
                value={shippingCharge}
                onChange={(e) => setShippingCharge(e.target.value)}
                className="w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-semibold"
              />
            </div>

            <div className="flex justify-between font-bold text-espresso pt-2 border-t border-slate-100">
              <span>Taxable Amount:</span>
              <span>₹{taxableAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-espresso/60">
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
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate("/seller/invoices")}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-espresso/70 rounded-xl text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-clay hover:bg-espresso text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm shadow-clay/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />{" "}
            {isSubmitting ? "Generating..." : "Generate Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
