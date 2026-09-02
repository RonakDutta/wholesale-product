export default function DueDateBadge({ date }) {
  if (!date) return null;
  const due = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((due - today) / 86400000);
  const label =
    days < 0
      ? `${Math.abs(days)} days overdue`
      : days === 0
        ? "Due today"
        : `Due in ${days} days`;
  const tone =
    days < 0
      ? "bg-rose-100 text-rose-700"
      : days === 0
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone}`}>
      {label}
    </span>
  );
}
