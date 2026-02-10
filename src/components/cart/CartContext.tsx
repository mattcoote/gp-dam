"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface CartItem {
  workId: string;
  title: string;
  artistName: string;
  imageUrlThumbnail: string | null;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (workId: string) => void;
  clearCart: () => void;
  isInCart: (workId: string) => boolean;
  itemCount: number;
  sessionId: string;
  saveSelection: (name?: string) => Promise<{ shareUrl: string; selectionId: string } | null>;
  isSaving: boolean;
  lastSavedUrl: string | null;
  lastSavedSelectionId: string | null;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "dam-cart";
const SESSION_KEY = "dam-session-id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedUrl, setLastSavedUrl] = useState<string | null>(null);
  const [lastSavedSelectionId, setLastSavedSelectionId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setSessionId(getOrCreateSessionId());
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      // Ignore corrupt data
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.workId === item.workId)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((workId: string) => {
    setItems((prev) => prev.filter((i) => i.workId !== workId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setLastSavedUrl(null);
    setLastSavedSelectionId(null);
  }, []);

  const isInCart = useCallback(
    (workId: string) => items.some((i) => i.workId === workId),
    [items]
  );

  const saveSelection = useCallback(async (name?: string) => {
    if (items.length === 0) return null;
    setIsSaving(true);
    try {
      // Create selection with first item
      const selName = name || `Selection ${new Date().toLocaleDateString()}`;
      const createRes = await fetch("/api/selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selName,
          sessionId,
          workId: items[0].workId,
        }),
      });
      const createData = await createRes.json();
      const selectionId = createData.selection.id as string;
      const shareToken = createData.selection.shareToken as string;

      // Add remaining items
      for (let i = 1; i < items.length; i++) {
        try {
          await fetch(`/api/selections/${selectionId}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workId: items[i].workId }),
          });
        } catch {
          // Skip duplicates / errors
        }
      }

      const shareUrl = `${window.location.origin}/share/${shareToken}`;
      setLastSavedUrl(shareUrl);
      setLastSavedSelectionId(selectionId);
      setIsSaving(false);
      return { shareUrl, selectionId };
    } catch (error) {
      console.error("Failed to save selection:", error);
      setIsSaving(false);
      return null;
    }
  }, [items, sessionId]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        isInCart,
        itemCount: items.length,
        sessionId,
        saveSelection,
        isSaving,
        lastSavedUrl,
        lastSavedSelectionId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
