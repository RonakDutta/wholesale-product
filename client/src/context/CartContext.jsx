/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);
const STORAGE_KEY = "wholesale_cart_v1";

// A listing belongs to the signed-in user when its seller id matches theirs.
// `supplier.supplierId` is the seller's user id (`supplier.id` is the
// inventory row id), so check the seller fields in order of specificity.
const isOwnListing = (userId, product, supplier) => {
  if (!userId) return false;
  const sellerId =
    supplier?.supplierId ??
    supplier?.vendorId ??
    product?.supplierId ??
    product?.vendorId;
  return sellerId != null && String(sellerId) === String(userId);
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage unavailable (private browsing, etc.) — fail silently
    }
  }, [items]);

  const addToCart = (product, quantity = 1, supplier = null) => {
    // Sellers cannot buy their own listings (the backend rejects such orders
    // too); block it here so it never reaches the cart.
    if (isOwnListing(user?.id, product, supplier)) {
      toast.error("You can't add your own listing to the cart");
      return false;
    }

    const itemId = supplier ? `${product.id}#${supplier.id}` : product.id;
    const itemPrice = supplier?.price ?? product.price ?? 0;
    const itemBulkPrice =
      supplier?.discountPrice ?? product.bulkPrice ?? itemPrice;
    const itemBulkQuantity = supplier?.moq ?? product.bulkQuantity ?? 1;
    const itemVendorName =
      supplier?.name ?? product.vendorName ?? "Unknown Vendor";
    const itemVendorId = supplier?.id ?? product.vendorId ?? "";

    setItems((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (existing) {
        return prev.map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [
        ...prev,
        {
          id: itemId,
          productId: product.id,
          supplierId: supplier?.id ?? null,
          name: product.name,
          image: product.image,
          vendorName: itemVendorName,
          vendorId: itemVendorId,
          price: itemPrice,
          bulkPrice: itemBulkPrice,
          bulkQuantity: itemBulkQuantity,
          quantity,
        },
      ];
    });
    setIsCartOpen(true);
    return true;
  };

  const removeFromCart = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id, quantity) => {
    if (quantity < 1) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
  };

  const clearCart = () => setItems([]);

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const uniqueItemCount = items.length;

  const subtotal = useMemo(
    () =>
      items.reduce((sum, i) => {
        const unitPrice =
          i.bulkQuantity && i.quantity >= i.bulkQuantity
            ? i.bulkPrice
            : i.price;
        return sum + unitPrice * i.quantity;
      }, 0),
    [items],
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        // Lets the UI hide/disable buy actions on the user's own listings
        isOwnListing: (product, supplier) =>
          isOwnListing(user?.id, product, supplier),
        removeFromCart,
        updateQuantity,
        clearCart,
        itemCount,
        uniqueItemCount,
        subtotal,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
};
