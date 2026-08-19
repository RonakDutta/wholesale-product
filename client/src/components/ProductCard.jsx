import { Heart, IndianRupee } from "lucide-react";
import { Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import { getEffectivePrice } from "../utils/supplierUtils";
import SupplierRow from "./SupplierRow";

const ProductCard = ({ product }) => {
  const { id, name = "Untitled Product", image, description = "" } = product;
  const suppliers = Array.isArray(product?.suppliers) ? product.suppliers : [];
  const { toggleWishlist, isWishlisted } = useWishlist();
  const wishlisted = isWishlisted(id);

  // In closed-network model, there should only be one supplier (the wholesaler)
  const supplier = suppliers[0] ?? null;

  if (!supplier) return null;

  return (
    <div className="group bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60 hover:-translate-y-1.5 hover:border-slate-300">
      <div className="relative w-full aspect-4/3 bg-slate-50 overflow-hidden shrink-0 border-b border-slate-100">
        <img
          src={image}
          alt={name}
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
        />

        <div className="absolute inset-x-0 top-0 p-2.5 sm:p-3 flex items-start justify-between gap-2 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleWishlist(product);
            }}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={`shrink-0 p-2 sm:p-2.5 rounded-full backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer shadow-sm ring-1 ${
              wishlisted
                ? "bg-rose-50/90 ring-rose-200 text-rose-500"
                : "bg-white/90 ring-slate-200/50 text-slate-400 hover:ring-rose-200 hover:text-rose-500"
            }`}
          >
            <Heart
              className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${
                wishlisted ? "fill-current scale-110" : "fill-none"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-2 leading-snug min-h-10 sm:min-h-12 group-hover:text-clay transition-colors">
            {name}
          </h3>

          <p className="mt-1 text-xs sm:text-sm text-slate-500 line-clamp-1 min-h-4 sm:min-h-5">
            {description || "\u00A0"}
          </p>
        </div>

        <div className="mt-auto flex flex-col pt-1">
          <div className="flex items-baseline gap-1.5 mb-3 sm:mb-4 flex-wrap">
            <div className="flex items-center text-clay">
              <IndianRupee
                className="w-3.5 h-3.5 sm:w-5 sm:h-5"
                strokeWidth={2.5}
              />
              <span className="text-lg sm:text-2xl font-black leading-none tracking-tight">
                {getEffectivePrice(supplier)}
              </span>
            </div>
            <span className="text-[9px] sm:text-xs font-medium text-slate-400 tracking-wider whitespace-nowrap">
              <span className="sm:hidden">/unit</span>
              <span className="hidden sm:inline">/ unit starts</span>
            </span>
          </div>

          <div className="border-t border-slate-100 pt-3 sm:pt-4">
            <SupplierRow supplier={supplier} />
          </div>

          <Link
            to={`/product/${id}`}
            className="group/btn mt-4 flex items-center justify-center gap-2 w-full py-3 sm:py-3.5 bg-slate-900 text-white text-[11px] sm:text-sm font-bold rounded-xl no-underline hover:bg-clay transition-all duration-300 active:scale-[0.97] shadow-sm hover:shadow-md"
          >
            View and Buy
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
