const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export default function CreditLedgerTable({ transactions = [] }) {
  return (
    <div className="divide-y divide-slate-100">
      {transactions.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-4 p-4 text-sm"
        >
          <div>
            <p className="font-bold capitalize text-espresso">
              {item.transaction_type.replaceAll("_", " ")}
            </p>
            <p className="text-xs text-slate-500">
              {new Date(item.created_at).toLocaleDateString("en-IN")}
              {item.due_date ? `, due ${item.due_date}` : ""}
            </p>
          </div>
          <span
            className={`font-black ${item.transaction_type === "payment_received" ? "text-emerald-700" : "text-rose-700"}`}
          >
            {item.transaction_type === "payment_received" ? "-" : ""}
            {money(item.amount)}
          </span>
        </div>
      ))}
      {transactions.length === 0 && (
        <p className="p-8 text-center text-sm text-slate-500">
          No transactions yet.
        </p>
      )}
    </div>
  );
}
