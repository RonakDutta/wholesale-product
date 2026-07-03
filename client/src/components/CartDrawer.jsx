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
    itemCount,
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/40 z-40"
        onClick={() => setIsCartOpen(false)}
      />
      <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-clay" />
            <h2 className="text-sm font-bold text-slate-900">
              Cart ({itemCount})
            </h2>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Close cart"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16 text-slate-400">
              <ShoppingBag className="w-8 h-8 mb-2" />
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            items.map((item) => {
              const unitPrice =
                item.bulkQuantity && item.quantity >= item.bulkQuantity
                  ? item.bulkPrice
                  : item.price;
              return (
                <div key={item.id} className="flex gap-3 px-4 py-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-14 h-14 rounded-md object-cover border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug">
                      {item.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {item.vendorName}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-slate-200 rounded-sm">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          className="px-1.5 py-1 text-slate-500 hover:bg-slate-50 cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-mono font-bold text-slate-900 min-w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          className="px-1.5 py-1 text-slate-500 hover:bg-slate-50 cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-mono text-xs font-bold text-clay">
                        ₹{(unitPrice * item.quantity).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-200 p-4 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between font-mono">
              <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">
                Subtotal
              </span>
              <span className="text-lg font-black text-clay">
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
