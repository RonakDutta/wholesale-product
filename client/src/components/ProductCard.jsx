import { Heart, IndianRupee, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import { getSortedSuppliers } from "../utils/supplierUtils";
import SupplierRow from "./SupplierRow";

const ProductCard = ({ product }) => {
  const { id, name = "Untitled Product", image, description = "" } = product;
  const suppliers = product.suppliers ?? [];
  const { toggleWishlist, isWishlisted } = useWishlist();
  const wishlisted = isWishlisted(id);

  const sortedSuppliers = getSortedSuppliers(product);
  const bestSupplier = sortedSuppliers[0];

  const displayedSuppliers = sortedSuppliers.slice(0, 2);

  if (!bestSupplier) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg sm:rounded-xl overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:border-sage/50 group">
      <div className="relative w-full aspect-4/3 bg-slate-100 overflow-hidden shrink-0">
        <img
          src={image}
          alt={name}
          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 bg-white/90 backdrop-blur-sm text-slate-700 text-[7px] sm:text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full border border-slate-200 shadow-sm whitespace-nowrap flex items-center gap-1">
          <Users className="w-2.5 h-2.5" />
          {suppliers.length} suppliers
        </div>

        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 z-10 p-1.5 sm:p-2 rounded-full border transition-all duration-300 hover:scale-110 hover:shadow-md cursor-pointer ${
            wishlisted
              ? "bg-rose-50 border-rose-200 text-rose-500"
              : "bg-white/90 border-slate-200 text-slate-600 hover:border-rose-200 hover:text-rose-500"
          }`}
        >
          <Heart
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all duration-300 ${
              wishlisted ? "fill-current scale-110" : "fill-none"
            }`}
          />
        </button>
      </div>

      <div className="p-2 pt-3 sm:p-3 sm:pt-4 md:p-4 md:pt-5 flex flex-col flex-1 gap-1.5 sm:gap-2">
        <h3 className="text-[11px] sm:text-xs md:text-sm font-bold text-slate-900 line-clamp-2 leading-snug min-h-[2.75em]">
          {name}
        </h3>
        {description && (
          <p className="text-[7px] sm:text-[9px] md:text-[10px] text-slate-500 line-clamp-1">
            {description}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-1.5 sm:gap-2 pt-1">
          <div className="flex items-baseline gap-0.5 sm:gap-1 font-mono">
            <IndianRupee
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-clay shrink-0"
              strokeWidth={2.5}
            />
            <span className="text-sm sm:text-base md:text-xl font-bold text-clay">
              {bestSupplier.discountPrice ?? bestSupplier.price}
            </span>
            <span className="text-[8px] sm:text-[10px] md:text-xs text-slate-400">
              / unit · lowest price
            </span>
          </div>

          <div className="mt-1 sm:mt-1.5 border-t border-slate-100 pt-1.5 sm:pt-2 flex flex-col gap-1 sm:gap-1.5">
            {displayedSuppliers.map((supplier, idx) => (
              <SupplierRow
                key={supplier.id}
                supplier={supplier}
                isBest={idx === 0}
              />
            ))}
          </div>

          <Link
            to={`/product/${id}`}
            className="mt-1 text-center py-1.5 sm:py-2 bg-espresso text-cream text-[8px] sm:text-[10px] md:text-xs font-semibold rounded-md sm:rounded-lg hover:bg-clay transition-all duration-300"
          >
            View all {suppliers.length} suppliers & full details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
