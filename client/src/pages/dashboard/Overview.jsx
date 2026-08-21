import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Package,
  Phone,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import api from "../../utils/axios";
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
      })
    : "";

const sinceLabel = (value) => {
  if (!value) return "";
  const days = Math.floor(
    (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
};

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  confirmed: "bg-sky-50 text-sky-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
};

const MoneyCard = ({ label, value, hint, tone = "espresso" }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5">
    <p className="text-[11px] font-semibold leading-tight text-slate-500 sm:text-sm">
      {label}
    </p>
    <p
      className={`mt-1 text-lg font-black sm:text-2xl ${
        tone === "amber" ? "text-amber-600" : "text-espresso"
      }`}
    >
      ₹{money(value)}
    </p>
    <p className="mt-1 hidden text-xs font-medium text-slate-500 sm:block">
      {hint}
    </p>
  </div>
);

const Panel = ({ icon: Icon, title, subtitle, action, children }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
          <Icon className="h-4 w-4 shrink-0 text-slate-400" />
          {title}
        </h3>
        {/* A panel title alone does not say what would appear in it. The
            subtitle does, so an empty panel still explains itself. */}
        {subtitle && (
          <p className="mt-0.5 pl-6 text-xs font-medium text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const Empty = ({ children }) => (
  <p className="px-5 py-10 text-center text-sm text-slate-500">{children}</p>
);

/**
 * The wholesaler's first screen. Built around what needs doing rather than
 * what has happened, and every number on it is counted from his own rows. The
 * marketplace dashboard this replaces showed a buyer rating and a listing
 * count, neither of which describes this product.
 */
const Overview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await api.get("/api/overview");
        if (alive) setData(res.data);
      } catch (error) {
        console.error("Failed to load the overview", error);
        if (alive) toast.error("Could not load your overview.");
      }
      if (alive) setLoading(false);
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="font-semibold text-espresso">
          Could not load your overview
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Reload the page and it should come back.
        </p>
      </div>
    );
  }

  const { money: m, counts, toDeliver, topDues, quiet, recentSales } = data;

  // While any of these is missing the app cannot do much, so setup comes
  // before the numbers. A wall of zeroes teaches a new wholesaler nothing.
  const steps = [
    {
      done: counts.parties > 0,
      label: "Add the shops you sell to",
      to: "/seller/customers",
    },
    {
      done: counts.items > 0,
      label: "Put in what you sell and your rates",
      to: "/seller/rates",
    },
    {
      done: recentSales.length > 0,
      label: "Record your first sale",
      to: "/seller/sales/new",
    },
  ];
  const setupDone = steps.every((step) => step.done);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* No Record a sale button here. The workspace header carries one on
          every screen, and two of them side by side on this one looked like
          a mistake. */}
      <div>
        <h2 className="text-2xl font-black text-espresso">Overview</h2>
        <p className="mt-1 text-sm text-slate-500">
          {counts.salesThisMonth === 0
            ? "No sales recorded this month yet."
            : `${counts.salesThisMonth} ${
                counts.salesThisMonth === 1 ? "sale" : "sales"
              } recorded this month.`}
        </p>
      </div>

      {!setupDone && (
        <div className="rounded-2xl border border-clay/20 bg-clay/5 p-5">
          <h3 className="text-sm font-bold text-espresso">
            Three things to get going
          </h3>
          <ul className="mt-3 space-y-2">
            {steps.map((step) => (
              <li key={step.label}>
                <Link
                  to={step.to}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/60"
                >
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                  )}
                  <span
                    className={`flex-1 text-sm ${
                      step.done
                        ? "font-medium text-slate-400 line-through"
                        : "font-semibold text-espresso"
                    }`}
                  >
                    {step.label}
                  </span>
                  {!step.done && (
                    <ArrowRight className="h-4 w-4 shrink-0 text-clay" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <MoneyCard
          label="Still to collect"
          value={m.outstanding}
          hint="Billed minus received, all time"
          tone={m.outstanding > 0 ? "amber" : "espresso"}
        />
        <MoneyCard
          label="Billed this month"
          value={m.billedThisMonth}
          hint="Confirmed and delivered sales"
        />
        <MoneyCard
          label="Received this month"
          value={m.receivedThisMonth}
          hint="Money that came in"
        />
      </div>

      {/* items-start so a short panel does not stretch to match a tall one. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel
          icon={Truck}
          title="Still to send out"
          subtitle="Confirmed but not marked delivered"
          action={
            <Link
              to="/seller/sales"
              className="text-xs font-bold text-clay hover:underline"
            >
              All sales
            </Link>
          }
        >
          {toDeliver.length === 0 ? (
            <Empty>Nothing is waiting to go out.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {toDeliver.map((sale) => (
                <li key={sale.id}>
                  <Link
                    to={`/seller/sales/${sale.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-espresso">
                        {sale.party_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {sale.sale_number} · {dateLabel(sale.sale_date)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-espresso">
                      ₹{money(sale.total)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          icon={Wallet}
          title="Who owes you"
          subtitle="Billed to them, not yet received"
          action={
            <Link
              to="/seller/customers"
              className="text-xs font-bold text-clay hover:underline"
            >
              All customers
            </Link>
          }
        >
          {topDues.length === 0 ? (
            <Empty>
              {counts.parties === 0
                ? "Nobody owes you anything yet."
                : "Nobody owes you anything right now."}
            </Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {topDues.map((party) => (
                <li key={party.id}>
                  <Link
                    to={`/seller/customers/${party.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-espresso">
                        {party.name}
                      </p>
                      {party.business_name && (
                        <p className="truncate text-xs text-slate-500">
                          {party.business_name}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-black text-amber-600">
                      ₹{money(party.outstanding)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* items-start so a short panel does not stretch to match a tall one. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel
          icon={Clock}
          title="Have gone quiet"
          subtitle={`Used to buy, nothing for ${data.quietAfterDays} days`}
        >
          {quiet.length === 0 ? (
            <Empty>
              {/* "Everyone has bought recently" is untrue of an account with
                  nobody in it, so what this says depends on how far along he
                  actually is. */}
              {counts.parties === 0
                ? "Once you add customers, anyone who stops buying shows up here to chase."
                : recentSales.length === 0
                  ? "Once you record sales, anyone who stops buying shows up here to chase."
                  : `Nobody has gone quiet. Customers with no sale for ${data.quietAfterDays} days appear here.`}
            </Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {quiet.map((party) => {
                const digits = String(party.phone || "").replace(/\D/g, "");
                return (
                  <li
                    key={party.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <Link
                      to={`/seller/customers/${party.id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm font-bold text-espresso">
                        {party.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Last bought {sinceLabel(party.sale_date)}
                      </p>
                    </Link>
                    {digits && (
                      <a
                        href={`tel:${party.phone}`}
                        className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-clay"
                        aria-label={`Call ${party.name}`}
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel icon={Package} title="Latest sales" subtitle="Newest first">
          {recentSales.length === 0 ? (
            <Empty>Nothing recorded yet.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentSales.map((sale) => (
                <li key={sale.id}>
                  <Link
                    to={`/seller/sales/${sale.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-espresso">
                        {sale.party_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {sale.sale_number} · {dateLabel(sale.sale_date)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`hidden rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:inline ${
                          STATUS_STYLES[sale.status] || STATUS_STYLES.draft
                        }`}
                      >
                        {sale.status}
                      </span>
                      <p className="text-sm font-black text-espresso">
                        ₹{money(sale.total)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Users className="h-3.5 w-3.5" />
        {counts.parties} {counts.parties === 1 ? "customer" : "customers"} and{" "}
        {counts.items} {counts.items === 1 ? "item" : "items"} on your rate
        list.
      </p>
    </div>
  );
};

export default Overview;
