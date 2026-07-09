import { Heart, IndianRupee, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import { getSortedSuppliers } from "../utils/supplierUtils";
import SupplierRow from "./SupplierRow";

const ProductCard = ({ product }) => {
  const { id, name = "Untitled Product", image, description = "" } = product;
  const suppliers = Array.isArray(product?.suppliers) ? product.suppliers : [];
  const { toggleWishlist, isWishlisted } = useWishlist();
  const wishlisted = isWishlisted(id);

  const sortedSuppliers = getSortedSuppliers({ ...product, suppliers });
  const bestSupplier = sortedSuppliers[0] ?? null;
  const displayedSuppliers = sortedSuppliers.slice(0, 2);
  const displayPrice =
    bestSupplier?.discountPrice ??
    bestSupplier?.price ??
    product?.price ??
    product?.discountPrice ??
    0;
  const supplierCount = suppliers.length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 hover:border-slate-300 group">
      {/* Image Section */}
      <div className="relative w-full aspect-4/3 bg-slate-50 overflow-hidden shrink-0 border-b border-slate-100">
        <img
          src={image}
          alt={name}
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
        />

        {/* Suppliers Badge */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md text-slate-700 text-[10px] sm:text-xs font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-sm whitespace-nowrap flex items-center gap-1.5 ring-1 ring-slate-900/5">
          <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-clay" />
          {suppliers.length} suppliers
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product);
          }}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-3 left-3 z-10 p-2 sm:p-2.5 rounded-full backdrop-blur-md transition-all duration-300 hover:scale-110 cursor-pointer shadow-sm ring-1 ${
            wishlisted
              ? "bg-rose-50/90 ring-rose-200 text-rose-500"
              : "bg-white/90 ring-slate-900/5 text-slate-400 hover:ring-rose-200 hover:text-rose-500"
          }`}
        >
          <Heart
            className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-all duration-300 ${
              wishlisted ? "fill-current scale-110" : "fill-none"
            }`}
          />
        </button>
      </div>

      {/* Content Section */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 gap-2 sm:gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-clay transition-colors">
            {name}
          </h3>
          {description && (
            <p className="mt-1 text-xs sm:text-sm text-slate-500 line-clamp-1">
              {description}
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-col pt-2">
          {/* Price Layout */}
          <div className="flex items-end gap-1.5 mb-3 sm:mb-4">
            <div className="flex items-center text-clay">
              <IndianRupee
                className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5"
                strokeWidth={2.5}
              />
              <span className="text-xl sm:text-2xl font-black leading-none tracking-tight">
                {bestSupplier.discountPrice ?? bestSupplier.price}
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-slate-400 mb-0.5 uppercase tracking-wider">
              / unit starts
            </span>
          </div>

          {/* Suppliers List */}
          <div className="border-t border-slate-100 pt-3 sm:pt-4 flex flex-col gap-2">
            {displayedSuppliers.map((supplier, idx) => (
              <SupplierRow
                key={supplier.id}
                supplier={supplier}
                isBest={idx === 0}
              />
            ))}
          </div>

          {/* Enhanced CTA Button */}
          <Link
            to={`/product/${id}`}
            className="group/btn mt-4 flex items-center justify-center gap-2 w-full py-3 sm:py-3.5 bg-slate-900 text-white text-[10px] sm:text-sm font-bold rounded-xl hover:bg-clay transition-all duration-300  active:scale-[0.98]"
          >
            <span>Compare and Buy</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
