import React from "react";
import { MessageCircle, ShieldCheck, MapPin, IndianRupee } from "lucide-react";

const ProductCard = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col h-full transition-all duration-200 hover:shadow-lg hover:border-slate-300">
      {/* Image */}
      <div className="relative w-full aspect-4/3 bg-slate-100">
        <img
          src="https://placehold.co/400x300/e2e8f0/1e293b?text=Image"
          alt="Premium industrial packaging cartons"
          className="object-cover w-full h-full"
        />

        {/* Supply signal, top right, quiet */}
        <div className="absolute top-2 right-2 bg-white/95 text-slate-600 text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-sm border border-slate-200">
          High supply
        </div>

        {/* Verified stamp, overlapping the image edge like a rubber stamp */}
        <div className="absolute -bottom-2.5 left-2 sm:left-3 flex items-center gap-1 bg-white border border-emerald-600 text-emerald-700 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full shadow-sm">
          <ShieldCheck
            className="w-2.5 h-2.5 sm:w-3 sm:h-3"
            strokeWidth={2.5}
          />
          <span>Verified supplier</span>
        </div>
      </div>

      <div className="p-2.5 sm:p-3.5 pt-4 sm:pt-5 flex flex-col flex-1 gap-1.5 sm:gap-2">
        {/* Supplier line */}
        <div className="flex items-center gap-1 text-slate-400 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide">
          <span className="text-slate-600">Apex Traders</span>
          <span className="text-slate-300">•</span>
          <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
          <span>Ahmedabad, GJ</span>
        </div>

        {/* Title */}
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
          Premium Industrial Packaging Cartons
        </h3>

        {/* Spec line, ledger style */}
        <div className="font-mono text-[9px] sm:text-[10px] text-slate-500">
          MOQ 500 units · 3-ply corrugated
        </div>

        {/* Price block */}
        <div className="mt-auto pt-1.5 sm:pt-2 border-t border-slate-100">
          <div className="flex items-baseline gap-1 font-mono">
            <IndianRupee
              className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 shrink-0"
              strokeWidth={2.5}
            />
            <span className="text-base sm:text-xl font-bold text-amber-600">
              45
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400">
              / unit
            </span>
          </div>
          <div className="font-mono text-[10px] sm:text-[12px] text-slate-400 mt-0.5">
            ₹42/unit at 1,000+ units
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
          <button className="flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 border border-slate-300 text-slate-700 text-[10px] sm:text-xs font-semibold rounded-sm hover:bg-slate-50 transition-colors cursor-pointer">
            <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>Message</span>
          </button>
          <button className="flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 bg-clay text-white text-[10px] sm:text-xs font-semibold rounded-sm hover:bg-clay/90 transition-colors cursor-pointer">
            <span>Get quote</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
