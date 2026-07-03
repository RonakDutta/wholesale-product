import { ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";

const CartButton = () => {
  const { itemCount, setIsCartOpen } = useCart();

  return (
    <button
      onClick={() => setIsCartOpen(true)}
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-30 flex items-center gap-2 bg-espresso text-cream pl-4 pr-5 py-3 rounded-full shadow-lg hover:bg-clay transition-colors cursor-pointer"
      aria-label="Open cart"
    >
      <div className="relative">
        <ShoppingBag className="w-5 h-5" />
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-clay text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
            {itemCount > 9 ? "9+" : itemCount}
          </span>
        )}
      </div>
      <span className="text-sm font-semibold hidden sm:inline">Cart</span>
    </button>
  );
};

export default CartButton;
