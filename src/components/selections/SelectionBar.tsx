"use client";

import { useState, useEffect } from "react";
import { FolderOpen, ChevronRight, Share2 } from "lucide-react";
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
}

export default function SelectionBar({ sessionId }: SelectionBarProps) {
  const [selections, setSelections] = useState<SelectionSummary[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchSelections();

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchSelections, 10000);
    return () => clearInterval(interval);
  }, [sessionId]);

  async function fetchSelections() {
    try {
      const res = await fetch(`/api/selections?sessionId=${sessionId}`);
      const data = await res.json();
      setSelections(data.selections || []);
    } catch {
      // Silent fail for background poll
    }
  }

  if (selections.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-sm">
            {selections.length} Selection
            {selections.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-gray-400">
            {selections.reduce((acc, s) => acc + s.items.length, 0)} total works
          </span>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isExpanded ? "rotate-90" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 max-h-64 overflow-y-auto">
          {selections.map((sel) => (
            <div
              key={sel.id}
              className="px-6 py-3 flex items-center justify-between hover:bg-gray-50"
            >
              <Link
                href={`/selections/${sel.id}`}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-gray-900 truncate">
                  {sel.name}
                </p>
                <p className="text-xs text-gray-400">
                  {sel.items.length} work{sel.items.length !== 1 ? "s" : ""}
                </p>
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const url = `${window.location.origin}/share/${sel.shareToken}`;
                  navigator.clipboard.writeText(url);
                  alert("Share link copied to clipboard!");
                }}
                className="ml-3 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                title="Copy share link"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
