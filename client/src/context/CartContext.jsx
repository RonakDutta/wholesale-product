/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "wholesale_cart_v1";

export const CartProvider = ({ children }) => {
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
