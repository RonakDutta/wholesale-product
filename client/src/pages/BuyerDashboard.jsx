import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import ProductCard from "../components/ProductCard";

const BuyerDashboard = () => {
  const { user } = useContext(AuthContext);

  const allSellers = JSON.parse(
    localStorage.getItem("seller_products") || "{}",
  );
  const sample = Object.entries(allSellers)
    .flatMap(([seller, products]) =>
      (Array.isArray(products) ? products : []).map((p) => ({
        ...p,
        suppliers: [
          {
            id: p.supplierEmail || seller,
            name: p.supplierName || p.supplierCompany || seller,
            company: p.supplierCompany || p.supplierName || seller,
            price: Number(p.price) || 0,
            discountPrice: p.discountPrice
              ? Number(p.discountPrice)
              : undefined,
            moq: Number(p.moq) || 1,
            verified: true,
            city: p.supplierCity || "",
            country: p.supplierCountry || "India",
          },
        ],
        description:
          p.description ||
          `Supplier: ${p.supplierCompany || p.supplierName || seller}`,
        seller,
      })),
    )
    .filter((product) => product.visible !== false);

  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Buyer Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">Welcome back.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Available Products</h3>
        {sample.length === 0 ? (
          <p className="text-sm text-slate-500">No products available yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sample.map((p) => (
              <ProductCard
                key={p.id}
                product={{
                  ...p,
                  description: p.seller ? `Seller: ${p.seller}` : p.description,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
