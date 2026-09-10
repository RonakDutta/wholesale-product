import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Truck } from "lucide-react";
import api from "../../utils/axios";
import { downloadFile } from "../../utils/download";
import { toast } from "sonner";

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

const FILTERS = [
  { value: "", label: "All" },
  { value: "open", label: "Not billed yet" },
  { value: "billed", label: "Billed" },
];

/**
 * Every delivery challan, so they can be found and downloaded together.
 *
 * A challan records goods sent out while payment was outstanding. It is not a
 * tax invoice and it says so on its own face; see challanService.js on the
 * server for what the document is and why the rule behind it is expected to
 * change.
 *
 * The filter is applied here rather than in the query because the list is
 * capped at a hundred rows anyway, and the two states are just "has an
 * invoice yet" and "has not".
 */
const Challans = () => {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [downloading, setDownloading] = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { data } = await api.get("/api/challans");
        if (alive) setChallans(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load delivery challans", error);
        if (alive) toast.error("Could not load your delivery challans.");
      }
      if (alive) setLoading(false);
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  const download = async (challan) => {
    setDownloading(challan.id);
    try {
      await downloadFile(
        `/api/challans/${challan.id}/pdf`,
        `${challan.challan_number}.pdf`,
      );
    } catch (err) {
      toast.error(err.message || "Could not download the challan");
    }
    setDownloading("");
  };

  const shown = challans.filter((c) => {
    if (filter === "open") return !c.invoice_id;
    if (filter === "billed") return Boolean(c.invoice_id);
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-black text-espresso">Delivery challans</h2>
        <p className="mt-1 text-sm text-slate-500">
          Goods you sent out before the money came in. A challan is not a tax
          invoice and carries no GST; the bill follows once the sale is
          settled.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              filter === f.value
                ? "bg-espresso text-cream"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
          </div>
        ) : shown.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Truck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-semibold text-espresso">
              {filter === "open"
                ? "Nothing waiting to be billed"
                : filter === "billed"
                  ? "None billed yet"
                  : "No delivery challans yet"}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              {filter
                ? "Try a different filter."
                : "Open a sale that is not fully paid and you can send the goods out on a challan from there."}
            </p>
            {!filter && (
              <Link
                to="/seller/sales"
                className="mt-5 inline-block rounded-lg bg-clay px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-espresso"
              >
                Go to sales
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {shown.map((c) => {
              const due =
                Number(c.total_value || 0) - Number(c.amount_paid || 0);
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-4 px-4 py-4 sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-espresso">
                      {c.recipient_name || "Customer"}
                    </p>
                    <p className="truncate text-xs font-medium text-slate-500">
                      {c.challan_number} · {dateLabel(c.issue_date)}
                      {c.sale_number ? ` · ${c.sale_number}` : ""}
                      {c.order_number ? ` · ${c.order_number}` : ""}
                    </p>
                  </div>

                  <span
                    className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider sm:inline ${
                      c.invoice_id
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {c.invoice_id ? "Billed" : "Not billed"}
                  </span>

                  <div className="w-28 shrink-0 text-right">
                    <p className="text-sm font-black text-espresso">
                      ₹{money(c.total_value)}
                    </p>
                    {due > 0 && (
                      <p className="text-[11px] font-bold text-clay">
                        ₹{money(due)} due
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => download(c)}
                    disabled={downloading === c.id}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {downloading === c.id ? "..." : "PDF"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Challans;
