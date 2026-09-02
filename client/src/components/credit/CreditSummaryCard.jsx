export default function CreditSummaryCard({
  label,
  value,
  tone = "text-espresso",
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-black ${tone}`}>{value}</p>
    </div>
  );
}
