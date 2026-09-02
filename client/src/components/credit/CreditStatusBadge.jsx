const styles = {
  active: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  blocked: "bg-rose-100 text-rose-700",
  inactive: "bg-slate-100 text-slate-600",
};
export default function CreditStatusBadge({ status }) {
  const value = String(status || "inactive").toLowerCase();
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${styles[value] || styles.inactive}`}
    >
      {value}
    </span>
  );
}
