import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Product } from "@/lib/mock-data";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("mz_cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("mz_cart", JSON.stringify(items));
  }, [items]);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const variantLabel = (product as any).variantLabel;
      const existing = prev.find((i) =>
        i.product.id === product.id &&
        ((product as any).variantLabel
          ? (i.product as any).variantLabel === variantLabel
          : !(i.product as any).variantLabel)
      );
      if (existing) {
        return prev.map((i) => {
          const sameId = i.product.id === product.id;
          const sameVariant = variantLabel
            ? (i.product as any).variantLabel === variantLabel
            : !(i.product as any).variantLabel;
          return sameId && sameVariant ? { ...i, quantity: i.quantity + quantity } : i;
        });
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string, variantLabel?: string) => {
    setItems((prev) => prev.filter((i) => {
      if (i.product.id !== productId) return true;
      if (variantLabel !== undefined) {
        return (i.product as any).variantLabel !== variantLabel;
      }
      return false;
    }));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, variantLabel?: string) => {
    setItems((prev) => {
      const positiveQty = Math.max(0, quantity);
      if (positiveQty === 0) {
        return prev.filter((i) => {
          if (i.product.id !== productId) return true;
          if (variantLabel !== undefined) {
            return (i.product as any).variantLabel !== variantLabel;
          }
          return false;
        });
      }
      return prev.map((i) => {
        if (i.product.id !== productId) return i;
        const sameVariant = variantLabel !== undefined
          ? (i.product as any).variantLabel === variantLabel
          : !(i.product as any).variantLabel;
        return sameVariant ? { ...i, quantity: positiveQty } : i;
      });
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem("mz_cart");
  }, []);

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const count = items.reduce(
    (sum, item) => (item.product as any).isDiscount ? sum : sum + item.quantity,
    0
  );

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      total,
      count,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
