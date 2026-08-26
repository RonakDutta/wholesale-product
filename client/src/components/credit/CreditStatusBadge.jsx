const STYLES = {
  active: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  blocked: "bg-rose-50 text-rose-700",
  inactive: "bg-slate-100 text-slate-600",
};

const CreditStatusBadge = ({ status }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STYLES[status] || STYLES.inactive}`}
  >
    {status || "inactive"}
  </span>
);

export default CreditStatusBadge;
