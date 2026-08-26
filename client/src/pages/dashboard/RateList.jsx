import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Search, Trash2 } from "lucide-react";
import api from "../../utils/axios";
import { toast } from "sonner";
import AddItemModal from "../../components/AddItemModal";

// Trailing zeros on a pack size read badly: 20.000 should show as 20.
const trim = (value) =>
  value === null || value === undefined || value === ""
    ? ""
    : String(Number(value));

/**
 * The rate a wholesaler charges, editable where it is shown. Updating prices
 * is something he does across many items at once, so making him open a form
 * per item would make the screen useless. The input saves on blur, and only
 * when the number actually changed.
 */
const RateCell = ({ item, onSaved }) => {
  const [value, setValue] = useState(String(Number(item.rate)));
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const next = value.trim();
    if (next === "" || Number(next) === Number(item.rate)) {
      setValue(String(Number(item.rate)));
      return;
    }
    if (!Number.isFinite(Number(next)) || Number(next) < 0) {
      toast.error("Enter a valid rate.");
      setValue(String(Number(item.rate)));
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.put(`/api/items/${item.id}`, { rate: next });
      onSaved(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save the rate.");
      setValue(String(Number(item.rate)));
    }
    setSaving(false);
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <span className="text-sm text-slate-400">₹</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setValue(String(Number(item.rate)));
            e.currentTarget.blur();
          }
        }}
        disabled={saving}
        inputMode="decimal"
        aria-label={`Rate for ${item.name}`}
        className="w-24 rounded-lg border border-transparent bg-slate-50 px-2 py-1.5 text-right text-sm font-bold text-espresso outline-none transition-colors hover:border-slate-200 focus:border-clay focus:bg-white disabled:opacity-50"
      />
    </div>
  );
};

const RateList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { data } = await api.get("/api/items");
        if (alive) setItems(data || []);
      } catch (error) {
        console.error("Failed to load the rate list", error);
        if (alive) toast.error("Could not load your rate list.");
      }
      if (alive) setLoading(false);
    };
    load();
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [item.name, item.category]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term)),
    );
  }, [items, search]);

  const replaceItem = (updated) =>
    setItems((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );

  const handleDelete = async (item) => {
    setItems((prev) => prev.filter((row) => row.id !== item.id));
    try {
      await api.delete(`/api/items/${item.id}`);
      toast.success(`${item.name} removed.`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not remove it.");
      // Put it back rather than leaving the screen lying about what is stored.
      setRefreshKey((key) => key + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-espresso">Rate list</h2>
          <p className="mt-1 text-sm text-slate-500">
            What you sell and what you charge. Only you can see this.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-espresso px-4 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-clay"
        >
          <Plus className="h-4 w-4" />
          Add item
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your items"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-clay"
            />
          </div>
          <p className="text-xs font-semibold text-slate-400">
            {visible.length} of {items.length}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-semibold text-espresso">
              Your rate list is empty
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Put in what you sell and your rate for it. Once it is here you
              will not have to type the rate again on every sale.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-5 rounded-lg bg-clay px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-espresso"
            >
              Add your first item
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm text-slate-500">
              Nothing matches "{search}".
            </p>
          </div>
        ) : (
          <>
            {/* Phone: stacked rows. As a table this scrolled sideways and put
                the rate off screen, which is the one number he came to see. */}
            <ul className="divide-y divide-slate-100 sm:hidden">
              {visible.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 font-bold text-espresso">
                      {item.name}
                    </p>
                    <RateCell item={item} onSaved={replaceItem} />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-[11px] font-semibold text-slate-400">
                      {[
                        item.category,
                        item.pack_size
                          ? `${item.unit} · pack of ${trim(item.pack_size)}`
                          : item.unit,
                        item.moq ? `min ${trim(item.moq)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <button
                      onClick={() => handleDelete(item)}
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Item
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Sold by
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Min qty
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Rate
                    </th>
                    <th className="w-12 px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-50/60">
                      <td className="px-6 py-3">
                        <p className="font-bold text-espresso">{item.name}</p>
                        {item.category && (
                          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            {item.category}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                        {item.unit}
                        {item.pack_size ? (
                          <span className="text-slate-400">
                            {" "}
                            · pack of {trim(item.pack_size)}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-slate-600">
                        {item.moq ? `${trim(item.moq)} ${item.unit}` : "-"}
                      </td>
                      <td className="px-3 py-3">
                        <RateCell item={item} onSaved={replaceItem} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => handleDelete(item)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 lg:opacity-0 lg:group-hover:opacity-100"
                          title={`Remove ${item.name}`}
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {items.length > 0 && (
        <p className="text-xs text-slate-500">
          Tap a rate to change it. It saves as soon as you move away.
        </p>
      )}

      {showAdd && (
        <AddItemModal
          onClose={() => setShowAdd(false)}
          onAdded={(item) => {
            setShowAdd(false);
            toast.success(`${item.name} added.`);
            setRefreshKey((key) => key + 1);
          }}
        />
      )}
    </div>
  );
};

export default RateList;
