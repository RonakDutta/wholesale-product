import {
  Package,
  ShoppingBag,
  MessageSquare,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";

// Mock data
const supplierData = {
  name: "Apex Traders",
  verified: false,
  responseRate: "98%",
  trustScore: "87%",
  completedOrders: 920,
  totalProducts: 310,
};

const recentOrders = [
  {
    id: "ORD-9021",
    product: "Premium Industrial Packaging Cartons",
    qty: 2500,
    amount: 105000,
    status: "Processing",
    date: "2 hours ago",
  },
  {
    id: "ORD-9020",
    product: "Heavy Duty Corrugated Rolls",
    qty: 300,
    amount: 33000,
    status: "Shipped",
    date: "5 hours ago",
  },
  {
    id: "ORD-9019",
    product: "Standard Shipping Boxes",
    qty: 1000,
    amount: 28000,
    status: "Delivered",
    date: "1 day ago",
  },
];

const DashboardOverview = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Verification Banner */}
      {!supplierData.verified && (
        <div className="bg-linear-to-r from-clay/10 to-sage/10 border border-clay/20 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-clay/20">
              <ShieldAlert className="w-5 h-5 text-clay" />
            </div>
            <div>
              <h3 className="text-base font-bold text-espresso">
                Unlock Trust Badge & More Buyers
              </h3>
              <p className="text-sm text-slate-600 mt-1 max-w-xl">
                Verified suppliers get 3x more inquiries. Submit your GST and
                business details to receive the "Verified Supplier" badge.
              </p>
            </div>
          </div>
          <button className="bg-clay text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-espresso transition-colors shrink-0 w-full sm:w-auto cursor-pointer">
            Get Verified Now
          </button>
        </div>
      )}

      {/* Key Metrics */}
      <div>
        <h2 className="text-lg font-bold text-espresso mb-4">
          Performance Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            {
              label: "Total Products",
              value: supplierData.totalProducts,
              icon: Package,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Completed Orders",
              value: supplierData.completedOrders,
              icon: ShoppingBag,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: "Response Rate",
              value: supplierData.responseRate,
              icon: MessageSquare,
              color: "text-violet-600",
              bg: "bg-violet-50",
            },
            {
              label: "Trust Score",
              value: supplierData.trustScore,
              icon: TrendingUp,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center"
            >
              <div className="flex justify-between items-start mb-4">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.bg}`}
                >
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <h4 className="text-2xl font-black text-espresso">
                {stat.value}
              </h4>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-espresso">Recent Orders</h2>
          <button className="text-sm font-semibold text-clay hover:text-espresso flex items-center gap-1 transition-colors cursor-pointer">
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500">
                  Order ID
                </th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500">
                  Product
                </th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500">
                  Amount
                </th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 text-right">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4 font-mono font-bold text-espresso">
                    {order.id}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700 max-w-62.5 truncate">
                      {order.product}
                    </p>
                    <p className="text-xs text-slate-500">{order.qty} units</p>
                  </td>
                  <td className="px-6 py-4 font-bold text-clay">
                    ₹{order.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        order.status === "Delivered"
                          ? "bg-emerald-100 text-emerald-700"
                          : order.status === "Shipped"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-slate-500 flex items-center justify-end gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {order.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
