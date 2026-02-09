"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ExternalLink } from "lucide-react";

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
  position: number;
  notes: string | null;
  work: Work;
}

interface SharedSelection {
  id: string;
  name: string;
  notes: string | null;
  items: SelectionItem[];
}

export default function SharedSelectionPage() {
  const params = useParams();
  const token = params.token as string;

  const [selection, setSelection] = useState<SharedSelection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedWork, setSelectedWork] = useState<SelectionItem | null>(null);

  useEffect(() => {
    async function fetchShared() {
      try {
        const res = await fetch(`/api/selections/share/${token}`);
        if (!res.ok) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        setSelection(data.selection);
      } catch {
        setNotFound(true);
      }
      setIsLoading(false);
    }
    fetchShared();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-black rounded-full" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <span className="font-[family-name:var(--font-oswald)] text-2xl font-bold tracking-tight uppercase">
              General Public
            </span>
          </div>
          <h1 className="text-xl font-semibold mb-2">Selection Not Found</h1>
          <p className="text-gray-500 text-sm">
            This link may have expired or the selection may have been deleted.
          </p>
        </div>
      </div>
    );
  }

  if (!selection) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6">
            <span className="font-[family-name:var(--font-oswald)] text-xl font-bold tracking-tight uppercase">
              General Public
            </span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Curated Selection
            </span>
            <span className="text-xs text-gray-300">/</span>
            <span className="text-xs text-gray-400">
              {selection.items.length} work
              {selection.items.length !== 1 ? "s" : ""}
            </span>
          </div>
          <h1 className="text-3xl font-semibold text-gray-900">
            {selection.name}
          </h1>
          {selection.notes && (
            <p className="mt-3 text-gray-500 max-w-2xl">{selection.notes}</p>
          )}
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="columns-2 md:columns-3 lg:columns-4 gap-6 [&>*]:mb-6 [&>*]:break-inside-avoid">
          {selection.items.map((item) => (
            <div
              key={item.id}
              className="group cursor-pointer"
              onClick={() => setSelectedWork(item)}
            >
              <div className="relative rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={item.work.imageUrlPreview || item.work.imageUrlThumbnail || ""}
                  alt={item.work.title}
                  className="w-full h-auto block group-hover:scale-105 transition-transform duration-500"
                />
                {item.work.retailerExclusive && (
                  <div className="absolute top-3 right-3 px-2 py-1 bg-amber-500/90 text-white text-xs font-medium rounded-full backdrop-blur-sm">
                    {item.work.retailerExclusive} Exclusive
                  </div>
                )}
              </div>
              <div className="mt-3">
                <h3 className="font-medium text-gray-900 text-sm">
                  {item.work.title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.work.artistName}
                </p>
                {item.notes && (
                  <p className="text-xs text-gray-400 mt-1 italic">
                    &ldquo;{item.notes}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Work Detail Modal */}
      {selectedWork && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedWork(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid md:grid-cols-2 gap-0">
              {/* Image */}
              <div className="bg-gray-50 p-8 flex items-center justify-center min-h-[400px]">
                <img
                  src={selectedWork.work.imageUrlPreview || ""}
                  alt={selectedWork.work.title}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>

              {/* Details */}
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {selectedWork.work.title}
                    </h2>
                    <p className="text-gray-500 mt-1">
                      {selectedWork.work.artistName}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedWork(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400 w-24">SKU</span>
                    <span className="font-mono text-gray-900">
                      {selectedWork.work.gpSku}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400 w-24">Type</span>
                    <span className="text-gray-900 capitalize">
                      {selectedWork.work.workType.replace(/_/g, " ")}
                    </span>
                  </div>

                  {selectedWork.work.dimensionsInches && (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400 w-24">Dimensions</span>
                      <span className="text-gray-900">
                        {selectedWork.work.dimensionsInches.width}&quot; &times;{" "}
                        {selectedWork.work.dimensionsInches.height}&quot;
                      </span>
                    </div>
                  )}

                  {selectedWork.work.retailerExclusive && (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400 w-24">Exclusive</span>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                        {selectedWork.work.retailerExclusive}
                      </span>
                    </div>
                  )}

                  {selectedWork.work.aiTagsHero.length > 0 && (
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedWork.work.aiTagsHero.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedWork.notes && (
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">Note</p>
                      <p className="text-sm text-gray-600 italic">
                        {selectedWork.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100">
                  <a
                    href={`mailto:info@generalpublic.com?subject=Inquiry: ${selectedWork.work.title} (${selectedWork.work.gpSku})`}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium w-fit"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Inquire About This Work
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-2">
          <span className="font-[family-name:var(--font-oswald)] text-sm font-bold tracking-tight uppercase">
            General Public
          </span>
          <p className="text-xs text-gray-400">
            Art Print Company
          </p>
        </div>
      </footer>
    </div>
  );
}
