import { useState } from "react";
import { X } from "lucide-react";
import api from "../utils/axios";
import { toast } from "sonner";
//sale feature
export const UNITS = ["pcs", "dozen", "case", "mtr", "kg", "box", "bundle"];

/**
 * Adds one line to the rate list. Only the name is required, because a
 * wholesaler typing his list from a diary should not be stopped by a field he
 * does not have to hand. The rate can be filled in later, inline on the list.
 */
const AddItemModal = ({ onClose, onAdded }) => {
  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "pcs",
    packSize: "",
    rate: "",
    moq: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter an item name.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.post("/api/items", form);
      onAdded(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not add this item.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-black text-espresso">Add item</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label
              htmlFor="item-name"
              className="mb-1.5 block text-sm font-bold text-espresso"
            >
              Item name <span className="text-clay">*</span>
            </label>
            <input
              id="item-name"
              value={form.name}
              onChange={set("name")}
              autoFocus
              placeholder="Cotton Shirting 2x2"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="item-rate"
                className="mb-1.5 block text-sm font-bold text-espresso"
              >
                Rate
              </label>
              <input
                id="item-rate"
                value={form.rate}
                onChange={set("rate")}
                inputMode="decimal"
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay"
              />
              <p className="mt-1 text-xs text-slate-500">
                Per unit. You can change it later on the list.
              </p>
            </div>
            <div>
              <label
                htmlFor="item-unit"
                className="mb-1.5 block text-sm font-bold text-espresso"
              >
                Sold by
              </label>
              <select
                id="item-unit"
                value={form.unit}
                onChange={set("unit")}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay"
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="item-pack"
                className="mb-1.5 block text-sm font-bold text-espresso"
              >
                Pack size
              </label>
              <input
                id="item-pack"
                value={form.packSize}
                onChange={set("packSize")}
                inputMode="decimal"
                placeholder="How many in one pack"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay"
              />
            </div>
            <div>
              <label
                htmlFor="item-moq"
                className="mb-1.5 block text-sm font-bold text-espresso"
              >
                Least you will sell
              </label>
              <input
                id="item-moq"
                value={form.moq}
                onChange={set("moq")}
                inputMode="decimal"
                placeholder="Smallest order"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="item-category"
              className="mb-1.5 block text-sm font-bold text-espresso"
            >
              Group
            </label>
            <input
              id="item-category"
              value={form.category}
              onChange={set("category")}
              placeholder="Shirting, Suiting, Sarees"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay"
            />
            <p className="mt-1 text-xs text-slate-500">
              Only to keep a long list tidy. Leave it empty if you like.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-clay py-2.5 text-sm font-bold text-cream transition-colors hover:bg-espresso disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;
