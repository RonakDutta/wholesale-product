const CreditUsageBar = ({ limit, outstanding }) => {
  const percentage = Math.min(
    100,
    Math.max(
      0,
      Number(limit) > 0 ? (Number(outstanding || 0) / Number(limit)) * 100 : 0,
    ),
  );
  const color =
    percentage >= 100
      ? "bg-rose-500"
      : percentage >= 80
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
        <span>Credit used</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default CreditUsageBar;
