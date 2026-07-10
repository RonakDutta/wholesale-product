import { useState, useEffect } from "react";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
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
      <div
        className={`fixed inset-0 bg-slate-900/40 z-40 transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setIsCartOpen(false)}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-104 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 text-clay" />
            <h2 className="text-base font-bold text-slate-900">Your Cart</h2>
            {uniqueItemCount > 0 && (
              <span className="bg-cream border border-clay/30 text-clay font-mono text-[11px] font-bold px-2 py-0.5 rounded-full">
                {uniqueItemCount} {uniqueItemCount === 1 ? "item" : "items"}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            aria-label="Close cart"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Your cart is empty
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Browse the marketplace to add items
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="mt-2 text-xs font-semibold text-clay hover:underline cursor-pointer"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item) => {
                const unitPrice =
                  item.bulkQuantity && item.quantity >= item.bulkQuantity
                    ? item.bulkPrice
                    : item.price;
                return (
                  <div
                    key={item.id}
                    className="flex gap-3 p-3 border border-slate-200 rounded-lg"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 rounded-md object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug">
                          {item.name}
                        </h3>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {item.vendorName}
                      </p>

                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center border border-slate-200 rounded-sm">
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            className="px-2 py-1.5 text-slate-500 hover:bg-slate-50 cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 text-xs font-mono font-bold text-slate-900 min-w-9 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            className="px-2 py-1.5 text-slate-500 hover:bg-slate-50 cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-mono text-sm font-bold text-clay">
                          ₹{(unitPrice * item.quantity).toLocaleString("en-IN")}
                        </span>
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
          <div className="border-t border-slate-200 bg-slate-50 p-5 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between font-mono">
              <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">
                Subtotal
              </span>
              <span className="text-xl font-black text-clay">
                ₹{subtotal.toLocaleString("en-IN")}
              </span>
            </div>
            <button className="w-full bg-clay text-white text-sm font-bold py-3 rounded-sm hover:bg-clay/90 transition-colors cursor-pointer">
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
