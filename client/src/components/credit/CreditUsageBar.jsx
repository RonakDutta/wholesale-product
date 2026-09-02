export default function CreditUsageBar({ limit = 0, outstanding = 0 }) {
  const percentage =
    limit > 0 ? Math.min((Number(outstanding) / Number(limit)) * 100, 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-semibold text-slate-500">
        <span>Credit used</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${percentage >= 100 ? "bg-rose-500" : percentage >= 80 ? "bg-amber-500" : "bg-clay"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
