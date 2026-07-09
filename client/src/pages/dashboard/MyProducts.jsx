import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  MoreVertical,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/axios";
import { toast } from "sonner";

const MyProducts = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await api.get("/api/dashboard/inventory");
        setInventory(response.data);
      } catch (error) {
        console.error("Failed to fetch inventory", error);
        toast.error("Could not load your products.");
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const handleDelete = async (inventoryId) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this listing? If you have active orders, it will be marked as 'Draft' instead of deleted.",
      )
    )
      return;

    try {
      const { data } = await api.delete(
        `/api/products/inventory/${inventoryId}`,
      );
      if (data.softDeleted) {
        setInventory((prev) =>
          prev.map((item) =>
            item.id === inventoryId ? { ...item, status: "Draft" } : item,
          ),
        );
        toast.success(data.message);
      } else {
        setInventory((prev) => prev.filter((item) => item.id !== inventoryId));
        toast.success("Listing removed successfully");
      }
    } catch (error) {
      console.error("Failed to delete", error);
      toast.error("Could not remove listing. Please try again.");
    }
  };

  const displayedInventory = inventory.filter((item) => {
    if (
      searchQuery &&
      !item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    if (filter === "Active" && item.status !== "Active") return false;
    if (filter === "Draft" && item.status !== "Draft") return false;
    if (filter === "Low Stock" && item.stock >= 50) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-clay border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          {["All", "Active", "Draft", "Low Stock"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                filter === tab
                  ? "bg-slate-100 text-espresso"
                  : "text-slate-500 hover:bg-slate-50"
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
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-clay outline-none"
          />
        </div>
      </div>

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
              {displayedInventory.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No products found.
                  </td>
                </tr>
              ) : (
                displayedInventory.map((item) => (
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
                        {item.discount_price && (
                          <span className="text-[10px] font-semibold text-clay bg-clay/10 w-fit px-1.5 rounded mt-0.5">
                            Bulk: ₹{item.discount_price}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-2 h-2 rounded-full ${item.stock > 50 ? "bg-emerald-500" : item.stock > 0 ? "bg-amber-500" : "bg-rose-500"}`}
                          ></div>
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
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Edit Button - Redirects to an edit form route */}
                        <button
                          onClick={() =>
                            navigate(`/dashboard/products/edit/${item.id}`)
                          }
                          className="p-1.5 text-slate-400 hover:text-clay hover:bg-clay/10 rounded-md transition-colors"
                          title="Edit Product"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />{" "}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyProducts;
