import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowRight, Hash, MapPin, Percent, Ruler } from "lucide-react";
import api from "../../utils/axios";

/**
 * What the master dashboard holds, and what it does not.
 *
 * Written as a screen rather than left to a README because the platform and
 * wholesaler split is the thing most likely to be got wrong here: somebody
 * looking for "invoice settings" will look in this area first, and should be
 * told plainly why they are not here.
 */

const CARDS = [
  {
    to: "/master/states",
    field: "states",
    icon: MapPin,
    title: "States",
    note: "The two digit code that decides CGST plus SGST against IGST.",
  },
  {
    to: "/master/units",
    field: "units",
    icon: Ruler,
    title: "Units",
    note: "Metre, kilogram, bale. How goods are counted on a bill.",
  },
  {
    to: "/master/tax-rates",
    field: "taxRates",
    icon: Percent,
    title: "Tax rates",
    note: "The GST slabs a wholesaler may pick from.",
  },
  {
    to: "/master/hsn",
    field: "hsn",
    icon: Hash,
    title: "HSN codes",
    note: "What the goods are. Codes and descriptions, never a rate.",
  },
];

const MasterOverview = () => {
  const { fromMasters } = useOutletContext() || {};
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .get("/api/masters")
      .then(({ data }) => {
        if (!alive) return;
        setCounts({
          states: data?.states?.length ?? 0,
          units: data?.units?.length ?? 0,
          taxRates: data?.taxRates?.length ?? 0,
          hsn: data?.hsn?.length ?? 0,
        });
      })
      .catch(() => alive && setCounts(null));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-black text-espresso">Platform master</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          The lists every wholesaler on the platform picks from. They were
          constants in the code until now, so correcting one meant a deploy.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-clay"
          >
            <div className="flex items-start justify-between gap-3">
              <card.icon className="h-5 w-5 shrink-0 text-clay" />
              <span className="text-2xl font-black text-espresso">
                {counts ? counts[card.field] : "-"}
              </span>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-espresso">
              {card.title}
              <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5" />
            </p>
            <p className="mt-1 text-xs text-slate-500">{card.note}</p>
          </Link>
        ))}
      </div>

      {/* The split that is easiest to get wrong, said plainly. */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          What is not here
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          A wholesaler's invoice prefix, his payment due days, his default GST
          rate, his terms and his bank details are <strong>his</strong>, and
          they stay on his own Invoice defaults screen. If they lived here, one
          wholesaler changing his prefix would change everybody's.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          What belongs here is the layer above them: the Rule 46(b) limits every
          invoice number has to obey, the shape a brand new wholesaler starts
          from, and number formatting. Those are still to build.
        </p>
      </div>

      {fromMasters && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            One limit worth knowing
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Adding a state here fills the dropdowns, but it does{" "}
            <strong>not</strong> yet change how tax is worked out for it. The
            code that turns a state name into its GST code still reads a built
            in list, on the path that decides CGST plus SGST against IGST.
            Moving that is its own change.
          </p>
        </div>
      )}
    </div>
  );
};

export default MasterOverview;
