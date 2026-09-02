import { useState } from "react";
import { X } from "lucide-react";
import api from "../utils/axios";
import { toast } from "sonner";
import { gstinFeedback } from "../utils/gstin";

/**
 * Adds a customer or edits one. The same form does both, because the fields
 * are identical and keeping two copies is how they drift apart.
 *
 * Only the name is required. Somebody typing sixty customers out of his phone
 * should not be stopped by a field he does not have in front of him, and the
 * rest can be filled in later from the customer's own page.
 */
const PartyFormModal = ({ party, onClose, onSaved }) => {
  const editing = Boolean(party);

  const [form, setForm] = useState({
    name: party?.name || "",
    businessName: party?.business_name || "",
    phone: party?.phone || "",
    city: party?.city || "",
    gstin: party?.gstin || "",
    address: party?.address || "",
    notes: party?.notes || "",
  });
  const [status, setStatus] = useState(party?.status || "active");
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const gst = gstinFeedback(form.gstin);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter a name.");
      return;
    }
    // A half typed number counts as wrong at this point: he pressed save.
    if (form.gstin.trim() && gst.state !== "good") {
      toast.error("Please check the GST number, or clear it.");
      return;
    }

    setSaving(true);
    try {
      // Every field is sent on an edit, including the empty ones, because
      // emptying a box is how a wrong phone number gets removed.
      const { data } = editing
        ? await api.put(`/api/parties/${party.id}`, { ...form, status })
        : await api.post("/api/parties", form);
      onSaved(data);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          (editing ? "Could not save changes." : "Could not add this customer."),
      );
      setSaving(false);
    }
  };

  const field = (id, label, props = {}) => (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-bold text-espresso"
      >
        {label}
      </label>
      <input
        id={id}
        value={form[props.name]}
        onChange={set(props.name)}
        placeholder={props.placeholder}
        inputMode={props.inputMode}
        className={`w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay ${
          props.uppercase ? "uppercase" : ""
        }`}
      />
      {props.hint && (
        <p className="mt-1 text-xs text-slate-500">{props.hint}</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-black text-espresso">
            {editing ? "Edit customer" : "Add customer"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
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
              autoFocus={!editing}
              placeholder="Ramesh Bhai"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay"
            />
            <p className="mt-1 text-xs text-slate-500">
              Whatever you call them.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {field("party-phone", "Phone", {
              name: "phone",
              placeholder: "98765 43210",
              inputMode: "tel",
            })}
            {field("party-city", "City", {
              name: "city",
              placeholder: "Surat",
            })}
          </div>

          {field("party-business", "Shop name", {
            name: "businessName",
            placeholder: "Ramesh Cloth Store",
          })}

          {/* Checked as it is typed. The number carries its own check
              digit, so a mistyped one can be caught here with nothing to
              call and nothing to pay for. The server checks it again. */}
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
              placeholder="24AAACC1206D1ZM"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm uppercase outline-none transition-colors ${
                gst.state === "bad"
                  ? "border-rose-300 focus:border-rose-400"
                  : "border-slate-200 focus:border-clay"
              }`}
            />
            <p
              className={`mt-1 text-xs ${
                gst.state === "bad"
                  ? "text-rose-600"
                  : gst.state === "good"
                    ? "text-emerald-700"
                    : "text-slate-500"
              }`}
            >
              {gst.state === "good"
                ? `Looks right. Registered in ${gst.stateName}.`
                : gst.state === "bad" || gst.state === "typing"
                  ? gst.message
                  : "Leave blank if they are not registered. Goes on their bill so they can claim input credit."}
            </p>
          </div>

          {field("party-address", "Address", {
            name: "address",
            placeholder: "Shop number, street, area",
          })}

          <div>
            <label
              htmlFor="party-notes"
              className="mb-1.5 block text-sm font-bold text-espresso"
            >
              Private note
            </label>
            <textarea
              id="party-notes"
              value={form.notes}
              onChange={set("notes")}
              rows={2}
              placeholder="Pays on the 5th, deliver before 11"
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-clay"
            />
            <p className="mt-1 text-xs text-slate-500">
              Only you can see this. It never appears on a bill.
            </p>
          </div>

          {editing && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={status === "inactive"}
                  onChange={(e) =>
                    setStatus(e.target.checked ? "inactive" : "active")
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-clay"
                />
                <span>
                  <span className="block text-sm font-bold text-espresso">
                    Not dealing with them any more
                  </span>
                  {/* Not a delete. Their sales and bills have to stay. */}
                  <span className="block text-xs text-slate-500">
                    Hides them from your customer list. Everything you have
                    sold them stays exactly as it is.
                  </span>
                </span>
              </label>
            </div>
          )}

          </div>

          <div className="flex shrink-0 gap-3 border-t border-slate-100 bg-white px-6 py-4">
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
              {saving
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : "Add customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PartyFormModal;
