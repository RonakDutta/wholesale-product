const DueDateBadge = ({ date }) => {
  if (!date) return <span className="text-slate-400">No due date</span>;
  const due = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  const label =
    days < 0
      ? `${Math.abs(days)} days overdue`
      : days === 0
        ? "Due today"
        : `Due ${due.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  return (
    <span
      className={
        days < 0
          ? "font-bold text-rose-600"
          : days === 0
            ? "font-bold text-amber-600"
            : "text-slate-600"
      }
    >
      {label}
    </span>
  );
};

export default DueDateBadge;
