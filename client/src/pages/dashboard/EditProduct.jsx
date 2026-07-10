import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, UploadCloud, Save, X } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/axios";

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [productInfo, setProductInfo] = useState(null);
  const [formData, setFormData] = useState({
    price: "",
    moq: "",
    bulkPrice: "",
    stock: "",
    shippingDays: "",
    status: "Active",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState(null);

  // Fetch the existing inventory item
  useEffect(() => {
    const fetchItem = async () => {
      try {
        const { data } = await api.get(`/api/products/inventory/${id}`);

        setProductInfo({
          name: data.name,
          category: data.category,
          description: data.description,
          globalImage: data.global_image_url,
        });

        setFormData({
          price: data.price,
          moq: data.moq,
          bulkPrice: data.discount_price || "",
          stock: data.stock,
          shippingDays: data.shipping_days,
          status: data.status,
        });

        setExistingImage(data.image_url);
        setImagePreview(data.image_url);
      } catch (err) {
        console.error(err);
        toast.error("Could not load product details.");
        navigate("/dashboard/products");
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!imageFile) return existingImage;
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", imageFile);
      data.append(
        "upload_preset",
        import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
      );

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: data },
      );

      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      return json.secure_url;
    } catch (err) {
      console.error(err);
      toast.error("Image upload failed");
      return existingImage;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const imageUrl = await uploadImage();

    try {
      const payload = {
        price: Number(formData.price),
        bulkPrice: formData.bulkPrice ? Number(formData.bulkPrice) : null,
        moq: Number(formData.moq),
        stock: Number(formData.stock),
        shippingDays: Number(formData.shippingDays),
        status: formData.status,
        imageUrl: imageUrl,
      };

      await api.put(`/api/products/inventory/${id}`, payload);
      toast.success("Listing updated successfully");
      navigate("/dashboard/products");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-clay border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/dashboard/products")}
          className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-espresso">Edit Listing</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Update your pricing, stock, or status for this product.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Read-Only Global Product Info */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
            <img
              src={productInfo.globalImage}
              alt={productInfo.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{productInfo.name}</h3>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">
              {productInfo.category}
            </p>
          </div>
        </div>

        {/* Listing Status & Image */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">
              Listing Status
            </h3>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Visibility
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 focus:border-clay outline-none rounded-lg px-4 py-2.5 text-sm text-slate-900"
            >
              <option value="Active">Active (Visible to buyers)</option>
              <option value="Draft">Draft (Hidden from marketplace)</option>
            </select>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">
              Your Stock Photo
            </h3>
            {imagePreview ? (
              <div className="relative w-32 h-32">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-xl border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 hover:text-rose-500 shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-4 cursor-pointer hover:border-clay w-32 h-32">
                <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-[10px] font-medium text-slate-600 text-center">
                  Change Photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Pricing Matrix */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">
            B2B Pricing & Logistics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Base Price (₹ / unit)
              </label>
              <input
                type="number"
                name="price"
                required
                min="1"
                value={formData.price}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 focus:border-clay outline-none rounded-lg px-4 py-2.5 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Minimum Order Quantity
              </label>
              <input
                type="number"
                name="moq"
                required
                min="1"
                value={formData.moq}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 focus:border-clay outline-none rounded-lg px-4 py-2.5 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-clay mb-2">
                Bulk Discount Price (₹)
              </label>
              <input
                type="number"
                name="bulkPrice"
                min="1"
                value={formData.bulkPrice}
                onChange={handleChange}
                className="w-full bg-clay/5 border border-clay/20 focus:border-clay outline-none rounded-lg px-4 py-2.5 text-sm text-slate-900"
                placeholder="Optional"
              />
            </div>
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
                className="w-full bg-slate-50 border border-slate-200 focus:border-clay outline-none rounded-lg px-4 py-2.5 text-sm text-slate-900"
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
                className="w-full bg-slate-50 border border-slate-200 focus:border-clay outline-none rounded-lg px-4 py-2.5 text-sm text-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard/products")}
            className="px-6 py-2.5 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-clay hover:bg-espresso transition-colors disabled:opacity-70"
          >
            <Save className="w-4 h-4" />
            {saving || uploading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProduct;
