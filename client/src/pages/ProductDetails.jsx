import { useState, useEffect, useRef } from "react";
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
  Tag,
  Heart,
} from "lucide-react";
import { gsap } from "gsap";
import mockProducts from "../utils/mockProducts";
import ContactVendorBtn from "../components/ContactVendorBtn";
import SupplierComparison from "../components/SupplierComparison";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const addToCartBtnRef = useRef(null);
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();

  const product = mockProducts.find((p) => p.id === id) || mockProducts[0];
  const primarySupplier = product.suppliers?.[0] ?? {};

  const baseMoq = primarySupplier.moq ?? 1;
  const [quantity, setQuantity] = useState(baseMoq);
  const [justAdded, setJustAdded] = useState(false);

  const quantityStep = Math.max(1, Math.round(baseMoq / 10));
  const currentUnitPrice =
    quantity >= (primarySupplier.moq ?? 0)
      ? (primarySupplier.discountPrice ?? primarySupplier.price ?? 0)
      : (primarySupplier.price ?? 0);
  const totalCost = currentUnitPrice * quantity;

  const unitSavings =
    (primarySupplier.price ?? 0) - (primarySupplier.discountPrice ?? 0);
  const savingsPercent =
    primarySupplier.price > 0
      ? Math.round((unitSavings / primarySupplier.price) * 100)
      : 0;
  const wishlisted = isWishlisted(product.id);
  const location =
    primarySupplier.city && primarySupplier.country
      ? `${primarySupplier.city}, ${primarySupplier.country}`
      : "India";
  const supplySignal =
    product.supplySignal ||
    (primarySupplier.stock >= 500 ? "High supply" : "Limited stock");
  const productSpecs =
    primarySupplier.responseTime || product.description || "Standard options";

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
    const supplier = product.suppliers?.[0] ?? null;
    const selectedQuantity = supplier
      ? Math.max(quantity, supplier.moq)
      : quantity;
    addToCart(product, selectedQuantity, supplier);
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

            <div className="absolute top-3 right-3 bg-white/95 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
              {supplySignal}
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white border border-slate-200 p-3 rounded-lg flex flex-col items-center justify-center shadow-xs">
              <Scale className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                Min Order
              </span>
              <span className="text-sm font-bold text-slate-800 mt-1 truncate max-w-full">
                {primarySupplier.moq ?? product.moq}
              </span>
            </div>
            <div className="bg-white border border-slate-200 p-3 rounded-lg flex flex-col items-center justify-center shadow-xs">
              <Layers className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                Variant
              </span>
              <span className="text-sm font-bold text-slate-800 mt-1 truncate max-w-full">
                {productSpecs}
              </span>
            </div>
            <div className="bg-white border border-slate-200 p-3 rounded-lg flex flex-col items-center justify-center shadow-xs">
              <Truck className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                Shipping
              </span>
              <span className="text-sm font-bold text-slate-800 mt-1 truncate max-w-full">
                FOB Options
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Information & Pricing */}
        <div className="detail-fade-in flex flex-col gap-5">
          {/* Vendor Details */}
          <div className="flex flex-col gap-2 pb-3 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-slate-800">
                {primarySupplier.name ?? product.vendorName}
              </span>
              {(primarySupplier.verified || product.verified) && (
                <div className="flex items-center gap-1 bg-white border border-emerald-600 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>Verified Supplier</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-slate-500 font-medium">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{location}</span>
              <span className="text-slate-300 mx-1">•</span>
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-mono text-xs text-slate-400">
                {product.category} Industry
              </span>
            </div>
          </div>

          {/* Product Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {product.name}
            </h1>
          </div>

          {/* REDESIGNED Pricing Box */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                Pricing Tiers
              </span>
              {savingsPercent > 0 && (
                <div className="flex items-center gap-1 bg-emerald-100/80 text-emerald-700 text-[10px] font-extrabold px-2 py-1 rounded-sm uppercase tracking-widest border border-emerald-200">
                  <Tag className="w-3 h-3" />
                  <span>Save {savingsPercent}% on Bulk</span>
                </div>
              )}
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Tier 1: Standard Rate */}
              <div className="border border-slate-200 rounded-lg p-3.5 flex flex-col justify-center bg-white shadow-xs relative">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Standard Rate
                </span>
                <div className="flex items-baseline gap-0.5 font-mono">
                  <IndianRupee
                    className="w-4 h-4 text-slate-800 shrink-0"
                    strokeWidth={2.5}
                  />
                  <span className="text-2xl font-bold text-slate-800">
                    {primarySupplier.price ?? 0}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">/unit</span>
                </div>
                <span className="text-xs text-slate-400 mt-1 font-medium">
                  Min. order: {primarySupplier.moq ?? product.moq}
                </span>
              </div>

              {/* Tier 2: Bulk Rate (Highlighted) */}
              <div className="border-2 border-clay rounded-lg p-3.5 flex flex-col justify-center bg-clay/5 relative shadow-xs">
                {/* Floating Badge */}
                <div className="absolute -top-2.5 right-3 bg-clay text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" strokeWidth={3} />
                  Best Value
                </div>

                <span className="text-[11px] font-bold uppercase tracking-wider text-clay mb-2">
                  Bulk Rate
                </span>
                <div className="flex items-baseline gap-0.5 font-mono">
                  <IndianRupee
                    className="w-4 h-4 text-clay shrink-0"
                    strokeWidth={3}
                  />
                  <span className="text-2xl font-black text-clay">
                    {primarySupplier.discountPrice ??
                      primarySupplier.price ??
                      0}
                  </span>
                  <span className="text-xs text-clay/70 ml-1 font-bold">
                    /unit
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500 font-medium line-through decoration-slate-300">
                    ₹{primarySupplier.price ?? 0}
                  </span>
                  <span className="text-xs text-clay font-semibold">
                    ({primarySupplier.moq ?? "—"}+ units)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quantity Calculator */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-4 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600 font-mono">
              <Calculator className="w-4 h-4 text-clay" />
              <span>Calculate Total</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-sm font-medium text-slate-600">
                  Order Quantity
                </label>

                <div className="flex items-stretch border border-slate-300 rounded-sm overflow-hidden focus-within:ring-1 focus-within:ring-clay focus-within:border-clay">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(quantity - quantityStep)
                    }
                    className="px-3 flex items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer border-r border-slate-200 shrink-0"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) =>
                      handleQuantityChange(parseInt(e.target.value))
                    }
                    className="w-full min-w-0 text-center py-2 text-base font-mono font-bold text-slate-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(quantity + quantityStep)
                    }
                    className="px-3 flex items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer border-l border-slate-200 shrink-0"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Increments of {quantityStep} units
                </span>
              </div>

              {/* Cost Outputs */}
              <div className="flex flex-row sm:flex-col justify-between sm:justify-center px-2 sm:px-4 py-2 sm:py-0 border-t sm:border-t-0 sm:border-l border-slate-200 gap-2 font-mono shrink-0">
                <div>
                  <span className="block text-xs text-slate-400 uppercase font-bold tracking-wide">
                    Price per unit
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    ₹{currentUnitPrice}
                  </span>
                </div>
                <div className="text-right sm:text-left">
                  <span className="block text-xs text-slate-400 uppercase font-bold tracking-wide">
                    Total Cost
                  </span>
                  <span className="text-lg font-black text-clay">
                    ₹{totalCost.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {quantity < baseMoq && (
              <p className="text-xs text-rose-600 font-medium">
                * Note: Your order quantity is below the minimum order of{" "}
                {primarySupplier.moq ?? product.moq}.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <ContactVendorBtn
              vendorId={product.suppliers?.[0]?.id ?? product.vendorId}
              vendorName={product.suppliers?.[0]?.name ?? product.vendorName}
              productName={product.name}
            />
            <button
              type="button"
              onClick={() => toggleWishlist(product)}
              className={`flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-sm transition-all cursor-pointer shadow-sm active:scale-[0.99] border ${
                wishlisted
                  ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                  : "bg-white border-slate-200 text-slate-700 hover:border-rose-200 hover:text-rose-500"
              }`}
            >
              <Heart
                className={`w-5 h-5 shrink-0 transition-all ${
                  wishlisted ? "fill-current scale-110" : "fill-none"
                }`}
              />
              <span>
                {wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
              </span>
            </button>
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
                  <Check className="w-5 h-5 shrink-0" />
                  <span>Added to Cart</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5 shrink-0" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <SupplierComparison
        product={product}
        onAddToCart={(productObj, qty, supplier) =>
          addToCart(productObj, qty, supplier)
        }
        onContactSupplier={(supplier) =>
          console.log("Contact supplier:", supplier.name, supplier.id)
        }
      />
    </div>
  );
};

export default ProductDetails;
