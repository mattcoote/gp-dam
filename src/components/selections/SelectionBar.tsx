"use client";

import { useState, useEffect } from "react";
import { FolderOpen, FolderPlus, ChevronRight, Share2 } from "lucide-react";
import Link from "next/link";

interface SelectionSummary {
  id: string;
  name: string;
  shareToken: string;
  items: { id: string }[];
  updatedAt: string;
}

interface SelectionBarProps {
  sessionId: string;
  activeSelectionId: string | null;
  onSetActiveSelectionId: (id: string | null) => void;
}

export default function SelectionBar({
  sessionId,
  activeSelectionId,
  onSetActiveSelectionId,
}: SelectionBarProps) {
  const [selections, setSelections] = useState<SelectionSummary[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchSelections();

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchSelections, 10000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Validate active selection still exists
  useEffect(() => {
    if (activeSelectionId && selections.length > 0) {
      const exists = selections.some((s) => s.id === activeSelectionId);
      if (!exists) {
        onSetActiveSelectionId(null);
      }
    }
  }, [selections, activeSelectionId, onSetActiveSelectionId]);

  async function fetchSelections() {
    try {
      const res = await fetch(`/api/selections?sessionId=${sessionId}`);
      const data = await res.json();
      setSelections(data.selections || []);
    } catch {
      // Silent fail for background poll
    }
  }

  async function createSelection() {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), sessionId }),
      });
      const data = await res.json();
      setSelections((prev) => [data.selection, ...prev]);
      onSetActiveSelectionId(data.selection.id);
      setNewName("");
      setShowNewInput(false);
    } catch (error) {
      console.error("Failed to create selection:", error);
    }
    setIsCreating(false);
  }

  const activeSelection = selections.find((s) => s.id === activeSelectionId);

  if (selections.length === 0 && !showNewInput) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 border-t shadow-lg z-40 ${
      activeSelection && activeSelection.items.length > 0
        ? "bg-gray-100 border-gray-300"
        : "bg-white border-gray-200"
    }`}>
      {/* Collapsed bar */}
      <div className="px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <FolderOpen className="w-5 h-5 text-gray-600" />
          {activeSelection ? (
            <span className="text-sm">
              <span className="font-medium">{activeSelection.name}</span>
              <span className="text-xs text-gray-400 ml-2">
                {activeSelection.items.length} work
                {activeSelection.items.length !== 1 ? "s" : ""}
              </span>
            </span>
          ) : selections.length > 0 ? (
            <span className="text-sm text-gray-500">
              {selections.length} selection{selections.length !== 1 ? "s" : ""}
              <span className="text-xs text-gray-400 ml-2">
                (none active)
              </span>
            </span>
          ) : (
            <span className="text-sm text-gray-400">No selections yet</span>
          )}
          <ChevronRight
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
        </button>

        <button
          onClick={() => {
            setShowNewInput(true);
            setIsExpanded(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          New
        </button>
      </div>

      {/* New selection input */}
      {showNewInput && (
        <div className="px-6 py-2 border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createSelection()}
            placeholder="Selection name..."
            autoFocus
            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10"
          />
          <button
            onClick={createSelection}
            disabled={!newName.trim() || isCreating}
            className="px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Create
          </button>
          <button
            onClick={() => {
              setShowNewInput(false);
              setNewName("");
            }}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Expanded selection list */}
      {isExpanded && selections.length > 0 && (
        <div className="border-t border-gray-100 max-h-64 overflow-y-auto">
          {selections.map((sel) => (
            <div
              key={sel.id}
              onClick={() => onSetActiveSelectionId(sel.id)}
              className={`px-6 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                sel.id === activeSelectionId
                  ? "bg-gray-50 border-l-2 border-black"
                  : "hover:bg-gray-50 border-l-2 border-transparent"
              }`}
            >
              <Link
                href={`/selections/${sel.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-gray-900 truncate">
                  {sel.name}
                </p>
                <p className="text-xs text-gray-400">
                  {sel.items.length} work{sel.items.length !== 1 ? "s" : ""}
                </p>
              </Link>

              <div className="flex items-center gap-2 ml-3">
                {sel.id === activeSelectionId && (
                  <span className="text-[10px] font-medium text-black px-2 py-0.5 bg-black/5 rounded-full uppercase tracking-wider">
                    Active
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = `${window.location.origin}/share/${sel.shareToken}`;
                    navigator.clipboard.writeText(url);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Copy share link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
