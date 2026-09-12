import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Hash,
  LayoutGrid,
  MapPin,
  Percent,
  Ruler,
  ShieldCheck,
} from "lucide-react";
import api from "../utils/axios";
import Wordmark from "../components/Wordmark";

/**
 * The master dashboard: the platform's own lists, not any wholesaler's.
 *
 * A separate area rather than a page inside the seller workspace, for three
 * reasons that all point the same way:
 *
 *   /seller/* is guarded by RequireRole seller|both, so a Master screen living
 *   inside it would be unreachable to a platform admin who does not also sell.
 *   That is fine today and stops being fine the moment there is an admin with
 *   no shop.
 *
 *   CLAUDE.md already says the seller dashboard is for wholesalers and buyer
 *   concepts do not go on it. Platform administration is not a wholesaler
 *   concept either.
 *
 *   They are different jobs. One is running a shop; this is CRUD over lists
 *   that shape documents across every shop.
 *
 * WHAT IS NOT HERE, deliberately: a wholesaler's invoice prefix, his due days,
 * his default tax rate, his terms. Those are his and they stay on his own
 * settings screen. Moving them here would mean one wholesaler changing his
 * prefix changed everybody's. What belongs here is the layer above them: the
 * Rule 46(b) constraints, the defaults a new wholesaler starts from, the
 * number formatting. Those come later, and deliberately after the money()
 * helpers are collapsed, or a setting lands that half the product ignores.
 */

const LINKS = [
  { to: "/master", end: true, label: "Overview", icon: LayoutGrid },
  { to: "/master/states", label: "States", icon: MapPin },
  { to: "/master/units", label: "Units", icon: Ruler },
  { to: "/master/tax-rates", label: "Tax rates", icon: Percent },
  { to: "/master/hsn", label: "HSN codes", icon: Hash },
];

/**
 * The client side guard.
 *
 * A closed door, not a locked one. Every write sits behind the server's
 * requirePlatformAdmin, which reads the flag from the database on the request;
 * this only decides whether to draw the screens. Anyone who forged their way
 * past it would find every button returning 403.
 */
const MasterLayout = () => {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, allowed: false, fromMasters: false });

  useEffect(() => {
    let alive = true;
    api
      .get("/api/masters")
      .then(({ data }) => {
        if (alive) {
          setState({
            loading: false,
            allowed: Boolean(data?.isPlatformAdmin),
            fromMasters: Boolean(data?.fromMasters),
          });
        }
      })
      .catch(() => alive && setState({ loading: false, allowed: false, fromMasters: false }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
      </div>
    );
  }

  if (!state.allowed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <ShieldCheck className="mb-4 h-10 w-10 text-slate-300" />
        <h1 className="text-xl font-black text-espresso">This is the platform admin area</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your account does not have platform admin on it. Whoever runs the
          platform can switch it on for you.
        </p>
        <button
          onClick={() => navigate("/seller")}
          className="mt-6 rounded-lg bg-clay px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-espresso"
        >
          Back to my shop
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col bg-espresso text-cream lg:flex">
        <div className="px-6 py-6">
          <Wordmark />
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cream/50">
            Platform master
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
                  isActive ? "bg-clay text-cream" : "text-cream/70 hover:bg-cream/10"
                }`
              }
            >
              <link.icon className="h-4 w-4 shrink-0" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-cream/10 px-3 py-4">
          <Link
            to="/seller"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-cream/70 transition-colors hover:bg-cream/10"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back to my shop
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* The phone nav. The master screens are lists a person edits sitting
            down, so this is a way across rather than a full second nav. */}
        <div className="flex gap-2 overflow-x-auto bg-espresso px-4 py-3 lg:hidden">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold ${
                  isActive ? "bg-clay text-cream" : "text-cream/70"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Says plainly when the tables are not there, because every screen
            below would otherwise show the built in list and look editable
            while nothing saved. */}
        {!state.fromMasters && (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-3">
            <p className="text-sm font-bold text-amber-900">
              The master tables are not in this database yet
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              What you see below is the built in list the product falls back to.
              Run wholesale3_platform_masters.sql to make these editable.
            </p>
          </div>
        )}

        <main className="px-4 py-6 sm:px-8">
          <Outlet context={{ fromMasters: state.fromMasters }} />
        </main>
      </div>
    </div>
  );
};

export default MasterLayout;
