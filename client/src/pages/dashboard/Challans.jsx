import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Plus, Truck } from "lucide-react";
import api from "../../utils/axios";
import { downloadFile } from "../../utils/download";
import { toast } from "sonner";
import { rupees, dateLabel } from "../../utils/money";

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
  // Which direction. Two tabs rather than one mixed list, because goods out
  // and goods in are different documents in different runs of numbers, and
  // Marg, Tally and Busy all separate them the same way.
  const [kind, setKind] = useState("sale");
  // Which tab the rows in hand belong to. Derived rather than a setLoading in
  // the effect body: switching tab must show the spinner, not the other tab's
  // rows relabelled, and setting state synchronously in an effect is the
  // cascading-render pattern the linter rightly refuses.
  const [loadedKind, setLoadedKind] = useState(null);
  const [downloading, setDownloading] = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { data } = await api.get(`/api/challans?kind=${kind}`);
        // The kind-aware route answers { challans }, the older one a bare
        // array. Both are read, so a client ahead of its server still works.
        const rows = Array.isArray(data) ? data : data?.challans || [];
        if (alive) {
          setChallans(rows);
          setLoadedKind(kind);
        }
      } catch (error) {
        console.error("Failed to load challans", error);
        if (alive) toast.error("Could not load your challans.");
      }
      if (alive) setLoading(false);
    };
    load();
    return () => {
      alive = false;
    };
  }, [kind]);

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
    // status is the authority where the migration has run. invoice_id is the
    // fallback for a database that has not had it, where every challan is a
    // sale challan and "billed" means an invoice is attached.
    const billed = c.status ? c.status === "billed" : Boolean(c.invoice_id || c.purchase_id);
    const cancelled = c.status === "cancelled";
    if (filter === "open") return !billed && !cancelled;
    if (filter === "billed") return billed;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-espresso">Challans</h2>
          <p className="mt-1 text-sm text-slate-500">
            Goods that moved before the bill. No GST on a challan, and nothing
            is owed until you raise the bill from it.
          </p>
        </div>
        <Link
          to={`/seller/challans/new?kind=${kind}`}
          className="flex items-center gap-2 rounded-lg bg-espresso px-4 py-2.5 text-sm font-bold text-cream shadow-sm transition-colors hover:bg-clay"
        >
          <Plus className="h-4 w-4" />
          Record challan
        </Link>
      </div>

      {/* The two directions. */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { code: "sale", label: "Goods going out" },
          { code: "purchase", label: "Goods coming in" },
        ].map((k) => (
          <button
            key={k.code}
            onClick={() => setKind(k.code)}
            className={`-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
              kind === k.code
                ? "border-clay text-espresso"
                : "border-transparent text-slate-500 hover:text-espresso"
            }`}
          >
            {k.label}
          </button>
        ))}
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
        {loading || loadedKind !== kind ? (
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
                  : kind === "purchase"
                    ? "No goods-in challans yet"
                    : "No goods-out challans yet"}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              {filter
                ? "Try a different filter."
                : kind === "purchase"
                  ? "Record one when goods arrive and the supplier's bill has not."
                  : "Record one when goods leave and the bill follows after."}
            </p>
            {!filter && (
              <Link
                to={`/seller/challans/new?kind=${kind}`}
                className="mt-5 inline-block rounded-lg bg-clay px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-espresso"
              >
                Record a challan
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
                  className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-6"
                >
                  {/* The row opens the challan; the PDF button sits OUTSIDE
                      the link rather than inside it, because a button nested
                      in an anchor is both invalid and a coin toss as to which
                      one a tap lands on. */}
                  <Link
                    to={`/seller/challans/${c.id}`}
                    className="flex min-w-0 flex-1 items-center gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-espresso">
                        {c.recipient_name || "Customer"}
                      </p>
                      <p className="truncate text-xs font-medium text-slate-500">
                        {c.challan_number} · {dateLabel(c.issue_date)}
                        {c.sale_number ? ` · ${c.sale_number}` : ""}
                        {c.purchase_number ? ` · ${c.purchase_number}` : ""}
                        {c.order_number ? ` · ${c.order_number}` : ""}
                        {c.supplier_challan_number
                          ? ` · theirs ${c.supplier_challan_number}`
                          : ""}
                      </p>
                    </div>

                    <span
                      className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider sm:inline ${
                        c.status === "cancelled"
                          ? "bg-slate-100 text-slate-500"
                          : c.status === "billed" || c.invoice_id || c.purchase_id
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {c.status === "cancelled"
                        ? "Cancelled"
                        : c.status === "billed" || c.invoice_id || c.purchase_id
                          ? "Billed"
                          : "Not billed"}
                    </span>

                    <div className="w-28 shrink-0 text-right">
                      <p className="text-sm font-black text-espresso">
                        {rupees(c.total_value)}
                      </p>
                      {/* Only while it is unbilled. total_value and
                          amount_paid are frozen at the moment the challan was
                          created, so on a billed challan this figure is the
                          balance as it stood that day, not a balance. It used
                          to print "1600 due" in clay beside a green "Billed"
                          badge, which is the same row saying both things. */}
                      {due > 0 && !c.invoice_id && !c.purchase_id && (
                        <p className="text-[11px] font-bold text-clay">
                          {rupees(due)} due
                        </p>
                      )}
                    </div>
                  </Link>

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
