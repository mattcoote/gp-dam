"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Share2,
  Trash2,
  GripVertical,
  Pencil,
  Download,
  FileSpreadsheet,
  MessageSquare,
  X,
} from "lucide-react";
import Link from "next/link";

interface Work {
  id: string;
  gpSku: string;
  title: string;
  artistName: string;
  workType: string;
  orientation: string;
  dimensionsInches: { width: number; height: number } | null;
  imageUrlThumbnail: string;
  imageUrlPreview: string;
  aiTagsHero: string[];
  retailerExclusive: string | null;
}

interface SelectionItem {
  id: string;
  workId: string;
  position: number;
  notes: string | null;
  work: Work;
}

interface Selection {
  id: string;
  name: string;
  notes: string | null;
  shareToken: string;
  items: SelectionItem[];
}

export default function SelectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const selectionId = params.id as string;

  const [selection, setSelection] = useState<Selection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editItemNotes, setEditItemNotes] = useState<string | null>(null);
  const [itemNoteText, setItemNoteText] = useState("");
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchSelection = useCallback(async () => {
    try {
      const res = await fetch(`/api/selections/${selectionId}`);
      if (!res.ok) {
        router.push("/");
        return;
      }
      const data = await res.json();
      setSelection(data.selection);
    } catch {
      router.push("/");
    }
    setIsLoading(false);
  }, [selectionId, router]);

  useEffect(() => {
    fetchSelection();
  }, [fetchSelection]);

  async function updateName() {
    if (!editName.trim() || !selection) return;
    await fetch(`/api/selections/${selectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setSelection({ ...selection, name: editName.trim() });
    setIsEditingName(false);
  }

  async function updateNotes() {
    if (!selection) return;
    await fetch(`/api/selections/${selectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: editNotes.trim() || null }),
    });
    setSelection({ ...selection, notes: editNotes.trim() || null });
    setIsEditingNotes(false);
  }

  async function removeItem(itemId: string) {
    await fetch(`/api/selections/${selectionId}/items/${itemId}`, {
      method: "DELETE",
    });
    fetchSelection();
  }

  async function updateItemNotes(itemId: string) {
    await fetch(`/api/selections/${selectionId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: itemNoteText.trim() || null }),
    });
    setEditItemNotes(null);
    fetchSelection();
  }

  async function deleteSelection() {
    if (!confirm("Are you sure you want to delete this selection?")) return;
    await fetch(`/api/selections/${selectionId}`, { method: "DELETE" });
    router.push("/");
  }

  function copyShareLink() {
    if (!selection) return;
    const url = `${window.location.origin}/share/${selection.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function handleDrop(targetItemId: string) {
    if (!draggedItem || !selection || draggedItem === targetItemId) return;

    const items = [...selection.items];
    const dragIdx = items.findIndex((i) => i.id === draggedItem);
    const dropIdx = items.findIndex((i) => i.id === targetItemId);

    if (dragIdx === -1 || dropIdx === -1) return;

    const [moved] = items.splice(dragIdx, 1);
    items.splice(dropIdx, 0, moved);

    // Update positions locally for instant feedback
    const reordered = items.map((item, i) => ({ ...item, position: i }));
    setSelection({ ...selection, items: reordered });
    setDraggedItem(null);

    // Send to API
    await fetch(`/api/selections/${selectionId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: reordered.map((i) => i.id) }),
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-black rounded-full" />
      </div>
    );
  }

  if (!selection) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") updateName();
                      if (e.key === "Escape") setIsEditingName(false);
                    }}
                    autoFocus
                    className="text-xl font-semibold border-b-2 border-black focus:outline-none bg-transparent"
                  />
                  <button
                    onClick={updateName}
                    className="text-sm text-gray-500 hover:text-black"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <h1
                  className="text-xl font-semibold cursor-pointer hover:text-gray-600 flex items-center gap-2 group"
                  onClick={() => {
                    setEditName(selection.name);
                    setIsEditingName(true);
                  }}
                >
                  {selection.name}
                  <Pencil className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h1>
              )}

              <span className="text-sm text-gray-400">
                {selection.items.length} work
                {selection.items.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/api/selections/${selectionId}/export/pdf`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                PDF
              </Link>
              <Link
                href={`/api/selections/${selectionId}/export/excel`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </Link>
              <button
                onClick={copyShareLink}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                  copiedLink
                    ? "bg-green-50 text-green-700"
                    : "bg-black text-white hover:bg-gray-800"
                }`}
              >
                <Share2 className="w-4 h-4" />
                {copiedLink ? "Copied!" : "Share"}
              </button>
              <button
                onClick={deleteSelection}
                className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                title="Delete selection"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Selection notes */}
          <div className="mt-2">
            {isEditingNotes ? (
              <div className="flex gap-2 items-start">
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes about this selection..."
                  rows={2}
                  autoFocus
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
                />
                <div className="flex flex-col gap-1">
                  <button
                    onClick={updateNotes}
                    className="text-xs px-3 py-1 bg-black text-white rounded-md hover:bg-gray-800"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingNotes(false)}
                    className="text-xs px-3 py-1 text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditNotes(selection.notes || "");
                  setIsEditingNotes(true);
                }}
                className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {selection.notes || "Add notes..."}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Items Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {selection.items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-4">
              This selection is empty
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
            >
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {selection.items.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDraggedItem(item.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(item.id)}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  draggedItem === item.id
                    ? "border-black/20 bg-gray-50 opacity-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                {/* Drag handle */}
                <div className="pt-2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Thumbnail */}
                <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={item.work.imageUrlThumbnail || ""}
                    alt={item.work.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {item.work.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {item.work.artistName}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">
                          {item.work.gpSku}
                        </span>
                        <span className="text-xs text-gray-400 capitalize">
                          {item.work.workType.replace(/_/g, " ")}
                        </span>
                        {item.work.dimensionsInches && (
                          <span className="text-xs text-gray-400">
                            {item.work.dimensionsInches.width}&quot; &times;{" "}
                            {item.work.dimensionsInches.height}&quot;
                          </span>
                        )}
                        {item.work.retailerExclusive && (
                          <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">
                            {item.work.retailerExclusive} Exclusive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Item notes */}
                  {editItemNotes === item.id ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={itemNoteText}
                        onChange={(e) => setItemNoteText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") updateItemNotes(item.id);
                          if (e.key === "Escape") setEditItemNotes(null);
                        }}
                        placeholder="Add a note about this work..."
                        autoFocus
                        className="flex-1 text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black/10"
                      />
                      <button
                        onClick={() => updateItemNotes(item.id)}
                        className="text-xs px-2 py-1 bg-black text-white rounded-md"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditItemNotes(item.id);
                        setItemNoteText(item.notes || "");
                      }}
                      className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" />
                      {item.notes || "Add note..."}
                    </button>
                  )}
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  title="Remove from selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
