import { useState } from "react";
import { X } from "lucide-react";
import api from "../utils/axios";
import { toast } from "sonner";

/**
 * Adding a customer has to be fast, because a wholesaler will do it sixty
 * times in a row while copying from his phone. Only the name is required.
 * Everything else can be filled in later from the customer's own page.
 */
const AddPartyModal = ({ onClose, onAdded }) => {
  const [form, setForm] = useState({
    name: "",
    businessName: "",
    phone: "",
    city: "",
    gstin: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter a name.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.post("/api/parties", form);
      onAdded(data);
    } catch (error) {
      // A duplicate phone number comes back as 409 with a readable message.
      toast.error(
        error.response?.data?.message || "Could not add this customer.",
      );
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-black text-espresso">Add customer</h3>
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
              htmlFor="party-name"
              className="mb-1.5 block text-sm font-bold text-espresso"
            >
              Name <span className="text-clay">*</span>
            </label>
            <input
              id="party-name"
              value={form.name}
              onChange={set("name")}
              autoFocus
              placeholder="Ramesh Bhai"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay"
            />
            <p className="mt-1 text-xs text-slate-500">
              Whatever you call them. You can add the rest later.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="party-phone"
                className="mb-1.5 block text-sm font-bold text-espresso"
              >
                Phone
              </label>
              <input
                id="party-phone"
                value={form.phone}
                onChange={set("phone")}
                inputMode="tel"
                placeholder="98765 43210"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay"
              />
            </div>
            <div>
              <label
                htmlFor="party-city"
                className="mb-1.5 block text-sm font-bold text-espresso"
              >
                City
              </label>
              <input
                id="party-city"
                value={form.city}
                onChange={set("city")}
                placeholder="Surat"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="party-business"
              className="mb-1.5 block text-sm font-bold text-espresso"
            >
              Shop name
            </label>
            <input
              id="party-business"
              value={form.businessName}
              onChange={set("businessName")}
              placeholder="Ramesh Cloth Store"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay"
            />
          </div>

          <div>
            <label
              htmlFor="party-gstin"
              className="mb-1.5 block text-sm font-bold text-espresso"
            >
              GST number
            </label>
            <input
              id="party-gstin"
              value={form.gstin}
              onChange={set("gstin")}
              placeholder="24AAAAA0000A1Z5"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm uppercase outline-none transition-colors focus:border-clay"
            />
            <p className="mt-1 text-xs text-slate-500">
              Needed on their bill so they can claim input credit. Add it when
              you have it.
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
              {saving ? "Saving..." : "Add customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPartyModal;
