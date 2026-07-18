import { useEffect, useState } from "react";
import { Gift, Sparkles, Ticket, Crown, Users, ArrowRight } from "lucide-react";
import api from "../../utils/axios";

const Promotions = () => {
  const [flashSales, setFlashSales] = useState([]);
  const [couponSummary, setCouponSummary] = useState(null);
  const [loyalty, setLoyalty] = useState(null);
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [flashRes, couponRes, loyaltyRes, giftRes] = await Promise.all([
          api.get("/api/promotions/flash-sales?active=true"),
          api.get("/api/promotions/coupons/validate", {
            params: { couponCode: "WELCOME10", subtotal: 1000 },
          }),
          api.get("/api/promotions/loyalty"),
          api.get("/api/promotions/gift-cards/balance"),
        ]);
        setFlashSales(flashRes.data || []);
        setCouponSummary(couponRes.data);
        setLoyalty(loyaltyRes.data.account);
        setGiftCards(giftRes.data.giftCards || []);
      } catch (error) {
        console.error("Failed to load promotions", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-clay border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const summaryCards = [
    {
      title: "Flash Sales",
      value: flashSales.length,
      icon: Sparkles,
      color: "from-amber-500 to-orange-500",
      text: "Live campaigns",
    },
    {
      title: "Active Coupon",
      value: couponSummary?.valid ? "Yes" : "No",
      icon: Ticket,
      color: "from-emerald-500 to-green-500",
      text: couponSummary?.coupon?.code || "Sample coupon",
    },
    {
      title: "Loyalty Points",
      value: loyalty?.points_balance || 0,
      icon: Crown,
      color: "from-violet-500 to-purple-500",
      text: loyalty?.membership_tier || "Bronze",
    },
    {
      title: "Gift Cards",
      value: giftCards.length,
      icon: Gift,
      color: "from-sky-500 to-blue-500",
      text: "Available balances",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-linear-to-r from-clay/10 to-amber-50 p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-clay">
              Retail Promotions
            </p>
            <h2 className="text-2xl font-black text-espresso">
              Drive more revenue with deals, rewards, and gift cards
            </h2>
          </div>
          <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-clay" />
              Buyer retention tools in one place
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div
                className={`inline-flex rounded-xl bg-linear-to-r ${card.color} p-2 text-white`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-500">
                {card.title}
              </p>
              <p className="mt-1 text-2xl font-black text-espresso">
                {card.value}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {card.text}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-espresso">
              Live Flash Sales
            </h3>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700">
              Active now
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {flashSales.length ? (
              flashSales.map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{sale.name}</p>
                      <p className="text-sm text-slate-500">
                        {sale.description || "Seasonal promo"}
                      </p>
                    </div>
                    <div className="rounded-full bg-amber-500 px-3 py-1 text-sm font-semibold text-white">
                      {sale.discount_value}% Off
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No live flash sales at the moment.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-espresso">Quick Actions</h3>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <span className="text-sm font-semibold text-slate-700">
                Create coupon
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <span className="text-sm font-semibold text-slate-700">
                Launch referral reward
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <span className="text-sm font-semibold text-slate-700">
                Issue gift card
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Promotions;
