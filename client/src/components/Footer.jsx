import React from "react";

const Footer = () => {
  return (
    <footer className="w-full border-t border-sage/30 bg-cream mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <div className="text-xl font-black tracking-tighter text-espresso mb-4">
              market<span className="text-clay">place</span>
            </div>
            <p className="text-xs text-espresso/70 leading-relaxed">
              The premier B2B unified marketplace for seamless wholesale
              trading, powered by dynamic pricing and direct UPI payments.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-espresso text-sm mb-4">Platform</h3>
            <ul className="flex flex-col gap-2 text-xs text-espresso/70">
              <li className="hover:text-clay cursor-pointer transition-colors">
                Browse Products
              </li>
              <li className="hover:text-clay cursor-pointer transition-colors">
                Verified Sellers
              </li>
              <li className="hover:text-clay cursor-pointer transition-colors">
                Dynamic Pricing
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-espresso text-sm mb-4">Support</h3>
            <ul className="flex flex-col gap-2 text-xs text-espresso/70">
              <li className="hover:text-clay cursor-pointer transition-colors">
                Help Center
              </li>
              <li className="hover:text-clay cursor-pointer transition-colors">
                UPI Guide
              </li>
              <li className="hover:text-clay cursor-pointer transition-colors">
                Contact Us
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-espresso text-sm mb-4">Legal</h3>
            <ul className="flex flex-col gap-2 text-xs text-espresso/70">
              <li className="hover:text-clay cursor-pointer transition-colors">
                Terms of Service
              </li>
              <li className="hover:text-clay cursor-pointer transition-colors">
                Privacy Policy
              </li>
              <li className="hover:text-clay cursor-pointer transition-colors">
                Seller Agreement
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-sage/20 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-espresso/60">
            © 2026 marketplace. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
<<<<<<< HEAD
}
=======
};

export default Footer;
>>>>>>> feature/v4
