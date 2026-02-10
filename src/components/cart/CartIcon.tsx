"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "./CartContext";

interface CartIconProps {
  onClick: () => void;
}

export default function CartIcon({ onClick }: CartIconProps) {
  const { itemCount } = useCart();

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
      title="Open selection"
    >
      <ShoppingBag className="w-5 h-5" />
      {itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black text-[10px] font-medium text-white px-1">
          {itemCount}
        </span>
      )}
    </button>
  );
}
