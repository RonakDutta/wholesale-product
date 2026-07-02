import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, IndianRupee, MapPin, MessageCircle } from "lucide-react";
import ProductCard from "../components/ProductCard";

const cities = [
  { name: "Delhi", multiplier: 1 },
  { name: "Mumbai", multiplier: 1.08 },
  { name: "Bengaluru", multiplier: 1.05 },
  { name: "Patna", multiplier: 0.92 },
];

const featuredProducts = [
  {
    id: 1,
    name: "Cotton Fabric Roll",
    min: 180,
    max: 220,
    unit: "/ m",
    moq: "MOQ 50",
    image: "https://picsum.photos/seed/product-1/400/400",
  },
  {
    id: 2,
    name: "Steel Utensil Set",
    min: 340,
    max: 390,
    unit: "/ pc",
    moq: "MOQ 20",
    image: "https://picsum.photos/seed/product-2/400/400",
  },
  {
    id: 3,
    name: "Packaged Snacks",
    min: 12,
    max: 15,
    unit: "/ unit",
    moq: "MOQ 500",
    image: "https://picsum.photos/seed/product-3/400/400",
  },
  {
    id: 4,
    name: "Plastic Storage Bins",
    min: 95,
    max: 120,
    unit: "/ pc",
    moq: "MOQ 100",
    image: "https://picsum.photos/seed/product-4/400/400",
  },
];

const trendingProducts = [
  {
    id: 5,
    name: "LED Bulb Pack",
    min: 60,
    max: 75,
    unit: "/ pc",
    image: "https://picsum.photos/seed/product-5/400/400",
  },
  {
    id: 6,
    name: "Cardboard Boxes",
    min: 8,
    max: 11,
    unit: "/ pc",
    image: "https://picsum.photos/seed/product-6/400/400",
  },
  {
    id: 7,
    name: "Cotton Bedsheets",
    min: 210,
    max: 260,
    unit: "/ pc",
    image: "https://picsum.photos/seed/product-7/400/400",
  },
  {
    id: 8,
    name: "Spice Packets",
    min: 25,
    max: 30,
    unit: "/ pc",
    image: "https://picsum.photos/seed/product-8/400/400",
  },
];

const categories = ["Electronics", "Textiles", "FMCG", "Hardware", "Grocery"];

const trustPoints = [
  {
    icon: ShieldCheck,
    title: "Verified wholesalers",
    desc: "Manually reviewed sellers",
  },
  {
    icon: IndianRupee,
    title: "UPI payments",
    desc: "Secure, direct settlement",
  },
  { icon: MapPin, title: "Location-based pricing", desc: "Fair rates by zone" },
  {
    icon: MessageCircle,
    title: "Direct chat",
    desc: "Talk to the seller directly",
  },
];

export default function Home() {
  const [cityIndex, setCityIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCityIndex((i) => (i + 1) % cities.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const multiplier = cities[cityIndex].multiplier;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <section className="mb-12">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-espresso mb-3 tracking-tight">
          Wholesale, without the middleman
        </h1>
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <p className="text-espresso/60">
            Verified wholesalers · Pay by UPI · Chat direct
          </p>
          <button
            onClick={() => setCityIndex((i) => (i + 1) % cities.length)}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-espresso/60 border border-espresso/15 rounded-full px-3 py-1 hover:border-espresso/30 transition-colors"
          >
            <MapPin size={12} />
            Prices for {cities[cityIndex].name}
            <span className="text-espresso/30">· tap to change</span>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 pt-2">
          {featuredProducts.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              multiplier={multiplier}
              index={i}
            />
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-display text-xl text-espresso mb-4">Categories</h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {categories.map((c) => (
            <Link
              key={c}
              to={`/browse?category=${c.toLowerCase()}`}
              className="whitespace-nowrap text-sm border border-sage/30 text-espresso rounded-full px-4 py-2 hover:bg-sage/10 transition-colors"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12 grid grid-cols-2 lg:grid-cols-4 gap-6">
        {trustPoints.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full border border-sage/40 flex items-center justify-center shrink-0">
              <Icon className="text-sage" size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-espresso">{title}</p>
              <p className="text-xs text-espresso/50">{desc}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mb-12">
        <h2 className="font-display text-xl text-espresso mb-4">
          Trending this week
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {trendingProducts.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              multiplier={multiplier}
              index={i}
            />
          ))}
        </div>
      </section>

      <section className="relative bg-paper-card border-2 border-dashed border-espresso/15 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="shrink-0 w-16 h-16 rounded-full border-2 border-clay flex items-center justify-center -rotate-6">
            <span className="font-mono text-[10px] text-clay font-semibold text-center leading-tight">
              SELL
              <br />
              HERE
            </span>
          </div>
          <div>
            <p className="font-display text-lg text-espresso">
              Are you a wholesaler?
            </p>
            <p className="text-sm text-espresso/60">
              List your products and reach retailers directly.
            </p>
          </div>
        </div>
        <Link
          to="/sell"
          className="bg-espresso text-paper-card text-sm font-medium px-5 py-2.5 rounded-lg whitespace-nowrap hover:bg-espresso/90 transition-colors"
        >
          Start selling
        </Link>
      </section>
    </div>
  );
}
