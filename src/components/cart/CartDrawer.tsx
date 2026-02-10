"use client";

import { useEffect } from "react";
import { X, Trash2, Download, ExternalLink, Pencil } from "lucide-react";
import { useCart } from "./CartContext";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, clearCart, saveSelection, isSaving, lastSavedSelectionId } = useCart();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  async function ensureSaved(): Promise<{ selectionId: string; shareToken: string } | null> {
    if (lastSavedSelectionId) {
      const res = await fetch(`/api/selections/${lastSavedSelectionId}`);
      const data = await res.json();
      return { selectionId: lastSavedSelectionId, shareToken: data.selection.shareToken };
    }
    const result = await saveSelection();
    if (!result) return null;
    const res = await fetch(`/api/selections/${result.selectionId}`);
    const data = await res.json();
    return { selectionId: result.selectionId, shareToken: data.selection.shareToken };
  }

  async function handleViewSelection() {
    const saved = await ensureSaved();
    if (saved) {
      window.open(`/share/${saved.shareToken}`, "_blank");
    }
  }

  async function handleEditSelection() {
    const saved = await ensureSaved();
    if (saved) {
      window.open(`/selections/${saved.selectionId}`, "_blank");
    }
  }

  async function handleDownloadPdf() {
    const saved = await ensureSaved();
    if (saved) {
      window.open(`/api/selections/${saved.selectionId}/export/pdf`, "_blank");
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">
            Selection{items.length > 0 && <span className="text-gray-400 ml-2 text-sm font-normal">{items.length} work{items.length !== 1 ? "s" : ""}</span>}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <p className="text-gray-400 text-sm">Your selection is empty</p>
              <p className="text-gray-300 text-xs mt-1">
                Click the + on any artwork to add it
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((item) => (
                <div key={item.workId} className="flex items-center gap-4 px-6 py-3">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {item.imageUrlThumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrlThumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-gray-400 truncate">{item.artistName}</p>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.workId)}
                    className="p-2 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                    title="Remove from selection"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-4 space-y-2">
            {/* View Selection */}
            <button
              onClick={handleViewSelection}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  View Selection
                </>
              )}
            </button>

            {/* Edit & Share + PDF */}
            <div className="flex gap-2">
              <button
                onClick={handleEditSelection}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit &amp; Share
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
            </div>

            {/* Clear */}
            <button
              onClick={clearCart}
              className="w-full px-4 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
    </>
  );
}
