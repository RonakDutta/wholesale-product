import { useState } from "react";
import { Package } from "lucide-react";
import { formatINR } from "../utils/format";

export default function ProductCard({ product, multiplier = 1, index = 0 }) {
  const [imgError, setImgError] = useState(false);
  const min = Math.round(product.min * multiplier);
  const max = Math.round(product.max * multiplier);
  const tilt = index % 2 === 0 ? "-rotate-1" : "rotate-1";
  const showImage = product.image && !imgError;

  return (
    <div
      className={`relative bg-paper-card border border-espresso/10 rounded-lg ${tilt} hover:rotate-0 transition-transform duration-200`}
    >
      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-cream border border-espresso/15 z-10" />
      <div className="aspect-square bg-cream rounded-t-lg overflow-hidden border-b border-dashed border-espresso/20">
        {showImage ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="text-espresso/25" size={26} />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm text-espresso truncate">{product.name}</p>
        <p className="font-mono text-sm font-medium text-espresso mt-1">
          {formatINR(min)}–{formatINR(max)}{" "}
          <span className="font-body text-espresso/40">{product.unit}</span>
        </p>
        {product.moq && (
          <span className="inline-block mt-2 border-2 border-clay text-clay text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 -rotate-2 rounded-sm">
            {product.moq}
          </span>
        )}
      </div>
    </div>
  );
}
