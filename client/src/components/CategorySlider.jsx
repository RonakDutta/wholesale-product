import React from "react";

const CategorySlider = () => {
  const categories = [
    "All Products",
    "Electronics",
    "Packaging",
    "Raw Materials",
    "Hardware",
    "Textiles",
    "Chemicals",
  ];

  return (
    <div className="w-full overflow-x-auto pb-2 mb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
      <div className="flex gap-3">
        {categories.map((category, index) => (
          <button
            key={index}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              index === 0
                ? "bg-clay text-cream"
                : "bg-sage/20 text-espresso hover:bg-sage/40"
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategorySlider;
