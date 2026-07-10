import { useState, useEffect } from "react";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "../context/CartContext";

const CartDrawer = () => {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    subtotal,
    uniqueItemCount,
  } = useCart();

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isCartOpen) {
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsVisible(false);
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-all duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setIsCartOpen(false)}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-md bg-slate-50/95 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-clay/10 p-2 rounded-lg text-clay">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-900">Your Cart</h2>
            {uniqueItemCount > 0 && (
              <span className="bg-clay text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ml-1 shadow-sm">
                {uniqueItemCount} {uniqueItemCount === 1 ? "Item" : "Items"}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items Area */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 gap-4">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-2">
                <ShoppingBag className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">
                  Your cart is empty
                </p>
                <p className="text-sm text-slate-500 mt-1.5 max-w-50 mx-auto">
                  Looks like you haven't added anything to your cart yet.
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="mt-4 flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:border-clay hover:text-clay text-slate-700 text-sm font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Start Shopping
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4">
              {items.map((item) => {
                const unitPrice =
                  item.bulkQuantity && item.quantity >= item.bulkQuantity
                    ? item.bulkPrice
                    : item.price;

                return (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 bg-white border border-slate-100 shadow-sm rounded-xl hover:border-slate-200 transition-colors group"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 rounded-lg object-cover border border-slate-100 bg-slate-50"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug pr-2">
                            {item.name}
                          </h3>
                          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-1">
                            {item.vendorName}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 -mr-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer shrink-0"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-end justify-between mt-auto pt-3">
                        {/* Quantity Pill */}
                        <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            className="p-1.5 sm:p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 sm:w-10 text-xs font-mono font-bold text-slate-800 text-center select-none">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            className="p-1.5 sm:p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer border-l border-slate-100"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-col items-end">
                          <span className="font-mono text-base font-black text-clay tracking-tight">
                            ₹
                            {(unitPrice * item.quantity).toLocaleString(
                              "en-IN",
                            )}
                          </span>
                          {/* Optional: Show unit price if multiple items are selected */}
                          {item.quantity > 1 && (
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                              ₹{unitPrice.toLocaleString("en-IN")} each
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="bg-white border-t border-slate-200 p-5 sm:p-6 shrink-0 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex items-end justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-sm text-slate-500 font-semibold">
                  Subtotal
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Taxes and shipping calculated at checkout
                </span>
              </div>
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                ₹{subtotal.toLocaleString("en-IN")}
              </span>
            </div>
            <button className="w-full flex items-center justify-center gap-2 bg-clay text-white text-sm font-bold py-3.5 rounded-xl hover:bg-clay/90 hover:shadow-lg hover:shadow-clay/20 transition-all cursor-pointer active:scale-[0.98]">
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
