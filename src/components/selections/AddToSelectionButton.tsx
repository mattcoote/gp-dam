"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";

interface AddToSelectionButtonProps {
  workId: string;
  sessionId: string;
  activeSelectionId: string | null;
  onSetActiveSelectionId: (id: string) => void;
}

export default function AddToSelectionButton({
  workId,
  sessionId,
  activeSelectionId,
  onSetActiveSelectionId,
}: AddToSelectionButtonProps) {
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");

  async function handleAdd() {
    setStatus("adding");
    try {
      let selectionId = activeSelectionId;

      // Auto-create if no active selection
      if (!selectionId) {
        const res = await fetch("/api/selections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Selection 1",
            sessionId,
            workId,
          }),
        });
        const data = await res.json();
        selectionId = data.selection.id as string;
        onSetActiveSelectionId(selectionId!);
        setStatus("added");
        setTimeout(() => setStatus("idle"), 1500);
        return;
      }

      // Add to existing active selection
      const res = await fetch(`/api/selections/${selectionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId }),
      });

      if (res.status === 409) {
        setStatus("added");
      } else if (res.ok) {
        setStatus("added");
      } else {
        // Selection may have been deleted — auto-create a new one
        const createRes = await fetch("/api/selections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Selection 1",
            sessionId,
            workId,
          }),
        });
        const data = await createRes.json();
        onSetActiveSelectionId(data.selection.id);
        setStatus("added");
      }
      setTimeout(() => setStatus("idle"), 1500);
    } catch (error) {
      console.error("Failed to add to selection:", error);
      setStatus("idle");
    }
  }

  return (
    <button
      onClick={handleAdd}
      disabled={status === "adding"}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        status === "added"
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-black text-white hover:bg-gray-800"
      }`}
    >
      {status === "added" ? (
        <>
          <Check className="w-4 h-4" /> Added
        </>
      ) : status === "adding" ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Adding...
        </>
      ) : (
        <>
          <Plus className="w-4 h-4" /> Add to Selection
        </>
      )}
    </button>
  );
}
