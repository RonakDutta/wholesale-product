import { Link } from "react-router-dom";
import { ShieldCheck, MapPin, IndianRupee } from "lucide-react";
import ContactVendorBtn from "./ContactVendorBtn";

const ProductCard = ({ product }) => {
  const {
    id = "",
    name = "Untitled Product",
    price = 0,
    vendorName = "Unknown Vendor",
    vendorId = "",
    location = "India",
    supplySignal = "In stock",
    verified = false,
    moq = "",
    specs = "",
    bulkPrice,
    bulkQuantity,
    image = "https://placehold.co/400x300/e2e8f0/1e293b?text=Image",
  } = product;

  return (
    <div className="bg-white border border-slate-200 rounded-lg sm:rounded-xl overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:border-sage/50 hover:-translate-y-1 group">
      <Link
        to={`/product/${id}`}
        className="flex flex-col flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay"
        aria-label={`View details for ${name}`}
      >
        <div className="relative w-full aspect-4/3 bg-slate-100 overflow-hidden">
          <img
            src={image}
            alt={name}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          />

          <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 bg-white/90 backdrop-blur-sm text-slate-700 text-[7px] sm:text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full border border-slate-200 shadow-sm whitespace-nowrap">
            {supplySignal}
          </div>

          {/* Verified stamp – only show if verified; shortened label on mobile */}
          {verified && (
            <div className="cursor-default absolute bottom-1.5 left-1.5 sm:bottom-2.5 sm:left-2.5 flex items-center gap-0.5 sm:gap-1 bg-white border border-emerald-600 text-emerald-700 text-[7px] sm:text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full shadow-sm whitespace-nowrap">
              <ShieldCheck
                className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 shrink-0"
                strokeWidth={2.5}
              />
              <span className="hidden sm:inline">Verified supplier</span>
              <span className="sm:hidden">Verified</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-2 pt-3 sm:p-3 sm:pt-4 md:p-4 md:pt-5 flex flex-col flex-1 gap-1 sm:gap-1.5 md:gap-2">
          <div className="flex items-center gap-1 text-slate-400 text-[7px] sm:text-[9px] md:text-[10px] font-semibold uppercase tracking-wider overflow-hidden">
            <span className="text-slate-600 truncate min-w-0">{vendorName}</span>
            <span className="text-slate-300 shrink-0">•</span>
            <MapPin className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0" />
            <span className="truncate min-w-0">{location}</span>
          </div>

          <h3 className="text-[11px] sm:text-xs md:text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-clay transition-colors">
            {name}
          </h3>

          {(moq || specs) && (
            <div className="font-mono text-[7px] sm:text-[9px] md:text-[10px] text-slate-500 truncate">
              {moq && <span>MOQ {moq}</span>}
              {moq && specs && <span> · </span>}
              {specs && <span>{specs}</span>}
            </div>
          )}

          <div className="mt-auto pt-1.5 sm:pt-2 md:pt-3 border-t border-slate-100">
            <div className="flex items-baseline gap-0.5 sm:gap-1 font-mono">
              <IndianRupee
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-clay shrink-0"
                strokeWidth={2.5}
              />
              <span className="text-sm sm:text-base md:text-xl font-bold text-clay">
                {price}
              </span>
              <span className="text-[8px] sm:text-[10px] md:text-xs text-slate-400">
                / unit
              </span>
            </div>
            {bulkPrice && bulkQuantity && (
              <div className="font-mono text-[7px] sm:text-[8px] md:text-[11.5px] text-slate-400 mt-0.5 truncate">
                ₹{bulkPrice}/unit at {bulkQuantity}+ units
              </div>
            )}
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-1 sm:gap-1.5 md:gap-2 px-2 pb-2 sm:px-3 sm:pb-3 md:px-4 md:pb-4">
        <ContactVendorBtn
          vendorId={vendorId}
          vendorName={vendorName}
          productName={name}
        />
        <button className="flex items-center justify-center gap-0.5 sm:gap-1 md:gap-1.5 py-1 sm:py-1.5 md:py-2 bg-espresso text-cream text-[8px] sm:text-[10px] md:text-xs font-semibold rounded-md sm:rounded-lg hover:bg-clay transition-all duration-300 cursor-pointer">
          <IndianRupee className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 shrink-0" />
          <span className="font-bold uppercase tracking-wide">Buy</span>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
