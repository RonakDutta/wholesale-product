import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  MapPin,
  IndianRupee,
  Layers,
  Scale,
  Truck,
  TrendingDown,
  Building2,
  Calculator,
  Minus,
  Plus,
  ShoppingBag,
  Check,
} from "lucide-react";
import { gsap } from "gsap";
import mockProducts from "../utils/mockProducts";
import ContactVendorBtn from "../components/ContactVendorBtn";
import { useCart } from "../context/CartContext";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const addToCartBtnRef = useRef(null);
  const { addToCart } = useCart();

  const product = mockProducts.find((p) => p.id === id) || mockProducts[0];

  const baseMoq = parseInt(product.moq) || 1;
  const [quantity, setQuantity] = useState(baseMoq);
  const [justAdded, setJustAdded] = useState(false);

  const quantityStep = Math.max(1, Math.round(baseMoq / 10));
  const currentUnitPrice =
    quantity >= product.bulkQuantity ? product.bulkPrice : product.price;
  const totalCost = currentUnitPrice * quantity;

  const unitSavings = product.price - product.bulkPrice;
  const savingsPercent =
    product.price > 0 ? Math.round((unitSavings / product.price) * 100) : 0;

  useEffect(() => {
    window.scrollTo(0, 0);
    let ctx = gsap.context(() => {
      gsap.fromTo(
        ".detail-fade-in",
        { y: 15, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.08,
          ease: "power2.out",
        },
      );
    }, pageRef);
    return () => ctx.revert();
  }, [id]);

  const handleQuantityChange = (val) => {
    if (isNaN(val) || val < 1) {
      setQuantity(1);
    } else {
      setQuantity(val);
    }
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    flyToCart(addToCartBtnRef.current);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  };

  return (
    <div
      ref={pageRef}
      className="w-full flex flex-col gap-6 pb-16 max-w-7xl mx-auto"
    >
      {/* Back Navigation Bar */}
      <div className="detail-fade-in flex items-center justify-between py-2 border-b border-slate-200">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Marketplace
        </button>
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider hidden sm:inline">
          Product ID: {product.id}
        </span>
      </div>

      {/* Main Structural Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 items-start">
        {/* Left Side: Product Image Display Panel */}
        <div className="detail-fade-in flex flex-col gap-4">
          <div className="group relative w-full aspect-4/3 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <img
              src={product.image}
              alt={product.name}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            />

            {product.supplySignal && (
              <div className="absolute top-3 right-3 bg-white/95 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                {product.supplySignal}
              </div>
            )}
          </div>

          {/* Core Operational Quick Specs Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white border border-slate-200 p-2.5 rounded-lg flex flex-col items-center justify-center shadow-xs">
              <Scale className="w-4 h-4 text-slate-400 mb-1" />
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Min Order
              </span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 truncate max-w-full">
                {product.moq}
              </span>
            </div>
            <div className="bg-white border border-slate-200 p-2.5 rounded-lg flex flex-col items-center justify-center shadow-xs">
              <Layers className="w-4 h-4 text-slate-400 mb-1" />
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Spec Variant
              </span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 truncate max-w-full">
                {product.specs}
              </span>
            </div>
            <div className="bg-white border border-slate-200 p-2.5 rounded-lg flex flex-col items-center justify-center shadow-xs">
              <Truck className="w-4 h-4 text-slate-400 mb-1" />
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Logistics
              </span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 truncate max-w-full">
                FOB Options
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Information Ledger & Transaction Console */}
        <div className="detail-fade-in flex flex-col gap-5">
          {/* Vendor Details Header */}
          <div className="flex flex-col gap-1.5 pb-3 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-800">
                {product.vendorName}
              </span>
              {product.verified && (
                <div className="flex items-center gap-1 bg-white border border-emerald-600 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                  <ShieldCheck className="w-3 h-3" strokeWidth={2.5} />
                  <span>Verified Supplier</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{product.location}</span>
              <span className="text-slate-300 mx-1">•</span>
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-mono text-[11px] text-slate-400">
                {product.category} Industry
              </span>
            </div>
          </div>

          {/* Product Title Section */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {product.name}
            </h1>
          </div>

          {/* Commercial Ledger Tier Matrix Box */}
          <div className="bg-white border border-slate-200 border-l-4 border-l-clay rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                B2B Wholesaler Matrix
              </span>
              <div className="flex items-center gap-1 bg-cream border border-clay/30 text-clay font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                <TrendingDown className="w-3 h-3" />
                <span>Dynamic Rate</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[11px] text-slate-500 font-medium mb-0.5">
                  Base Rate (MOQ Tier)
                </span>
                <div className="flex items-baseline gap-0.5 font-mono">
                  <IndianRupee
                    className="w-3.5 h-3.5 text-slate-800 shrink-0"
                    strokeWidth={2.5}
                  />
                  <span className="text-lg font-bold text-slate-900">
                    {product.price}
                  </span>
                  <span className="text-xs text-slate-400">/unit</span>
                </div>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 font-medium mb-0.5">
                  Bulk Rate (At {product.bulkQuantity}+ units)
                </span>
                <div className="flex items-baseline gap-0.5 font-mono">
                  <IndianRupee
                    className="w-3.5 h-3.5 text-clay shrink-0"
                    strokeWidth={2.5}
                  />
                  <span className="text-lg font-bold text-clay">
                    {product.bulkPrice}
                  </span>
                  <span className="text-xs text-slate-400">/unit</span>
                </div>
                {savingsPercent > 0 && (
                  <span className="block font-mono text-[10px] text-clay/80 mt-0.5">
                    Save {savingsPercent}% per unit at bulk
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Live Price Tier Calculator Engine */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-4 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 font-mono">
              <Calculator className="w-4 h-4 text-clay" />
              <span>Real-Time Volume Calculator</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-medium text-slate-500">
                  Specify Order Quantity
                </label>

                {/* Custom stepper replaces the native number input's spinner
                    arrows, which were overlapping the "units" suffix. */}
                <div className="flex items-stretch border border-slate-300 rounded-sm overflow-hidden focus-within:ring-1 focus-within:ring-clay focus-within:border-clay">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(quantity - quantityStep)
                    }
                    className="px-3 flex items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer border-r border-slate-200 shrink-0"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) =>
                      handleQuantityChange(parseInt(e.target.value))
                    }
                    className="w-full min-w-0 text-center py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(quantity + quantityStep)
                    }
                    className="px-3 flex items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer border-l border-slate-200 shrink-0"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  units · steps of {quantityStep}
                </span>
              </div>

              {/* Dynamic Cost Output Panels */}
              <div className="flex flex-row sm:flex-col justify-between sm:justify-center px-2 sm:px-4 py-1.5 sm:py-0 border-t sm:border-t-0 sm:border-l border-slate-200 gap-1 font-mono shrink-0">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                    Applied Rate
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    ₹{currentUnitPrice}/unit
                  </span>
                </div>
                <div className="text-right sm:text-left mt-0 sm:mt-1.5">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                    Estimated Invoice
                  </span>
                  <span className="text-sm font-black text-clay">
                    ₹{totalCost.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {quantity < baseMoq && (
              <p className="text-[11px] text-rose-600 font-medium">
                * Note: Your input order quantity falls below the vendor
                specified MOQ of {product.moq}.
              </p>
            )}
          </div>

          {/* Action Terminal Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <ContactVendorBtn
              vendorId={product.vendorId}
              vendorName={product.vendorName}
              productName={product.name}
            />
            <button
              ref={addToCartBtnRef}
              onClick={handleAddToCart}
              className={`flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-sm transition-all cursor-pointer shadow-sm active:scale-[0.99] ${
                justAdded
                  ? "bg-emerald-600 text-white"
                  : "bg-clay text-white hover:bg-clay/90"
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Added to Cart</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
