import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UploadCloud, Save } from "lucide-react";
import { toast } from "sonner";

const AddProduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
    moq: "",
    bulkPrice: "",
    bulkQuantity: "",
    stock: "",
    shippingDays: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulating API call
    setTimeout(() => {
      setLoading(false);
      toast.success("Product added successfully");
      navigate("/dashboard/products");
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/dashboard/products")}
          className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-espresso">Add New Product</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            List your inventory to the wholesale catalog.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">
            Core Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Product Name
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 focus:border-clay focus:ring-1 focus:ring-clay outline-none rounded-lg px-4 py-2.5 text-sm text-slate-900 transition-colors"
                placeholder="e.g. Premium Industrial Packaging Cartons"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Category
              </label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 focus:border-clay focus:ring-1 focus:ring-clay outline-none rounded-lg px-4 py-2.5 text-sm text-slate-900 transition-colors cursor-pointer"
              >
                <option value="">Select a category</option>
                <option value="Packaging">Packaging</option>
                <option value="Raw Materials">Raw Materials</option>
                <option value="Hardware">Hardware</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Description & Specifications
              </label>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 focus:border-clay focus:ring-1 focus:ring-clay outline-none rounded-lg px-4 py-2.5 text-sm text-slate-900 transition-colors resize-none"
                placeholder="List material, dimensions, grade, etc."
              />
            </div>
          </div>
        </div>

        {/* Pricing Matrix */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">
            B2B Pricing Matrix
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Base Price (₹ per unit)
              </label>
              <input
                type="number"
                name="price"
                required
                min="1"
                value={formData.price}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 focus:border-clay focus:ring-1 focus:ring-clay outline-none rounded-lg px-4 py-2.5 text-sm text-slate-900 transition-colors"
                placeholder="45"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Minimum Order Quantity (MOQ)
              </label>
              <input
                type="number"
                name="moq"
                required
                min="1"
                value={formData.moq}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 focus:border-clay focus:ring-1 focus:ring-clay outline-none rounded-lg px-4 py-2.5 text-sm text-slate-900 transition-colors"
                placeholder="500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-clay mb-2">
                Bulk Price (₹ per unit)
              </label>
              <input
                type="number"
                name="bulkPrice"
                min="1"
                value={formData.bulkPrice}
                onChange={handleChange}
                className="w-full bg-clay/5 border border-clay/20 focus:border-clay focus:ring-1 focus:ring-clay outline-none rounded-lg px-4 py-2.5 text-sm text-slate-900 transition-colors"
                placeholder="42"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-clay mb-2">
                Bulk Quantity Trigger
              </label>
              <input
                type="number"
                name="bulkQuantity"
                min="1"
                value={formData.bulkQuantity}
                onChange={handleChange}
                className="w-full bg-clay/5 border border-clay/20 focus:border-clay focus:ring-1 focus:ring-clay outline-none rounded-lg px-4 py-2.5 text-sm text-slate-900 transition-colors"
                placeholder="1000"
              />
            </div>
          </div>
        </div>

        {/* Logistics & Fulfillment */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">
            Logistics & Fulfillment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Current Stock Capacity
              </label>
              <input
                type="number"
                name="stock"
                required
                min="0"
                value={formData.stock}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 focus:border-clay focus:ring-1 focus:ring-clay outline-none rounded-lg px-4 py-2.5 text-sm text-slate-900 transition-colors"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Estimated Shipping (Days)
              </label>
              <input
                type="number"
                name="shippingDays"
                required
                min="1"
                value={formData.shippingDays}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 focus:border-clay focus:ring-1 focus:ring-clay outline-none rounded-lg px-4 py-2.5 text-sm text-slate-900 transition-colors"
                placeholder="5"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard/products")}
            className="px-6 py-2.5 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-clay hover:bg-espresso transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {loading ? "Saving..." : "Publish Product"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;