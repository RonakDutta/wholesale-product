import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const SupplierDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    price: "",
    moq: 1,
    category: "",
    description: "",
    image: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    company: "",
    phone: "",
  });

  const supplierFullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Supplier";
  const supplierCompany = user?.company || supplierFullName;

  useEffect(() => {
    if (!user) return;
    const all = JSON.parse(localStorage.getItem("seller_products") || "{}");
    const mine = all[user.email] || [];
    setProducts(mine);

    setProfileForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      company: user.company || "",
      phone: user.phone || "",
    });
  }, [user]);

  const persist = (next) => {
    if (!user) return;
    const all = JSON.parse(localStorage.getItem("seller_products") || "{}");
    all[user.email] = next;
    localStorage.setItem("seller_products", JSON.stringify(all));
    setProducts(next);
  };

  const handleImage = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((s) => ({ ...s, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!user) return;
    if (!form.name || !form.price) return;

    const supplierInfo = {
      supplierEmail: user.email,
      supplierName: supplierFullName,
      supplierCompany,
      supplierPhone: user.phone || "",
      supplierBizType: user.bizType || "seller",
    };

    const next = [...products];
    if (editingId) {
      const idx = next.findIndex((p) => p.id === editingId);
      if (idx > -1)
        next[idx] = { ...next[idx], ...form, ...supplierInfo, visible: true };
      setEditingId(null);
    } else {
      next.unshift({ id: Date.now(), ...form, ...supplierInfo, visible: true });
    }
    persist(next);
    setForm({ name: "", price: "", moq: 1, category: "", image: "" });
  };

  const edit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      price: p.price,
      moq: p.moq,
      category: p.category || "",
      image: p.image || "",
    });
  };

  const remove = (id) => {
    const next = products.filter((p) => p.id !== id);
    persist(next);
  };

  const saveProfile = () => {
    if (!user || !updateProfile) return;

    const updatedUser = updateProfile({
      firstName: profileForm.firstName.trim(),
      lastName: profileForm.lastName.trim(),
      company: profileForm.company.trim(),
      phone: profileForm.phone.trim(),
    });

    if (!updatedUser) return;

    const updatedFullName =
      [updatedUser.firstName, updatedUser.lastName].filter(Boolean).join(" ") ||
      "Supplier";
    const updatedCompany = updatedUser.company || updatedFullName;

    const next = products.map((p) => ({
      ...p,
      supplierName: updatedFullName,
      supplierCompany: updatedCompany,
      supplierPhone: updatedUser.phone || "",
    }));

    persist(next);
    setIsEditingProfile(false);
  };

  const toggleVisibility = (id) => {
    const next = products.map((p) =>
      p.id === id ? { ...p, visible: !p.visible } : p,
    );
    persist(next);
  };

  return (
    <div className="min-h-screen bg-cream flex">
      <aside className="w-1/2 p-12 bg-espresso text-cream">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-white/10 rounded p-2">📦</div>
            <div>
              <div className="text-sm opacity-80">marketplace.</div>
              <div className="text-2xl font-bold">B2B Wholesale Platform</div>
            </div>
          </div>

          <h1 className="text-4xl font-extrabold leading-tight mb-4">
            Source smarter. Scale faster.
          </h1>
          <p className="text-slate-200/80 mb-6">
            Bridge the gap between retail and wholesale. Connect with verified
            suppliers, access competitive inventory, and settle instantly with
            integrated UPI payments.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/8 rounded p-4 text-center">
              <div className="text-2xl font-bold">240+</div>
              <div className="text-xs mt-1">Verified Suppliers</div>
            </div>
            <div className="bg-white/8 rounded p-4 text-center">
              <div className="text-2xl font-bold">500+</div>
              <div className="text-xs mt-1">Products Listed</div>
            </div>
            <div className="bg-white/8 rounded p-4 text-center">
              <div className="text-2xl font-bold">100+</div>
              <div className="text-xs mt-1">Regions</div>
            </div>
          </div>

          <div className="bg-white/6 p-4 rounded">
            <div className="text-sm mb-2">
              “Finding reliable suppliers used to take weeks. However by using
              this app, we connect directly with top wholesalers in minutes.”
            </div>
            <div className="flex items-center gap-3 mt-3">
              <div className="w-8 h-8 rounded-full bg-espresso/30 flex items-center justify-center">
                RK
              </div>
              <div>
                <div className="font-semibold">Rajesh Kumar</div>
                <div className="text-xs opacity-80">
                  Head of Procurement, PackRight India
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="w-1/2 p-10 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Supplier Dashboard</h2>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-slate-900">
                  Your supplier profile
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile((current) => !current)}
                  className="text-sm text-clay font-semibold"
                >
                  {isEditingProfile ? "Cancel" : "Edit profile"}
                </button>
              </div>

              {isEditingProfile ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                        First name
                      </div>
                      <input
                        value={profileForm.firstName}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            firstName: e.target.value,
                          }))
                        }
                        className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                        placeholder="First name"
                      />
                    </label>
                    <label className="block">
                      <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                        Last name
                      </div>
                      <input
                        value={profileForm.lastName}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            lastName: e.target.value,
                          }))
                        }
                        className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Last name"
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                        Company
                      </div>
                      <input
                        value={profileForm.company}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            company: e.target.value,
                          }))
                        }
                        className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Company name"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                        Phone
                      </div>
                      <input
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Phone number"
                      />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={saveProfile}
                      className="px-4 py-2 bg-clay text-white rounded font-semibold"
                    >
                      Save profile
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wide">
                      Company
                    </div>
                    <div className="font-medium">
                      {supplierCompany || "Add your company name here"}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wide">
                      Supplier name
                    </div>
                    <div className="font-medium">{supplierFullName}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wide">
                      Email
                    </div>
                    <div className="font-medium">{user?.email}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs uppercase tracking-wide">
                      Phone
                    </div>
                    <div className="font-medium">
                      {user?.phone || "Not provided"}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-slate-500 text-xs uppercase tracking-wide">
                      Account type
                    </div>
                    <div className="font-medium capitalize">
                      {user?.bizType || "seller"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <section className="mb-6 bg-cream-light p-4 rounded">
            <h3 className="font-semibold mb-2">Add / Edit Product</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                className="border p-2 rounded"
                placeholder="Product name"
                value={form.name}
                onChange={(e) =>
                  setForm((s) => ({ ...s, name: e.target.value }))
                }
              />
              <input
                className="border p-2 rounded"
                placeholder="Price"
                value={form.price}
                onChange={(e) =>
                  setForm((s) => ({ ...s, price: e.target.value }))
                }
              />
              <input
                className="border p-2 rounded"
                placeholder="MOQ"
                type="number"
                value={form.moq}
                onChange={(e) =>
                  setForm((s) => ({ ...s, moq: e.target.value }))
                }
              />
              <input
                className="border p-2 rounded"
                placeholder="Category"
                value={form.category}
                onChange={(e) =>
                  setForm((s) => ({ ...s, category: e.target.value }))
                }
              />
              <div className="col-span-2 flex flex-col gap-3">
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 border-dashed border-espresso/50 bg-espresso/10 px-4 py-3 text-sm font-medium text-espresso shadow-sm transition hover:border-espresso hover:bg-espresso/20">
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-espresso px-2.5 py-1 text-xs font-semibold text-white">
                      Choose file
                    </span>
                    <span>
                      {form.image ? "Image selected" : "Upload product image"}
                    </span>
                  </span>
                  <span className="text-xs uppercase tracking-wide text-espresso/80">
                    PNG / JPG
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImage}
                    className="sr-only"
                  />
                </label>
                {form.image && (
                  <img
                    src={form.image}
                    alt="thumb"
                    className="w-16 h-12 object-cover rounded"
                  />
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Product description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full resize-none border border-slate-200 rounded-lg p-3 text-sm text-slate-800 focus:border-clay focus:outline-none"
                  placeholder="Write a short product description"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={save}
                className="px-4 py-2 bg-clay text-white rounded font-semibold"
              >
                {editingId ? "Update Product" : "Save Product"}
              </button>
              {editingId && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      name: "",
                      price: "",
                      moq: 1,
                      category: "",
                      image: "",
                    });
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
              )}
            </div>
          </section>

          <section>
            <h3 className="font-semibold mb-3">Your Products</h3>
            <div className="space-y-3">
              {products.length === 0 && (
                <p className="text-sm text-slate-500">No products yet.</p>
              )}
              {products.map((p) => (
                <div
                  key={p.id}
                  className="border rounded p-3 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    {p.image ? (
                      <img
                        src={p.image}
                        className="w-20 h-14 object-cover rounded"
                        alt=""
                      />
                    ) : (
                      <div className="w-20 h-14 bg-slate-100 rounded flex items-center justify-center">
                        No image
                      </div>
                    )}
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-sm text-slate-500">
                        {p.category} • MOQ: {p.moq}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-mono">₹{p.price}</div>
                    <button
                      onClick={() => edit(p)}
                      className="px-3 py-1 border rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(p.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => toggleVisibility(p.id)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      {p.visible ? "Live" : "Hidden"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default SupplierDashboard;
