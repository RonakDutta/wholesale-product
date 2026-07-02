// File: src/components/CategoryGrid.jsx
import React from "react";
import { Link } from "react-router-dom";

const categories = [
  {
    id: 1,
    name: "Electronics",
    desc: "Bulk components",
    icon: "🔌",
    path: "/category/electronics",
  },
  {
    id: 2,
    name: "Apparel",
    desc: "Factory direct",
    icon: "👕",
    path: "/category/apparel",
  },
  {
    id: 3,
    name: "Groceries",
    desc: "Wholesale supplies",
    icon: "🌾",
    path: "/category/groceries",
  },
  {
    id: 4,
    name: "Hardware",
    desc: "Tools & equipment",
    icon: "🧰",
    path: "/category/hardware",
  },
  {
    id: 5,
    name: "Packaging",
    desc: "Boxes & materials",
    icon: "📦",
    path: "/category/packaging",
  },
];

const CategoryGrid = () => {
  return (
    <section className="py-12 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={category.path}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between h-32 relative group"
            >
              <div>
                <h3 className="font-bold text-blue-900 text-sm md:text-[20px] group-hover:text-blue-700">
                  {category.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{category.desc}</p>
              </div>
              <div className="absolute bottom-3 right-3 text-3xl opacity-80 ">
                {category.icon}
              </div>
            </Link>
          ))}

          <Link
            to="/categories"
            className="bg-blue-100 p-4 rounded-xl shadow-sm hover:bg-blue-200 transition-all flex flex-col items-center justify-center h-32 text-blue-800 group"
          >
            <div className="bg-white p-2 rounded-full mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <span className="font-bold text-sm">See all</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
