import { useState } from "react";
import { Plus, Search, Edit, MoreVertical, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

const mockInventory = [
  {
    id: "p1",
    name: "Premium Industrial Packaging Cartons",
    category: "Packaging",
    price: 45,
    discountPrice: 42,
    moq: 500,
    stock: 860,
    status: "Active",
    image: "https://placehold.co/100x100/e2e8f0/1e293b?text=Box",
  },
  {
    id: "p2",
    name: "Heavy Duty Corrugated Rolls",
    category: "Packaging",
    price: 120,
    discountPrice: 110,
    moq: 100,
    stock: 45, // Low stock
    status: "Active",
    image: "https://placehold.co/100x100/e2e8f0/1e293b?text=Roll",
  },
  {
    id: "p3",
    name: "Polypropylene Strapping Roll",
    category: "Hardware",
    price: 850,
    discountPrice: null,
    moq: 10,
    stock: 0,
    status: "Draft",
    image: "https://placehold.co/100x100/e2e8f0/1e293b?text=Strap",
  },
];

const MyProducts = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-espresso">My Products</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your active catalog and inventory.
          </p>
        </div>
        <Link
          to="/dashboard/products/new"
          className="flex items-center justify-center gap-2 bg-clay text-cream px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-espresso transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Product
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          {["All", "Active", "Draft", "Low Stock"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                filter === tab
                  ? "bg-slate-100 text-espresso"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-clay focus:ring-1 focus:ring-clay outline-none transition-all"
          />
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500">
                  Product
                </th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500">
                  Pricing (₹)
                </th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500">
                  Inventory
                </th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockInventory.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                      />
                      <div>
                        <p className="font-bold text-espresso text-sm max-w-50 sm:max-w-xs truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
                          {item.category}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-espresso">
                        ₹{item.price}
                      </span>
                      {item.discountPrice && (
                        <span className="text-[10px] font-semibold text-clay bg-clay/10 w-fit px-1.5 rounded mt-0.5">
                          Bulk: ₹{item.discountPrice}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        {item.stock > 100 ? (
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        ) : item.stock > 0 ? (
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        )}
                        <span
                          className={`font-bold ${item.stock === 0 ? "text-rose-600" : "text-slate-700"}`}
                        >
                          {item.stock} in stock
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        MOQ: {item.moq}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.status === "Active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.status}
                    </span>
                    {item.stock > 0 && item.stock < 50 && (
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-amber-600">
                        <AlertCircle className="w-3 h-3" /> Low Stock
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-2 text-slate-400 hover:text-clay hover:bg-clay/10 rounded-md transition-colors cursor-pointer"
                        title="Edit Product"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-slate-400 hover:text-espresso hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        title="More Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
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

export default MyProducts;
