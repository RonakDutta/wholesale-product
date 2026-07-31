import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  Truck,
  MapPin,
  Package,
  ShieldCheck,
  Star,
  IndianRupee,
} from "lucide-react";
import api from "../utils/axios";
import { toast } from "sonner";

const Stat = ({ icon: Icon, label, value }) => (
  <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-sage/20 bg-white/70 px-3 py-4 text-center">
    <Icon className="h-5 w-5 text-clay" />
    <span className="text-[10px] font-bold uppercase tracking-wider text-espresso/40">
      {label}
    </span>
    <span className="text-sm font-bold text-espresso">{value}</span>
  </div>
);

const ListingCard = ({ item }) => {
  const hasDiscount = item.discountPrice && item.discountPrice < item.price;
  const effectivePrice = hasDiscount ? item.discountPrice : item.price;

  return (
    <Link
      to={`/product/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-sage/20 bg-white/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-clay/30 hover:shadow-lg"
    >
      <div className="aspect-square overflow-hidden bg-sage/10">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-10 w-10 text-espresso/15" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-espresso/40">
          {item.category}
        </span>
        <h3 className="line-clamp-2 font-semibold text-espresso transition-colors group-hover:text-clay">
          {item.name}
        </h3>

        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="flex items-center text-lg font-bold text-espresso">
            <IndianRupee className="h-4 w-4" />
            {Number(effectivePrice).toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-espresso/40 line-through">
              ₹{Number(item.price).toFixed(2)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-espresso/50">
          <span>MOQ: {item.moq}</span>
          <span>
            {item.stock > 0 ? `${item.stock} in stock` : "Out of stock"}
          </span>
        </div>
      </div>
    </Link>
  );
};

const WholesalerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [wholesaler, setWholesaler] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchWholesaler = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/products/wholesaler/${id}`);
        if (!cancelled) setWholesaler(res.data);
      } catch (error) {
        console.error("Failed to fetch wholesaler", error);
        if (!cancelled) {
          toast.error("Wholesaler not found");
          navigate("/");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWholesaler();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-clay border-t-transparent" />
      </div>
    );
  }

  if (!wholesaler) return null;

  const location = [wholesaler.city, wholesaler.country]
    .filter(Boolean)
    .join(", ");
  const memberSince = wholesaler.memberSince
    ? new Date(wholesaler.memberSince).getFullYear()
    : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-16">
      <button
        onClick={() => navigate(-1)}
        className="group flex w-fit items-center gap-2 text-sm font-semibold text-espresso/60 transition-colors hover:text-espresso"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back
      </button>

      {/* Header */}
      <header className="rounded-2xl border border-sage/20 bg-white/80 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-clay/10 text-2xl font-black uppercase text-clay">
            {wholesaler.companyName?.[0] || "?"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-espresso sm:text-3xl">
                {wholesaler.companyName}
              </h1>
              {wholesaler.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
              )}
              {wholesaler.gstVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sage/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-espresso/70">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  GST
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-espresso/60">
              {wholesaler.contactName && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {wholesaler.contactName}
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {location}
                </span>
              )}
              {memberSince && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  Member since {memberSince}
                </span>
              )}
            </div>

            {wholesaler.totalReviews > 0 && (
              <div className="mt-3 flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-espresso">
                  {wholesaler.rating.toFixed(1)}
                </span>
                <span className="text-sm text-espresso/50">
                  ({wholesaler.totalReviews} review
                  {wholesaler.totalReviews === 1 ? "" : "s"})
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            icon={Package}
            label="Products"
            value={wholesaler.productCount}
          />
          <Stat
            icon={Truck}
            label="Orders delivered"
            value={wholesaler.fulfilledOrders ?? 0}
          />
          <Stat
            icon={Star}
            label="Rating"
            value={
              wholesaler.totalReviews > 0
                ? Number(wholesaler.rating).toFixed(1)
                : "-"
            }
          />
          <Stat
            icon={ShieldCheck}
            label="Experience"
            value={
              wholesaler.yearsInBusiness
                ? `${wholesaler.yearsInBusiness} yr`
                : "-"
            }
          />
        </div>
      </header>

      {/* Listings */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-espresso">
            Products from {wholesaler.companyName}
          </h2>
          <span className="text-sm text-espresso/50">
            {wholesaler.productCount} listing
            {wholesaler.productCount === 1 ? "" : "s"}
          </span>
        </div>

        {wholesaler.products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sage/40 py-16 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-espresso/15" />
            <p className="font-semibold text-espresso">No active listings</p>
            <p className="mt-1 text-sm text-espresso/50">
              This wholesaler has no products available right now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {wholesaler.products.map((item) => (
              <ListingCard key={item.inventoryId} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default WholesalerProfile;
