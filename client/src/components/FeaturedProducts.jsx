import React, { useState } from "react";
import { Link } from "react-router-dom";

const products = [
  {
    id: 101,
    name: "Industrial Copper Wire",
    sku: "CW-500X",
    basePrice: 450.0,
    minOrder: 50,
    unit: "kg",
    location: "Delhi Hub",
    trending: true,
  },
  {
    id: 102,
    name: "Premium Cotton Fabric",
    sku: "CF-200Y",
    basePrice: 120.5,
    minOrder: 100,
    unit: "meters",
    location: "Mumbai Hub",
    trending: false,
  },
  {
    id: 103,
    name: "Organic Raw Almonds",
    sku: "AL-900Z",
    basePrice: 680.0,
    minOrder: 25,
    unit: "kg",
    location: "Local",
    trending: true,
  },
  {
    id: 104,
    name: "Standard Delivery Boxes",
    sku: "BX-100A",
    basePrice: 15.75,
    minOrder: 500,
    unit: "pcs",
    location: "Delhi Hub",
    trending: false,
  },
];

const ProductCard = ({ product }) => {
  const [quantity, setQuantity] = useState(product.minOrder);

  const handleDecrease = () => {
    if (quantity > product.minOrder) setQuantity(quantity - 10);
  };

  const handleIncrease = () => {
    setQuantity(quantity + 10);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-300 transition-all flex flex-col overflow-hidden">
      <div className="h-40 bg-slate-100 relative flex items-center justify-center">
        <span className="text-5xl text-gray-400">📦</span>
        {product.trending && (
          <span className="absolute top-2 left-2 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
            High Demand
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-bold text-blue-900 leading-tight">
            {product.name}
          </h4>
        </div>
        <p className="text-xs text-gray-500 mb-3">SKU: {product.sku}</p>

        <div className="mt-auto">
          <div className="flex items-center gap-1 mb-1">
            <svg
              className="h-3 w-3 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-xs text-blue-600 font-medium">
              {product.location} Pricing
            </span>
          </div>

          <div className="flex items-end gap-1 mb-4">
            <span className="text-2xl font-extrabold text-blue-900">
              ₹{product.basePrice.toFixed(2)}
            </span>
            <span className="text-sm text-gray-500 mb-1">/{product.unit}</span>
          </div>

          <div className="flex items-center justify-between mb-4 bg-slate-50 rounded-lg p-1 border border-gray-200">
            <button
              onClick={handleDecrease}
              className="w-8 h-8 flex items-center justify-center text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
            >
              -
            </button>
            <div className="flex flex-col items-center">
              <span className="font-bold text-blue-900">{quantity}</span>
              <span className="text-[10px] text-gray-500 leading-none">
                Min: {product.minOrder}
              </span>
            </div>
            <button
              onClick={handleIncrease}
              className="w-8 h-8 flex items-center justify-center text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
            >
              +
            </button>
          </div>

          <button className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 rounded-lg transition-colors">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

const FeaturedProducts = () => {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-blue-900">
              Live Wholesale Rates
            </h2>
            <p className="text-gray-500 mt-2">
              Prices updated based on your current delivery zone.
            </p>
          </div>
          <Link
            to="/products"
            className="hidden md:flex text-blue-600 hover:text-blue-800 font-medium items-center gap-1"
          >
            View Inventory <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link
            to="/products"
            className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
          >
            View Full Inventory <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
