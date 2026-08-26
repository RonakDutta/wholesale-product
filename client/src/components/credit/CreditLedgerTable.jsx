const CreditLedgerTable = ({ transactions = [] }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
    <table className="w-full min-w-155 text-left text-sm">
      <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-4 py-3">Date</th>
          <th className="px-4 py-3">Transaction</th>
          <th className="px-4 py-3">Due</th>
          <th className="px-4 py-3 text-right">Amount</th>
          <th className="px-4 py-3 text-right">Balance</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {transactions.map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-3 text-slate-500">
              {new Date(row.created_at).toLocaleDateString("en-IN")}
            </td>
            <td className="px-4 py-3 font-semibold capitalize text-espresso">
              {row.transaction_type.replaceAll("_", " ")}
            </td>
            <td className="px-4 py-3 text-slate-500">{row.due_date || "-"}</td>
            <td
              className={`px-4 py-3 text-right font-bold ${row.transaction_type === "payment_received" || row.transaction_type === "refund" ? "text-emerald-600" : "text-espresso"}`}
            >
              ₹{Number(row.amount).toLocaleString("en-IN")}
            </td>
            <td className="px-4 py-3 text-right font-semibold text-slate-600">
              ₹{Number(row.balance_after).toLocaleString("en-IN")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {!transactions.length && (
      <p className="p-8 text-center text-sm text-slate-500">
        No credit transactions yet.
      </p>
    )}
  </div>
);

export default CreditLedgerTable;
