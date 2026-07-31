import { useState, useEffect } from "react";
import LocationPicker from "../../components/LocationPicker";
import {
  Building2,
  ShieldCheck,
  Mail,
  MapPin,
  CreditCard,
  Save,
  ShieldAlert,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/axios";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    contactPhone: "",
    email: "", // Read-only from users table
    gstin: "",
    upiId: "",
    city: "",
    country: "India",
    isVerified: false,
    warehouseAddress: "",
    warehouseCity: "",
    warehouseState: "",
    warehousePincode: "",
  });
  // Exact dispatch point. Set once here rather than per product, because the
  // warehouse belongs to the business, not to any single listing.
  const [warehousePin, setWarehousePin] = useState(null);

  // Fetch current profile on load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/profile");
        const data = res.data;
        setFormData({
          companyName: data.company_name || "",
          contactPhone: data.contact_phone || "",
          email: data.email || "",
          gstin: data.gstin || "",
          upiId: data.upi_id || "",
          city: data.city || "",
          country: data.country || "India",
          isVerified: data.is_verified || false,
          warehouseAddress: data.warehouse_address || "",
          warehouseCity: data.warehouse_city || "",
          warehouseState: data.warehouse_state || "",
          warehousePincode: data.warehouse_pincode || "",
        });
        if (data.lat != null && data.lng != null) {
          setWarehousePin({ lat: Number(data.lat), lng: Number(data.lng) });
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/api/profile", {
        ...formData,
        warehouseLat: warehousePin?.lat,
        warehouseLng: warehousePin?.lng,
      });
      toast.success("Profile saved successfully! You are ready to sell.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-clay border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-espresso">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage your business profile and preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Verification Status */}
        <div
          className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${formData.isVerified ? "border-emerald-200" : "border-rose-200"}`}
        >
          <div
            className={`p-5 border-b border-slate-100 flex items-center justify-between ${formData.isVerified ? "bg-emerald-50" : "bg-rose-50"}`}
          >
            <div className="flex items-center gap-3">
              {formData.isVerified ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-500" />
              )}
              <h3
                className={`font-bold ${formData.isVerified ? "text-emerald-900" : "text-rose-900"}`}
              >
                {formData.isVerified
                  ? "Verified Supplier"
                  : "Verification Pending"}
              </h3>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-5">
              Verified accounts receive up to 3x more wholesale inquiries.
              Ensure your GSTIN is accurate.
            </p>
            <div className="max-w-md border border-slate-200 rounded-lg p-4 bg-slate-50">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                GSTIN Number
              </label>
              <input
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="e.g. 22AAAAA0000A1Z5"
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-clay"
              />
            </div>
          </div>
        </div>

        {/* Business Profile */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <Building2 className="w-5 h-5 text-slate-500" />
            <h3 className="font-bold text-espresso">
              Business Profile (Required for Listing)
            </h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Your Business Name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:border-clay focus:bg-white outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Contact Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:border-clay focus:bg-white outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  City Location <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Delhi, Ahmedabad"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:border-clay focus:bg-white outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment & Settlement */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <CreditCard className="w-5 h-5 text-slate-500" />
            <h3 className="font-bold text-espresso">
              Payment & Settlement (Required)
            </h3>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">
              Set up how you want to receive payments from buyers.
            </p>
            <div className="max-w-md">
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Merchant UPI ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="upiId"
                value={formData.upiId}
                onChange={handleChange}
                placeholder="merchant@upi"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:border-clay focus:bg-white outline-none transition-colors"
              />
            </div>
          </div>
        </div>


        {/* Warehouse / dispatch point */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/60">
            <h3 className="font-bold text-espresso">Warehouse</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Where your consignments are dispatched from. This is the starting
              point buyers see on the delivery map.
            </p>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Street address
              </label>
              <input
                type="text"
                name="warehouseAddress"
                value={formData.warehouseAddress}
                onChange={handleChange}
                placeholder="Godown / building, street"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:border-clay focus:bg-white outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="warehouseCity"
                  value={formData.warehouseCity}
                  onChange={handleChange}
                  placeholder="Nashik"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:border-clay focus:bg-white outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="warehouseState"
                  value={formData.warehouseState}
                  onChange={handleChange}
                  placeholder="Maharashtra"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:border-clay focus:bg-white outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Pincode
                </label>
                <input
                  type="text"
                  name="warehousePincode"
                  value={formData.warehousePincode}
                  onChange={handleChange}
                  placeholder="422001"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:border-clay focus:bg-white outline-none transition-colors"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Pin the exact yard
              </p>
              <LocationPicker value={warehousePin} onChange={setWarehousePin} />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-bold text-white bg-espresso hover:bg-clay transition-colors shadow-sm disabled:opacity-70 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
