import React from "react";

const CTABanner = () => {
  return (
    <div className="w-full bg-sage/20 border border-sage/30 rounded-md p-6 sm:p-8 mt-8 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-4 shadow-sm">
      <div>
        <h2 className="text-lg sm:text-xl font-extrabold text-espresso mb-1">
          Are You a Wholesaler?
        </h2>
        <p className="text-sm text-espresso/80">
          Join the platform to manage your inventory, offer dynamic pricing, and
          reach thousands of verified buyers directly.
        </p>
      </div>
      <button className="bg-espresso text-cream px-6 py-2.5 rounded-sm font-semibold text-sm hover:bg-espresso/90 transition-colors whitespace-nowrap cursor-pointer w-full sm:w-auto">
        Become a Seller
      </button>
    </div>
  );
};

export default CTABanner;
