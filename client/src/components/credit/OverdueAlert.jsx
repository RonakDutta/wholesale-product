const OverdueAlert = ({ amount }) =>
  Number(amount) > 0 ? (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
      ₹{Number(amount).toLocaleString("en-IN")} is overdue.
    </div>
  ) : null;

export default OverdueAlert;
