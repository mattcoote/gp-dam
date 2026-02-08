"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, FolderPlus, Check } from "lucide-react";

interface Selection {
  id: string;
  name: string;
  items: { workId: string }[];
}

interface AddToSelectionButtonProps {
  workId: string;
  sessionId: string;
}

export default function AddToSelectionButton({
  workId,
  sessionId,
}: AddToSelectionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSelections();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowNewInput(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchSelections() {
    const res = await fetch(`/api/selections?sessionId=${sessionId}`);
    const data = await res.json();
    setSelections(data.selections || []);

    // Mark which selections already contain this work
    const alreadyIn = new Set<string>();
    for (const sel of data.selections || []) {
      if (sel.items.some((item: { workId: string }) => item.workId === workId)) {
        alreadyIn.add(sel.id);
      }
    }
    setAddedTo(alreadyIn);
  }

  async function addToSelection(selectionId: string) {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/selections/${selectionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId }),
      });

      if (res.ok) {
        setAddedTo((prev) => new Set(prev).add(selectionId));
      }
    } catch (error) {
      console.error("Failed to add to selection:", error);
    }
    setIsLoading(false);
  }

  async function createNewSelection() {
    if (!newName.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          sessionId,
          workId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelections((prev) => [data.selection, ...prev]);
        setAddedTo((prev) => new Set(prev).add(data.selection.id));
        setNewName("");
        setShowNewInput(false);
      }
    } catch (error) {
      console.error("Failed to create selection:", error);
    }
    setIsLoading(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Add to Selection
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Your Selections
            </p>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {selections.length === 0 && !showNewInput && (
              <div className="p-4 text-center text-sm text-gray-400">
                No selections yet
              </div>
            )}

            {selections.map((sel) => {
              const alreadyAdded = addedTo.has(sel.id);
              return (
                <button
                  key={sel.id}
                  onClick={() => !alreadyAdded && addToSelection(sel.id)}
                  disabled={isLoading || alreadyAdded}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    alreadyAdded ? "opacity-60" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {sel.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {sel.items.length} work{sel.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {alreadyAdded && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </button>
              );
            })}
          </div>

          {showNewInput ? (
            <div className="p-3 border-t border-gray-100">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createNewSelection()}
                placeholder="Selection name..."
                autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={createNewSelection}
                  disabled={!newName.trim() || isLoading}
                  className="flex-1 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
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
            </div>
          ) : (
            <button
              onClick={() => setShowNewInput(true)}
              className="w-full px-4 py-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              New Selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
