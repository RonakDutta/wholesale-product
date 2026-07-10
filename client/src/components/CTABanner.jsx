import React, { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Store, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const CTABanner = () => {
  const { user, isAuthenticated, upgradeAccount } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    city: "",
    phone: "",
    gstin: "",
  });

  if (user?.role === "seller" || user?.role === "both") {
    return null;
  }

  const handleActionClick = () => {
    if (!isAuthenticated) {
      toast.info("Please create an account or log in first.");
      navigate("/signup");
    } else {
      setIsModalOpen(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await upgradeAccount(formData);
      toast.success("Account upgraded successfully!");
      setIsModalOpen(false);
      navigate("/dashboard/settings");
    } catch (err) {
      toast.error("Failed to upgrade account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // This is the modal content that we will portal out to the document body
  const UpgradeModal = () => (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-900">
            Upgrade to Seller Account
          </h3>
          <button
            onClick={() => setIsModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-600 mb-2">
            We just need a few basic details to set up your wholesale profile.
            You can fill out the rest later.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Company Name *
            </label>
            <input
              type="text"
              required
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-clay focus:ring-1 focus:ring-clay transition-all"
              placeholder="e.g. Apex Traders"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                City *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-clay focus:ring-1 focus:ring-clay transition-all"
                placeholder="e.g. Delhi"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone *
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-clay focus:ring-1 focus:ring-clay transition-all"
                placeholder="e.g. 9876543210"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              GSTIN (Optional)
            </label>
            <input
              type="text"
              value={formData.gstin}
              onChange={(e) =>
                setFormData({ ...formData, gstin: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-clay focus:ring-1 focus:ring-clay transition-all"
              placeholder="22AAAAA0000A1Z5"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-clay text-white font-bold py-2.5 rounded-lg hover:bg-clay/90 transition-colors disabled:opacity-70 flex justify-center cursor-pointer shadow-sm shadow-clay/20"
            >
              {loading ? "Creating Profile..." : "Start Selling"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <div className="w-full bg-white border border-slate-200 rounded-lg mt-8 overflow-hidden relative shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
        <div
          className="h-1.5 w-full opacity-25"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, var(--color-clay) 0px, var(--color-clay) 7px, transparent 7px, transparent 14px)",
          }}
        />

        <div className="px-5 py-7 sm:px-8 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-cream border border-clay/30 text-clay text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-sm mb-3">
              <Store className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2.5} />
              <span>For sellers</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight mb-2">
              List your inventory where wholesalers are already buying
            </h2>

            <p className="text-sm text-slate-500 leading-relaxed mb-4 sm:mb-5">
              Set your own price tiers, take orders directly, and get paid
              without a middleman.
            </p>

            <div className="flex flex-wrap items-stretch justify-center sm:justify-start gap-2">
              <div className="font-mono text-[11px] sm:text-xs text-slate-600 border border-slate-200 rounded-sm px-2.5 py-1">
                <span className="text-slate-900 font-bold">12,400+</span> buyers
              </div>
              <div className="font-mono text-[11px] sm:text-xs text-slate-600 border border-slate-200 rounded-sm px-2.5 py-1">
                <span className="text-slate-900 font-bold">850+</span> sellers
              </div>
              <div className="font-mono text-[11px] sm:text-xs text-slate-600 border border-slate-200 rounded-sm px-2.5 py-1">
                <span className="text-slate-900 font-bold">₹2.4Cr+</span>{" "}
                monthly GMV
              </div>
            </div>
          </div>
          <div className="hidden sm:block self-stretch border-l border-dashed border-slate-200" />

          <button
            onClick={handleActionClick}
            className="group flex items-center justify-center gap-2 bg-clay text-white px-6 py-2.5 rounded-sm font-semibold text-sm hover:bg-clay/90 transition-colors cursor-pointer w-full sm:w-auto shrink-0 shadow-sm"
          >
            <span>Become a seller</span>
            <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Teleport the modal to the document body! */}
      {isModalOpen && createPortal(<UpgradeModal />, document.body)}
    </>
  );
};

export default CTABanner;
