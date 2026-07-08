import {
  Building2,
  ShieldCheck,
  Mail,
  MapPin,
  CreditCard,
  Save,
  ShieldAlert,
} from "lucide-react";

const Settings = () => {
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
        <div className="bg-white border border-rose-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-rose-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <h3 className="font-bold text-rose-900">Verification Pending</h3>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-5">
              Your business is currently unverified. Verified accounts receive
              up to 3x more wholesale inquiries and access to instant UPI
              settlements.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  GSTIN Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-clay"
                />
              </div>
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  PAN Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. ABCDE1234F"
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-clay"
                />
              </div>
            </div>
            <button className="mt-5 bg-clay text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-espresso transition-colors cursor-pointer">
              Submit for Verification
            </button>
          </div>
        </div>

        {/* Business Profile */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <Building2 className="w-5 h-5 text-slate-500" />
            <h3 className="font-bold text-espresso">Business Profile</h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  defaultValue="Apex Traders"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:border-clay focus:bg-white outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  defaultValue="Ramesh Gupta"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:border-clay focus:bg-white outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    defaultValue="sales@apextraders.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:border-clay focus:bg-white outline-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Registered Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    defaultValue="Sector 18, Ahmedabad, Gujarat"
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
            <h3 className="font-bold text-espresso">Payment & Settlement</h3>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">
              Set up how you want to receive payments from buyers.
            </p>
            <div className="max-w-md">
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Merchant UPI ID
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="merchant@upi"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:border-clay focus:bg-white outline-none transition-colors"
                />
                <button className="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer">
                  Verify
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end gap-3 pt-2">
          <button className="px-6 py-2.5 rounded-lg text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
            Discard Changes
          </button>
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-espresso hover:bg-clay transition-colors shadow-sm cursor-pointer">
            <Save className="w-4 h-4" />
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
