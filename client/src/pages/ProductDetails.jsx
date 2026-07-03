import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ShieldCheck,
  MapPin,
  IndianRupee,
  ArrowLeft,
  Package,
  Boxes,
  Layers,
  Store,
  Activity,
} from "lucide-react";
import ContactVendorBtn from "../components/ContactVendorBtn";
import mockProducts from "../utils/mockProducts";

const ProductNotFound = () => (
  <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
    <div className="text-5xl font-black text-espresso/20">404</div>
    <h1 className="text-xl font-bold text-espresso">Product not found</h1>
    <p className="max-w-sm text-sm text-espresso/60">
      The product you&apos;re looking for doesn&apos;t exist or may have been
      removed from the marketplace.
    </p>
    <Link
      to="/"
      className="mt-2 inline-flex items-center gap-2 rounded-lg bg-espresso px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-clay"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to marketplace
    </Link>
  </div>
);

const SpecRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-3">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-sage" strokeWidth={2.25} />
    <div className="flex flex-1 flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-espresso/50">
        {label}
      </span>
      <span className="text-sm font-medium text-espresso">{value}</span>
    </div>
  </div>
);

const ProductDetails = () => {
  const { id } = useParams();

  const product = useMemo(
    () => mockProducts.find((p) => p.id === id),
    [id],
  );

  if (!product) return <ProductNotFound />;

  const {
    name,
    price,
    vendorName,
    vendorId,
    location,
    supplySignal,
    verified,
    moq,
    specs,
    bulkPrice,
    bulkQuantity,
    category,
    image = "https://placehold.co/800x600/e2e8f0/1e293b?text=Image",
  } = product;

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-espresso/70 transition-colors hover:text-clay"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to marketplace
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
        {/* Image */}
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover"
          />
          <div className="absolute right-3 top-3 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur-sm">
            {supplySignal}
          </div>
          {verified && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full border border-emerald-600 bg-white px-3 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
              <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
              Verified supplier
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          {category && (
            <span className="w-fit rounded-full bg-sage/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sage">
              {category}
            </span>
          )}

          <h1 className="text-2xl font-black leading-tight text-espresso sm:text-3xl">
            {name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-espresso/70">
            <span className="flex items-center gap-1.5 font-semibold text-espresso">
              <Store className="h-4 w-4 text-sage" />
              {vendorName}
            </span>
            <span className="text-espresso/30">•</span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {location}
            </span>
          </div>

          {/* Pricing */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-baseline gap-1 font-mono">
              <IndianRupee
                className="h-6 w-6 text-clay"
                strokeWidth={2.5}
              />
              <span className="text-3xl font-black text-clay">{price}</span>
              <span className="text-sm text-slate-400">/ unit</span>
            </div>
            {bulkPrice && bulkQuantity && (
              <div className="mt-2 flex items-center gap-1.5 font-mono text-sm text-espresso/60">
                <Boxes className="h-4 w-4 text-sage" />
                <span>
                  ₹{bulkPrice}/unit at {bulkQuantity}+ units
                </span>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <ContactVendorBtn
                vendorId={vendorId}
                vendorName={vendorName}
                productName={name}
              />
              <button className="flex items-center justify-center gap-1.5 rounded-lg bg-espresso py-3 text-sm font-bold uppercase tracking-wide text-cream transition-all duration-300 hover:bg-clay">
                <IndianRupee className="h-4 w-4" />
                Buy
              </button>
            </div>
          </div>

          {/* Specs */}
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-5">
            <SpecRow icon={Activity} label="Supply signal" value={supplySignal} />
            {moq && (
              <SpecRow icon={Package} label="Minimum order quantity" value={moq} />
            )}
            {specs && (
              <SpecRow icon={Layers} label="Specifications" value={specs} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
