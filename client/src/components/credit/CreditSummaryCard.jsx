const CreditSummaryCard = ({ label, value, tone = "text-espresso" }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className={`mt-2 text-2xl font-black ${tone}`}>
      ₹{Number(value || 0).toLocaleString("en-IN")}
    </p>
  </div>
);

export default CreditSummaryCard;
