"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload,
  FileText,
  Image,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  Trash2,
  Archive,
  RotateCcw,
  Search,
  Pencil,
  X,
  Lock,
  Download,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  SkipForward,
  RefreshCw,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface ImportStepLog {
  step: string;
  status: "success" | "failed" | "skipped";
  durationMs: number;
  detail?: string;
}

interface ImportResult {
  success: boolean;
  gpSku: string;
  title: string;
  artistName: string;
  error?: string;
  failedStep?: string;
  steps?: ImportStepLog[];
  totalDurationMs?: number;
}

interface UploadResponse {
  message: string;
  total: number;
  successCount: number;
  errorCount: number;
  results: ImportResult[];
  error?: string;
  details?: string[];
}

interface Work {
  id: string;
  gpSku: string | null;
  title: string;
  artistName: string;
  workType: string;
  orientation: string | null;
  dimensionsInches: { width: number; height: number; depth?: number } | null;
  imageUrlThumbnail: string | null;
  imageUrlPreview: string | null;
  retailerExclusive: string | null;
  artistExclusiveTo: string | null;
  sourceType: string;
  aiTagsHero: string[];
  aiTagsHidden: string[];
  customResizeAvailable: boolean;
  availableSizes: string[];
  status: string;
  createdAt: string;
}

type AdminTab = "import" | "single" | "works" | "metadata" | "public-domain";
type MuseumSource = "rijksmuseum" | "getty" | "met" | "yale" | "nga" | "cleveland";

interface RijksResult {
  objectId: string;
  objectNumber: string;
  title: string;
  artist: string;
  imageUrl: string;
  sourceUrl: string;
  iiifId: string;
  alreadyImported: boolean;
  imageWidth: number;
  imageHeight: number;
  maxPrintInches: { width: number; height: number };
}

interface GettyResult {
  objectId: string;
  accessionNumber: string;
  title: string;
  artist: string;
  imageUrl: string;
  fullImageUrl: string;
  sourceUrl: string;
  alreadyImported: boolean;
  imageWidth: number;
  imageHeight: number;
  maxPrintInches: { width: number; height: number };
}

interface MetResult {
  objectID: number;
  accessionNumber: string;
  title: string;
  artist: string;
  imageUrl: string;
  fullImageUrl: string;
  sourceUrl: string;
  alreadyImported: boolean;
  imageWidth: number;
  imageHeight: number;
  maxPrintInches: { width: number; height: number };
}

interface YaleResult {
  objectId: string;
  accessionNumber: string;
  title: string;
  artist: string;
  imageUrl: string;
  imageServiceUrl: string;
  sourceUrl: string;
  alreadyImported: boolean;
  imageWidth: number;
  imageHeight: number;
  maxPrintInches: { width: number; height: number };
}

interface NgaResult {
  objectId: number;
  accessionNumber: string;
  title: string;
  artist: string;
  classification: string;
  imageUrl: string;
  sourceUrl: string;
  alreadyImported: boolean;
  imageWidth: number;
  imageHeight: number;
  maxPrintInches: { width: number; height: number };
}

interface ClevelandResult {
  objectId: number;
  accessionNumber: string;
  title: string;
  artist: string;
  type: string;
  imageUrl: string;
  sourceUrl: string;
  alreadyImported: boolean;
  imageWidth: number;
  imageHeight: number;
  maxPrintInches: { width: number; height: number };
}

const WORK_TYPES = [
  "synograph",
  "work_on_paper",
  "work_on_canvas",
  "photography",
  "reductive",
];

const WORK_TYPE_LABELS: Record<string, string> = {
  synograph: "Synograph",
  work_on_paper: "Work on Paper",
  work_on_canvas: "Work on Canvas",
  photography: "Photography",
  reductive: "Reductive",
};

// ─── Edit Work Modal ────────────────────────────────────────

function EditWorkModal({
  work,
  onClose,
  onSaved,
}: {
  work: Work;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: work.title,
    artistName: work.artistName,
    workType: work.workType,
    orientation: work.orientation || "portrait",
    retailerExclusive: work.retailerExclusive || "",
    artistExclusiveTo: work.artistExclusiveTo || "",
    dimensionsWidth: work.dimensionsInches?.width?.toString() || "",
    dimensionsHeight: work.dimensionsInches?.height?.toString() || "",
    customResizeAvailable: work.customResizeAvailable,
    availableSizes: (work.availableSizes || []).join(", "),
    aiTagsHero: work.aiTagsHero.join(", "),
    aiTagsHidden: (work.aiTagsHidden || []).join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");

    const heroTags = form.aiTagsHero
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const hiddenTags = form.aiTagsHidden
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const width = parseFloat(form.dimensionsWidth);
    const height = parseFloat(form.dimensionsHeight);
    const dims =
      !isNaN(width) && !isNaN(height) ? { width, height } : null;
    const availableSizes = form.availableSizes
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/works/${work.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          artistName: form.artistName,
          workType: form.workType,
          orientation: form.orientation,
          retailerExclusive: form.retailerExclusive || null,
          artistExclusiveTo: form.artistExclusiveTo || null,
          dimensionsInches: dims,
          customResizeAvailable: form.customResizeAvailable,
          availableSizes,
          aiTagsHero: heroTags,
          aiTagsHidden: hiddenTags,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        setSaving(false);
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-medium">Edit Work</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              {work.gpSku}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Title & Artist */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Artist
              </label>
              <input
                type="text"
                value={form.artistName}
                onChange={(e) => setForm({ ...form, artistName: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          </div>

          {/* Type & Orientation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Work Type
              </label>
              <select
                value={form.workType}
                onChange={(e) => setForm({ ...form, workType: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              >
                {WORK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {WORK_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Orientation
              </label>
              <select
                value={form.orientation}
                onChange={(e) => setForm({ ...form, orientation: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
                <option value="square">Square</option>
              </select>
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Dimensions (inches)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={form.dimensionsWidth}
                onChange={(e) => setForm({ ...form, dimensionsWidth: e.target.value })}
                placeholder="Width"
                className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              <span className="text-gray-400">&times;</span>
              <input
                type="number"
                value={form.dimensionsHeight}
                onChange={(e) => setForm({ ...form, dimensionsHeight: e.target.value })}
                placeholder="Height"
                className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          </div>

          {/* Exclusivity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Retailer Exclusive
              </label>
              <input
                type="text"
                value={form.retailerExclusive}
                onChange={(e) => setForm({ ...form, retailerExclusive: e.target.value })}
                placeholder="e.g. RH, CB2"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Artist Exclusive To
              </label>
              <input
                type="text"
                value={form.artistExclusiveTo}
                onChange={(e) => setForm({ ...form, artistExclusiveTo: e.target.value })}
                placeholder="e.g. RH"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          </div>

          {/* Custom Resize */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="customResize"
              checked={form.customResizeAvailable}
              onChange={(e) => setForm({ ...form, customResizeAvailable: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="customResize" className="text-sm text-gray-600">
              Custom sizing available
            </label>
          </div>

          {/* Available Sizes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Available Sizes{" "}
              <span className="font-normal text-gray-400">
                (comma-separated, e.g. 8x10, 11x14, 24x36)
              </span>
            </label>
            <input
              type="text"
              value={form.availableSizes}
              onChange={(e) => setForm({ ...form, availableSizes: e.target.value })}
              placeholder="8x10, 11x14, 24x36..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          {/* Hero Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Hero Tags{" "}
              <span className="font-normal text-gray-400">
                (visible on catalog, comma-separated)
              </span>
            </label>
            <textarea
              value={form.aiTagsHero}
              onChange={(e) => setForm({ ...form, aiTagsHero: e.target.value })}
              rows={2}
              placeholder="landscape, abstract, blue, coastal..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
            />
          </div>

          {/* Hidden Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Hidden Tags{" "}
              <span className="font-normal text-gray-400">
                (search only, comma-separated)
              </span>
            </label>
            <textarea
              value={form.aiTagsHidden}
              onChange={(e) => setForm({ ...form, aiTagsHidden: e.target.value })}
              rows={3}
              placeholder="ocean, sea, waves, horizon, sunset, dusk..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.artistName.trim()}
            className="px-6 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Password Gate ──────────────────────────────────────────

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        sessionStorage.setItem("admin-auth", "true");
        onUnlock();
      } else {
        setError("Incorrect password");
      }
    } catch {
      setError("Connection error");
    }
    setChecking(false);
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <div className="mb-5">
            <span className="font-[family-name:var(--font-oswald)] text-2xl font-bold tracking-tight uppercase">
              General Public
            </span>
          </div>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
            <Lock className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-sm text-gray-400">
            Enter admin password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 text-center"
          />
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={!password || checking}
            className="w-full py-3 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {checking ? "Checking..." : "Enter"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            &larr; Back to catalog
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Import Log Component ───────────────────────────────────

function ImportLog({ response }: { response: UploadResponse }) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (i: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedRows(new Set(response.results.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return (
    <div className="space-y-4">
      {response.error && !response.results?.length ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{response.error}</p>
          {response.details && (
            <ul className="mt-2 space-y-1">
              {response.details.map((d, i) => (
                <li key={i} className="text-xs text-red-600">{d}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-medium">{response.message}</p>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>Total: {response.total}</span>
            <span className="text-green-600">Succeeded: {response.successCount}</span>
            {response.errorCount > 0 && (
              <span className="text-red-600">Failed: {response.errorCount}</span>
            )}
          </div>
        </div>
      )}

      {response.results?.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground">Upload Log</span>
            <div className="flex gap-2">
              <button onClick={expandAll} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                Expand All
              </button>
              <span className="text-muted-foreground/40">|</span>
              <button onClick={collapseAll} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                Collapse All
              </button>
            </div>
          </div>
          <div className="divide-y divide-border/50">
            {response.results.map((r, i) => (
              <div key={i}>
                <button
                  onClick={() => toggleRow(i)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors ${
                    !r.success ? "bg-red-50/50" : ""
                  }`}
                >
                  {expandedRows.has(i) ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  {r.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className="text-sm truncate flex-1">{r.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{r.artistName}</span>
                  {r.gpSku && r.gpSku !== "—" && r.gpSku !== "N/A" && (
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">{r.gpSku}</span>
                  )}
                  {r.totalDurationMs !== undefined && (
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatDuration(r.totalDurationMs)}</span>
                  )}
                  {r.failedStep && (
                    <span className="text-[10px] text-red-500 shrink-0">Failed: {r.failedStep}</span>
                  )}
                </button>

                {expandedRows.has(i) && (
                  <div className="px-3 pb-3 pl-12">
                    {r.error && (
                      <div className="text-xs text-red-600 mb-2 flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {r.error}
                      </div>
                    )}
                    {r.steps && r.steps.length > 0 ? (
                      <div className="space-y-1">
                        {r.steps.map((step, si) => (
                          <div key={si} className="flex items-center gap-2 text-xs">
                            {step.status === "success" ? (
                              <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                            ) : step.status === "failed" ? (
                              <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                            ) : (
                              <SkipForward className="h-3 w-3 text-gray-400 shrink-0" />
                            )}
                            <span className={`font-medium ${
                              step.status === "failed" ? "text-red-600" : step.status === "skipped" ? "text-gray-400" : "text-foreground"
                            }`}>
                              {step.step}
                            </span>
                            <span className="text-muted-foreground">{formatDuration(step.durationMs)}</span>
                            {step.detail && (
                              <span className="text-muted-foreground truncate">{step.detail}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No step details available</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Page ────────────────────────────────────────

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>("works");

  // Import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [skipAiTagging, setSkipAiTagging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [response, setResponse] = useState<UploadResponse | null>(null);

  // Single upload state
  const [singleImage, setSingleImage] = useState<File | null>(null);
  const [singleForm, setSingleForm] = useState({
    title: "",
    artistName: "",
    workType: "synograph",
    gpSku: "",
    dimensions: "",
    retailerExclusive: "",
    artistExclusiveTo: "",
    source: "",
    gpExclusive: false,
    availableSizes: "",
  });
  const [singleSkipAi, setSingleSkipAi] = useState(false);
  const [singleUploading, setSingleUploading] = useState(false);
  const [singleResult, setSingleResult] = useState<{
    success: boolean;
    message: string;
    gpSku?: string;
  } | null>(null);

  // Metadata update state
  const [metadataCsvFile, setMetadataCsvFile] = useState<File | null>(null);
  const [metadataUploading, setMetadataUploading] = useState(false);
  const [metadataProgress, setMetadataProgress] = useState("");
  const [metadataResponse, setMetadataResponse] = useState<{
    message: string;
    total: number;
    updatedCount: number;
    notFoundCount: number;
    errorCount: number;
    results: {
      success: boolean;
      row: number;
      matchedBy: string;
      gpSku: string | null;
      title: string;
      error?: string;
      fieldsUpdated: string[];
    }[];
    error?: string;
    details?: string[];
  } | null>(null);

  // Works management state
  const [works, setWorks] = useState<Work[]>([]);
  const [worksLoading, setWorksLoading] = useState(false);
  const [worksSearch, setWorksSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [editingWork, setEditingWork] = useState<Work | null>(null);

  // Retag state
  const [retagging, setRetagging] = useState(false);
  const [retagProgress, setRetagProgress] = useState("");
  const [retagResults, setRetagResults] = useState<{
    message: string;
    successCount: number;
    failCount: number;
    typeChanges: { id: string; title: string; newType: string }[];
  } | null>(null);

  // Public domain museum sub-tab
  const [museumSource, setMuseumSource] = useState<MuseumSource>("rijksmuseum");
  const [minShortSide, setMinShortSide] = useState(0); // Minimum short side in inches for print filter

  // Rijksmuseum state
  const [rijksQuery, setRijksQuery] = useState("");
  const [rijksResults, setRijksResults] = useState<RijksResult[]>([]);
  const [rijksLoading, setRijksLoading] = useState(false);
  const [rijksNextPageToken, setRijksNextPageToken] = useState<string | undefined>();
  const [rijksTotalCount, setRijksTotalCount] = useState(0);
  const [rijksSelected, setRijksSelected] = useState<Set<string>>(new Set());
  const [rijksImporting, setRijksImporting] = useState(false);
  const [rijksImportResults, setRijksImportResults] = useState<{
    message: string;
    successCount: number;
    skippedCount: number;
    errorCount: number;
    results: { success: boolean; gpSku: string; title: string; artistName: string; error?: string }[];
  } | null>(null);

  // Getty Museum state
  const [gettyQuery, setGettyQuery] = useState("");
  const [gettyResults, setGettyResults] = useState<GettyResult[]>([]);
  const [gettyLoading, setGettyLoading] = useState(false);
  const [gettyPage, setGettyPage] = useState(1);
  const [gettyTotalCount, setGettyTotalCount] = useState(0);
  const [gettySelected, setGettySelected] = useState<Set<string>>(new Set());
  const [gettyImporting, setGettyImporting] = useState(false);
  const [gettyImportResults, setGettyImportResults] = useState<{
    message: string;
    successCount: number;
    skippedCount: number;
    errorCount: number;
    results: { success: boolean; gpSku: string; title: string; artistName: string; error?: string }[];
  } | null>(null);

  // Met Museum state
  const [metQuery, setMetQuery] = useState("");
  const [metResults, setMetResults] = useState<MetResult[]>([]);
  const [metLoading, setMetLoading] = useState(false);
  const [metPage, setMetPage] = useState(1);
  const [metTotalCount, setMetTotalCount] = useState(0);
  const [metTotalPages, setMetTotalPages] = useState(0);
  const [metSelected, setMetSelected] = useState<Set<string>>(new Set());
  const [metImporting, setMetImporting] = useState(false);
  const [metImportResults, setMetImportResults] = useState<{
    message: string;
    successCount: number;
    skippedCount: number;
    errorCount: number;
    results: { success: boolean; gpSku: string; title: string; artistName: string; error?: string }[];
  } | null>(null);

  // Yale Art Gallery state
  const [yaleQuery, setYaleQuery] = useState("");
  const [yaleResults, setYaleResults] = useState<YaleResult[]>([]);
  const [yaleLoading, setYaleLoading] = useState(false);
  const [yalePage, setYalePage] = useState(1);
  const [yaleTotalCount, setYaleTotalCount] = useState(0);
  const [yaleTotalPages, setYaleTotalPages] = useState(0);
  const [yaleSelected, setYaleSelected] = useState<Set<string>>(new Set());
  const [yaleImporting, setYaleImporting] = useState(false);
  const [yaleImportResults, setYaleImportResults] = useState<{
    message: string;
    successCount: number;
    skippedCount: number;
    errorCount: number;
    results: { success: boolean; gpSku: string; title: string; artistName: string; error?: string }[];
  } | null>(null);

  // National Gallery of Art state
  const [ngaQuery, setNgaQuery] = useState("");
  const [ngaResults, setNgaResults] = useState<NgaResult[]>([]);
  const [ngaLoading, setNgaLoading] = useState(false);
  const [ngaPage, setNgaPage] = useState(1);
  const [ngaTotalCount, setNgaTotalCount] = useState(0);
  const [ngaTotalPages, setNgaTotalPages] = useState(0);
  const [ngaSelected, setNgaSelected] = useState<Set<string>>(new Set());
  const [ngaImporting, setNgaImporting] = useState(false);
  const [ngaImportResults, setNgaImportResults] = useState<{
    message: string;
    successCount: number;
    skippedCount: number;
    errorCount: number;
    results: { success: boolean; gpSku: string; title: string; artistName: string; error?: string }[];
  } | null>(null);

  // Cleveland Museum of Art state
  const [clevelandQuery, setClevelandQuery] = useState("");
  const [clevelandResults, setClevelandResults] = useState<ClevelandResult[]>([]);
  const [clevelandLoading, setClevelandLoading] = useState(false);
  const [clevelandPage, setClevelandPage] = useState(1);
  const [clevelandTotalCount, setClevelandTotalCount] = useState(0);
  const [clevelandTotalPages, setClevelandTotalPages] = useState(0);
  const [clevelandSelected, setClevelandSelected] = useState<Set<string>>(new Set());
  const [clevelandImporting, setClevelandImporting] = useState(false);
  const [clevelandImportResults, setClevelandImportResults] = useState<{
    message: string;
    successCount: number;
    skippedCount: number;
    errorCount: number;
    results: { success: boolean; gpSku: string; title: string; artistName: string; error?: string }[];
  } | null>(null);

  // Check if already authenticated or if no password is set
  useEffect(() => {
    async function checkAuth() {
      if (sessionStorage.getItem("admin-auth") === "true") {
        setAuthenticated(true);
        setCheckingAuth(false);
        return;
      }

      try {
        const res = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: "" }),
        });
        if (res.ok) {
          setAuthenticated(true);
          sessionStorage.setItem("admin-auth", "true");
        }
      } catch {
        // Can't reach API — show gate
      }
      setCheckingAuth(false);
    }
    checkAuth();
  }, []);

  const fetchWorks = useCallback(async () => {
    setWorksLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (worksSearch) params.set("search", worksSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/works?${params.toString()}`);
      const data = await res.json();
      setWorks(data.works || []);
    } catch {
      // Silent fail
    }
    setWorksLoading(false);
  }, [worksSearch, statusFilter]);

  useEffect(() => {
    if (authenticated && activeTab === "works") {
      fetchWorks();
    }
  }, [authenticated, activeTab, fetchWorks]);

  const handleRetag = async () => {
    if (!confirm(`Re-tag all ${works.length} works with enhanced AI prompts? This will update tags, embeddings, and may change work types (e.g. detecting photography). This can take several minutes.`)) return;
    setRetagging(true);
    setRetagProgress("Starting re-tag...");
    setRetagResults(null);

    // Process in chunks of 10 to avoid timeouts
    const allIds = works.map((w) => w.id);
    const chunkSize = 5;
    let totalSuccess = 0;
    let totalFail = 0;
    const allTypeChanges: { id: string; title: string; newType: string }[] = [];

    for (let i = 0; i < allIds.length; i += chunkSize) {
      const chunk = allIds.slice(i, i + chunkSize);
      setRetagProgress(`Re-tagging works ${i + 1}–${Math.min(i + chunkSize, allIds.length)} of ${allIds.length}...`);
      try {
        const res = await fetch("/api/works/retag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workIds: chunk, batchSize: 5 }),
        });
        const data = await res.json();
        totalSuccess += data.successCount || 0;
        totalFail += data.failCount || 0;
        if (data.typeChanges) allTypeChanges.push(...data.typeChanges);
      } catch {
        totalFail += chunk.length;
      }
    }

    setRetagResults({
      message: `Re-tag complete: ${totalSuccess} succeeded, ${totalFail} failed`,
      successCount: totalSuccess,
      failCount: totalFail,
      typeChanges: allTypeChanges,
    });
    setRetagProgress("");
    setRetagging(false);
    fetchWorks(); // Refresh the list
  };

  async function openEditModal(workId: string) {
    try {
      const res = await fetch(`/api/works/${workId}`);
      const data = await res.json();
      setEditingWork(data);
    } catch {
      alert("Failed to load work details");
    }
  }

  const handleUpload = async () => {
    if (!csvFile && !zipFile) return;

    setUploading(true);
    setProgress("Uploading files...");
    setResponse(null);

    const formData = new FormData();
    if (csvFile) formData.append("csv", csvFile);
    if (zipFile) formData.append("images", zipFile);
    if (skipAiTagging) formData.append("skipAiTagging", "true");

    try {
      setProgress(
        "Processing import... This may take a few minutes for large batches."
      );
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data: UploadResponse = await res.json();
      setResponse(data);
      setProgress("");
    } catch {
      setResponse({
        error: "Network error — could not reach the server.",
        message: "",
        total: 0,
        successCount: 0,
        errorCount: 0,
        results: [],
      });
      setProgress("");
    } finally {
      setUploading(false);
    }
  };

  const handleMetadataUpdate = async () => {
    if (!metadataCsvFile) return;

    setMetadataUploading(true);
    setMetadataProgress("Uploading CSV...");
    setMetadataResponse(null);

    const formData = new FormData();
    formData.append("csv", metadataCsvFile);

    try {
      setMetadataProgress("Matching and updating works...");
      const res = await fetch("/api/works/update-metadata", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setMetadataResponse(data);
      setMetadataProgress("");
    } catch {
      setMetadataResponse({
        error: "Network error — could not reach the server.",
        message: "",
        total: 0,
        updatedCount: 0,
        notFoundCount: 0,
        errorCount: 0,
        results: [],
      });
      setMetadataProgress("");
    } finally {
      setMetadataUploading(false);
    }
  };

  const handleSingleUpload = async () => {
    if (!singleImage || !singleForm.title.trim() || !singleForm.artistName.trim()) return;

    setSingleUploading(true);
    setSingleResult(null);

    // Build a CSV string with one row
    const csvHeader = "filename,title,artist_name,work_type,gp_sku,dimensions,retailer_exclusive,artist_exclusive_to,source,gp_exclusive,available_sizes";
    const csvRow = [
      singleImage.name,
      singleForm.title.trim(),
      singleForm.artistName.trim(),
      singleForm.workType,
      singleForm.gpSku.trim(),
      singleForm.dimensions.trim(),
      singleForm.retailerExclusive.trim(),
      singleForm.artistExclusiveTo.trim(),
      singleForm.source.trim(),
      singleForm.gpExclusive ? "yes" : "no",
      singleForm.availableSizes.trim(),
    ]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(",");
    const csvBlob = new Blob([csvHeader + "\n" + csvRow], { type: "text/csv" });

    // Build a ZIP with the single image
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file(singleImage.name, singleImage);
    const zipBlob = await zip.generateAsync({ type: "blob" });

    const formData = new FormData();
    formData.append("csv", new File([csvBlob], "single.csv"));
    formData.append("images", new File([zipBlob], "images.zip"));
    if (singleSkipAi) formData.append("skipAiTagging", "true");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.successCount > 0) {
        const result = data.results[0];
        setSingleResult({
          success: true,
          message: `"${result.title}" imported successfully`,
          gpSku: result.gpSku,
        });
        // Reset form
        setSingleImage(null);
        setSingleForm({
          title: "",
          artistName: "",
          workType: "synograph",
          gpSku: "",
          dimensions: "",
          retailerExclusive: "",
          artistExclusiveTo: "",
          source: "",
          gpExclusive: false,
          availableSizes: "",
        });
      } else {
        const err = data.results?.[0]?.error || data.error || "Import failed";
        setSingleResult({ success: false, message: err });
      }
    } catch {
      setSingleResult({ success: false, message: "Network error" });
    } finally {
      setSingleUploading(false);
    }
  };

  const handleRijksSearch = useCallback(
    async (query: string, pageToken?: string) => {
      if (!query.trim()) return;
      setRijksLoading(true);
      setRijksImportResults(null);
      try {
        const params = new URLSearchParams({ q: query.trim() });
        if (pageToken) params.set("pageToken", pageToken);
        const res = await fetch(`/api/rijksmuseum/search?${params.toString()}`);
        const data = await res.json();
        if (data.error) {
          setRijksResults([]);
          setRijksNextPageToken(undefined);
        } else {
          setRijksResults(data.results || []);
          setRijksTotalCount(data.count || 0);
          setRijksNextPageToken(data.nextPageToken);
        }
      } catch {
        setRijksResults([]);
      }
      setRijksLoading(false);
    },
    []
  );

  const handleRijksImport = async () => {
    if (rijksSelected.size === 0) return;
    setRijksImporting(true);
    setRijksImportResults(null);
    try {
      // Build items array from selected objectNumbers, matching against results for objectId
      const selectedItems = rijksResults
        .filter((r) => rijksSelected.has(r.objectNumber))
        .map((r) => ({ objectId: r.objectId, objectNumber: r.objectNumber }));

      const res = await fetch("/api/rijksmuseum/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selectedItems }),
      });
      const data = await res.json();
      setRijksImportResults(data);
      setRijksSelected(new Set());
      // Refresh search to update "already imported" badges
      if (rijksQuery.trim()) {
        handleRijksSearch(rijksQuery);
      }
    } catch {
      setRijksImportResults({
        message: "Network error",
        successCount: 0,
        skippedCount: 0,
        errorCount: 0,
        results: [],
      });
    }
    setRijksImporting(false);
  };

  const handleGettySearch = useCallback(
    async (query: string, page: number = 1) => {
      if (!query.trim()) return;
      setGettyLoading(true);
      setGettyImportResults(null);
      try {
        const params = new URLSearchParams({ q: query.trim(), page: String(page) });
        const res = await fetch(`/api/getty/search?${params.toString()}`);
        const data = await res.json();
        if (data.error) {
          setGettyResults([]);
          setGettyPage(1);
        } else {
          setGettyResults(data.results || []);
          setGettyTotalCount(data.count || 0);
          setGettyPage(data.page || 1);
        }
      } catch {
        setGettyResults([]);
      }
      setGettyLoading(false);
    },
    []
  );

  const handleGettyImport = async () => {
    if (gettySelected.size === 0) return;
    setGettyImporting(true);
    setGettyImportResults(null);
    try {
      const selectedItems = gettyResults
        .filter((r) => gettySelected.has(r.accessionNumber))
        .map((r) => ({ objectId: r.objectId, accessionNumber: r.accessionNumber }));

      const res = await fetch("/api/getty/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selectedItems }),
      });
      const data = await res.json();
      setGettyImportResults(data);
      setGettySelected(new Set());
      // Refresh search to update "already imported" badges
      if (gettyQuery.trim()) {
        handleGettySearch(gettyQuery, gettyPage);
      }
    } catch {
      setGettyImportResults({
        message: "Network error",
        successCount: 0,
        skippedCount: 0,
        errorCount: 0,
        results: [],
      });
    }
    setGettyImporting(false);
  };

  const handleMetSearch = useCallback(
    async (query: string, page: number = 1) => {
      if (!query.trim()) return;
      setMetLoading(true);
      setMetImportResults(null);
      try {
        const params = new URLSearchParams({ q: query.trim(), page: String(page) });
        const res = await fetch(`/api/met/search?${params.toString()}`);
        const data = await res.json();
        if (data.error) {
          setMetResults([]);
          setMetPage(1);
        } else {
          setMetResults(data.results || []);
          setMetTotalCount(data.count || 0);
          setMetTotalPages(data.totalPages || 0);
          setMetPage(data.page || 1);
        }
      } catch {
        setMetResults([]);
      }
      setMetLoading(false);
    },
    []
  );

  const handleMetImport = async () => {
    if (metSelected.size === 0) return;
    setMetImporting(true);
    setMetImportResults(null);
    try {
      const selectedItems = metResults
        .filter((r) => metSelected.has(r.accessionNumber))
        .map((r) => ({ objectID: r.objectID, accessionNumber: r.accessionNumber }));

      const res = await fetch("/api/met/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selectedItems }),
      });
      const data = await res.json();
      setMetImportResults(data);
      setMetSelected(new Set());
      if (metQuery.trim()) {
        handleMetSearch(metQuery, metPage);
      }
    } catch {
      setMetImportResults({
        message: "Network error",
        successCount: 0,
        skippedCount: 0,
        errorCount: 0,
        results: [],
      });
    }
    setMetImporting(false);
  };

  const handleYaleSearch = useCallback(
    async (query: string, page: number = 1) => {
      if (!query.trim()) return;
      setYaleLoading(true);
      setYaleImportResults(null);
      try {
        const params = new URLSearchParams({ q: query.trim(), page: String(page) });
        const res = await fetch(`/api/yale/search?${params.toString()}`);
        const data = await res.json();
        if (data.error) {
          setYaleResults([]);
          setYalePage(1);
        } else {
          setYaleResults(data.results || []);
          setYaleTotalCount(data.count || 0);
          setYaleTotalPages(data.totalPages || 0);
          setYalePage(data.page || 1);
        }
      } catch {
        setYaleResults([]);
      }
      setYaleLoading(false);
    },
    []
  );

  const handleYaleImport = async () => {
    if (yaleSelected.size === 0) return;
    setYaleImporting(true);
    setYaleImportResults(null);
    try {
      const selectedItems = yaleResults
        .filter((r) => yaleSelected.has(r.accessionNumber))
        .map((r) => ({ objectId: r.objectId, accessionNumber: r.accessionNumber }));

      const res = await fetch("/api/yale/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selectedItems }),
      });
      const data = await res.json();
      setYaleImportResults(data);
      setYaleSelected(new Set());
      if (yaleQuery.trim()) {
        handleYaleSearch(yaleQuery, yalePage);
      }
    } catch {
      setYaleImportResults({
        message: "Network error",
        successCount: 0,
        skippedCount: 0,
        errorCount: 0,
        results: [],
      });
    }
    setYaleImporting(false);
  };

  const handleNgaSearch = useCallback(
    async (query: string, page: number = 1) => {
      if (!query.trim()) return;
      setNgaLoading(true);
      setNgaImportResults(null);
      try {
        const params = new URLSearchParams({ q: query.trim(), page: String(page) });
        const res = await fetch(`/api/nga/search?${params.toString()}`);
        const data = await res.json();
        if (data.error) {
          setNgaResults([]);
          setNgaPage(1);
        } else {
          setNgaResults(data.results || []);
          setNgaTotalCount(data.count || 0);
          setNgaTotalPages(data.totalPages || 0);
          setNgaPage(data.page || 1);
        }
      } catch {
        setNgaResults([]);
      }
      setNgaLoading(false);
    },
    []
  );

  const handleNgaImport = async () => {
    if (ngaSelected.size === 0) return;
    setNgaImporting(true);
    setNgaImportResults(null);
    try {
      const selectedItems = ngaResults
        .filter((r) => ngaSelected.has(r.accessionNumber))
        .map((r) => ({ objectId: r.objectId, accessionNumber: r.accessionNumber }));

      const res = await fetch("/api/nga/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selectedItems }),
      });
      const data = await res.json();
      setNgaImportResults(data);
      setNgaSelected(new Set());
      if (ngaQuery.trim()) {
        handleNgaSearch(ngaQuery, ngaPage);
      }
    } catch {
      setNgaImportResults({
        message: "Network error",
        successCount: 0,
        skippedCount: 0,
        errorCount: 0,
        results: [],
      });
    }
    setNgaImporting(false);
  };

  const handleClevelandSearch = useCallback(
    async (query: string, page: number = 1) => {
      if (!query.trim()) return;
      setClevelandLoading(true);
      setClevelandImportResults(null);
      try {
        const params = new URLSearchParams({ q: query.trim(), page: String(page) });
        const res = await fetch(`/api/cleveland/search?${params.toString()}`);
        const data = await res.json();
        if (data.error) {
          setClevelandResults([]);
          setClevelandPage(1);
        } else {
          setClevelandResults(data.results || []);
          setClevelandTotalCount(data.count || 0);
          setClevelandTotalPages(data.totalPages || 0);
          setClevelandPage(data.page || 1);
        }
      } catch {
        setClevelandResults([]);
      }
      setClevelandLoading(false);
    },
    []
  );

  const handleClevelandImport = async () => {
    if (clevelandSelected.size === 0) return;
    setClevelandImporting(true);
    setClevelandImportResults(null);
    try {
      const selectedItems = clevelandResults
        .filter((r) => clevelandSelected.has(r.accessionNumber))
        .map((r) => ({ objectId: r.objectId, accessionNumber: r.accessionNumber }));

      const res = await fetch("/api/cleveland/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selectedItems }),
      });
      const data = await res.json();
      setClevelandImportResults(data);
      setClevelandSelected(new Set());
      if (clevelandQuery.trim()) {
        handleClevelandSearch(clevelandQuery, clevelandPage);
      }
    } catch {
      setClevelandImportResults({
        message: "Network error",
        successCount: 0,
        skippedCount: 0,
        errorCount: 0,
        results: [],
      });
    }
    setClevelandImporting(false);
  };

  async function archiveWork(workId: string) {
    setActionInProgress(workId);
    try {
      await fetch(`/api/works/${workId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      fetchWorks();
    } catch {
      alert("Failed to archive work");
    }
    setActionInProgress(null);
  }

  async function restoreWork(workId: string) {
    setActionInProgress(workId);
    try {
      await fetch(`/api/works/${workId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      fetchWorks();
    } catch {
      alert("Failed to restore work");
    }
    setActionInProgress(null);
  }

  async function deleteWork(workId: string) {
    setActionInProgress(workId);
    try {
      const res = await fetch(`/api/works/${workId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConfirmDelete(null);
        fetchWorks();
      } else {
        alert("Failed to delete work");
      }
    } catch {
      alert("Failed to delete work");
    }
    setActionInProgress(null);
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!authenticated) {
    return <PasswordGate onUnlock={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </a>
            <span className="font-[family-name:var(--font-oswald)] text-xl font-bold tracking-tight uppercase">
              General Public
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider border-l border-border pl-4">
              Admin
            </span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 flex gap-0">
          <button
            onClick={() => setActiveTab("works")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "works"
                ? "border-black text-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Manage Works
          </button>
          <button
            onClick={() => setActiveTab("single")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "single"
                ? "border-black text-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Add Work
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "import"
                ? "border-black text-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Bulk Import
          </button>
          <button
            onClick={() => setActiveTab("metadata")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "metadata"
                ? "border-black text-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Update Metadata
          </button>
          <button
            onClick={() => setActiveTab("public-domain")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "public-domain"
                ? "border-black text-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Public Domain
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* ─── Manage Works Tab ─── */}
        {activeTab === "works" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-light">Manage Works</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Edit, archive, or remove works from the catalog.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {works.length} works
                </span>
                <button
                  onClick={handleRetag}
                  disabled={retagging || works.length === 0}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${retagging ? "animate-spin" : ""}`} />
                  {retagging ? "Re-tagging..." : "Re-tag All"}
                </button>
              </div>
            </div>

            {/* Retag progress/results */}
            {retagProgress && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                <Loader2 className="w-4 h-4 animate-spin" />
                {retagProgress}
              </div>
            )}
            {retagResults && (
              <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${retagResults.failCount > 0 ? "bg-yellow-50 border-yellow-200 text-yellow-800" : "bg-green-50 border-green-200 text-green-800"}`}>
                <p className="font-medium">{retagResults.message}</p>
                {retagResults.typeChanges.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium mb-1">Work types auto-updated:</p>
                    {retagResults.typeChanges.map((tc) => (
                      <p key={tc.id} className="text-xs">
                        &ldquo;{tc.title}&rdquo; → {tc.newType}
                      </p>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setRetagResults(null)}
                  className="mt-2 text-xs underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Search + Filter */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={worksSearch}
                  onChange={(e) => setWorksSearch(e.target.value)}
                  placeholder="Search by title, artist, or SKU..."
                  className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-foreground transition-colors"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-foreground"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Works List */}
            {worksLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : works.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No works found.
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-medium w-16"></th>
                      <th className="text-left p-3 font-medium">Title</th>
                      <th className="text-left p-3 font-medium">Artist</th>
                      <th className="text-left p-3 font-medium">SKU</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {works.map((work) => (
                      <tr
                        key={work.id}
                        className={`border-b border-border/50 last:border-0 ${
                          work.status === "archived" ? "opacity-50" : ""
                        }`}
                      >
                        <td className="p-3">
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            {work.imageUrlThumbnail && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={work.imageUrlThumbnail}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="font-medium">{work.title}</p>
                          {work.retailerExclusive && (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                              {work.retailerExclusive}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {work.artistName}
                        </td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">
                          {work.gpSku || "—"}
                        </td>
                        <td className="p-3 text-muted-foreground capitalize">
                          {work.workType.replace(/_/g, " ")}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              work.status === "active"
                                ? "bg-green-50 text-green-700"
                                : work.status === "archived"
                                ? "bg-gray-100 text-gray-500"
                                : "bg-yellow-50 text-yellow-700"
                            }`}
                          >
                            {work.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={`/api/works/${work.id}/download`}
                              download
                              className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors"
                              title="Download source image"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => openEditModal(work.id)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                              title="Edit work"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {work.status === "archived" ? (
                              <button
                                onClick={() => restoreWork(work.id)}
                                disabled={actionInProgress === work.id}
                                className="p-1.5 text-gray-400 hover:text-green-600 rounded-md hover:bg-green-50 transition-colors"
                                title="Restore to active"
                              >
                                {actionInProgress === work.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => archiveWork(work.id)}
                                disabled={actionInProgress === work.id}
                                className="p-1.5 text-gray-400 hover:text-amber-600 rounded-md hover:bg-amber-50 transition-colors"
                                title="Archive work"
                              >
                                {actionInProgress === work.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Archive className="h-4 w-4" />
                                )}
                              </button>
                            )}
                            {confirmDelete === work.id ? (
                              <div className="flex items-center gap-1 ml-1">
                                <button
                                  onClick={() => deleteWork(work.id)}
                                  disabled={actionInProgress === work.id}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                >
                                  {actionInProgress === work.id
                                    ? "..."
                                    : "Confirm"}
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(work.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                                title="Delete permanently"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── Add Single Work Tab ─── */}
        {activeTab === "single" && (
          <div>
            <h2 className="text-2xl font-light mb-2">Add Work</h2>
            <p className="text-muted-foreground mb-8">
              Upload a single image and enter its metadata manually.
            </p>

            <div className="max-w-2xl space-y-6">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Image <span className="text-red-500">*</span>
                </label>
                <label
                  className={`flex items-center gap-3 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors ${
                    singleImage
                      ? "border-green-300 bg-green-50"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <Image
                    className={`h-8 w-8 ${
                      singleImage ? "text-green-600" : "text-muted-foreground"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {singleImage ? singleImage.name : "Choose image file"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {singleImage
                        ? `${(singleImage.size / 1024 / 1024).toFixed(1)} MB`
                        : "JPG, PNG, or WebP"}
                    </p>
                  </div>
                  {singleImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={URL.createObjectURL(singleImage)}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSingleImage(file);
                      // Auto-fill title from filename if title is empty
                      if (file && !singleForm.title) {
                        const name = file.name
                          .replace(/\.[^.]+$/, "")
                          .replace(/[-_]+/g, " ")
                          .replace(/\s+/g, " ")
                          .trim()
                          .replace(/\b\w/g, (c) => c.toUpperCase());
                        setSingleForm((prev) => ({ ...prev, title: name }));
                      }
                    }}
                  />
                </label>
              </div>

              {/* Title & Artist */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={singleForm.title}
                    onChange={(e) =>
                      setSingleForm({ ...singleForm, title: e.target.value })
                    }
                    placeholder="e.g. Coastal Dawn"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Artist <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={singleForm.artistName}
                    onChange={(e) =>
                      setSingleForm({ ...singleForm, artistName: e.target.value })
                    }
                    placeholder="e.g. Sarah Chen"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </div>

              {/* Work Type & Source */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Work Type
                  </label>
                  <select
                    value={singleForm.workType}
                    onChange={(e) =>
                      setSingleForm({ ...singleForm, workType: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  >
                    {WORK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {WORK_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Source
                  </label>
                  <input
                    type="text"
                    value={singleForm.source}
                    onChange={(e) =>
                      setSingleForm({ ...singleForm, source: e.target.value })
                    }
                    placeholder="e.g. General Public, Visual Contrast"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </div>

              {/* GP SKU & Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    GP SKU{" "}
                    <span className="font-normal text-gray-400">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={singleForm.gpSku}
                    onChange={(e) =>
                      setSingleForm({ ...singleForm, gpSku: e.target.value })
                    }
                    placeholder="e.g. GP20260001"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Dimensions{" "}
                    <span className="font-normal text-gray-400">(inches)</span>
                  </label>
                  <input
                    type="text"
                    value={singleForm.dimensions}
                    onChange={(e) =>
                      setSingleForm({ ...singleForm, dimensions: e.target.value })
                    }
                    placeholder="e.g. 24x36"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </div>

              {/* Retailer & Artist Exclusive */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Retailer Exclusive
                  </label>
                  <input
                    type="text"
                    value={singleForm.retailerExclusive}
                    onChange={(e) =>
                      setSingleForm({
                        ...singleForm,
                        retailerExclusive: e.target.value,
                      })
                    }
                    placeholder="e.g. RH, CB2"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Artist Exclusive To
                  </label>
                  <input
                    type="text"
                    value={singleForm.artistExclusiveTo}
                    onChange={(e) =>
                      setSingleForm({
                        ...singleForm,
                        artistExclusiveTo: e.target.value,
                      })
                    }
                    placeholder="e.g. RH"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </div>

              {/* GP Exclusive toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSingleForm({ ...singleForm, gpExclusive: !singleForm.gpExclusive })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-black/10 ${
                    singleForm.gpExclusive ? "bg-black" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      singleForm.gpExclusive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-700 font-medium">GP Exclusive</span>
              </div>

              {/* Available Sizes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Available Sizes{" "}
                  <span className="font-normal text-gray-400">
                    (comma-separated)
                  </span>
                </label>
                <input
                  type="text"
                  value={singleForm.availableSizes}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, availableSizes: e.target.value })
                  }
                  placeholder="8x10, 11x14, 24x36"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>

              {/* Skip AI */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="singleSkipAi"
                  checked={singleSkipAi}
                  onChange={(e) => setSingleSkipAi(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="singleSkipAi" className="text-sm text-muted-foreground">
                  Skip AI tagging (faster, tags can be generated later)
                </label>
              </div>

              {/* Submit */}
              <button
                onClick={handleSingleUpload}
                disabled={
                  !singleImage ||
                  !singleForm.title.trim() ||
                  !singleForm.artistName.trim() ||
                  singleUploading
                }
                className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {singleUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {singleUploading ? "Uploading..." : "Upload Work"}
              </button>

              {/* Result */}
              {singleResult && (
                <div
                  className={`rounded-xl border p-4 ${
                    singleResult.success
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <p
                    className={`text-sm font-medium flex items-center gap-2 ${
                      singleResult.success ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {singleResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {singleResult.message}
                  </p>
                  {singleResult.gpSku && (
                    <p className="text-xs text-green-600 mt-1 font-mono">
                      SKU: {singleResult.gpSku}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Bulk Import Tab ─── */}
        {activeTab === "import" && (
          <div>
            <h2 className="text-2xl font-light mb-2">Bulk Import</h2>
            <p className="text-muted-foreground mb-8">
              Upload images with an optional CSV for metadata. Without a CSV,
              titles are derived from filenames and metadata can be updated
              later.
            </p>

            <div className="rounded-xl border border-border p-5 mb-8">
              <h3 className="text-sm font-medium mb-3">CSV Format</h3>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium">Column</th>
                      <th className="text-left py-2 pr-4 font-medium">Required</th>
                      <th className="text-left py-2 font-medium">Example</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">gp_sku</td>
                      <td className="py-1.5 pr-4">No</td>
                      <td className="py-1.5">GP2006310 (optional)</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">filename</td>
                      <td className="py-1.5 pr-4 text-foreground font-medium">Yes</td>
                      <td className="py-1.5">coastal-dawn.jpg</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">title</td>
                      <td className="py-1.5 pr-4 text-foreground font-medium">Yes</td>
                      <td className="py-1.5">Coastal Dawn</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">artist_name</td>
                      <td className="py-1.5 pr-4 text-foreground font-medium">Yes</td>
                      <td className="py-1.5">Sarah Chen</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">work_type</td>
                      <td className="py-1.5 pr-4 text-foreground font-medium">Yes</td>
                      <td className="py-1.5">synograph, work_on_paper, work_on_canvas, photography, reductive</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">dimensions</td>
                      <td className="py-1.5 pr-4">No</td>
                      <td className="py-1.5">24x36 or 24x36x1.5</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">retailer_exclusive</td>
                      <td className="py-1.5 pr-4">No</td>
                      <td className="py-1.5">RH, CB2, Rejuvenation, Anthropologie</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">artist_exclusive_to</td>
                      <td className="py-1.5 pr-4">No</td>
                      <td className="py-1.5">RH</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-4 font-mono">source_type</td>
                      <td className="py-1.5 pr-4">No</td>
                      <td className="py-1.5">gp_original (default)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  CSV File <span className="text-muted-foreground text-xs font-normal">(optional — titles derived from filenames if omitted)</span>
                </label>
                <label
                  className={`flex items-center gap-3 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors ${
                    csvFile ? "border-green-300 bg-green-50" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <FileText className={`h-8 w-8 ${csvFile ? "text-green-600" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium">{csvFile ? csvFile.name : "Choose CSV file"}</p>
                    <p className="text-xs text-muted-foreground">
                      {csvFile
                        ? `${(csvFile.size / 1024).toFixed(1)} KB`
                        : "Columns: gp_sku, filename, title, artist_name, work_type, dimensions, retailer_exclusive"}
                    </p>
                  </div>
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Images ZIP <span className="text-red-500">*</span></label>
                <label
                  className={`flex items-center gap-3 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors ${
                    zipFile ? "border-green-300 bg-green-50" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <Image className={`h-8 w-8 ${zipFile ? "text-green-600" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium">{zipFile ? zipFile.name : "Choose ZIP file"}</p>
                    <p className="text-xs text-muted-foreground">
                      {zipFile
                        ? `${(zipFile.size / 1024 / 1024).toFixed(1)} MB`
                        : "ZIP containing JPG/PNG images matching CSV filenames"}
                    </p>
                  </div>
                  <input type="file" accept=".zip" className="hidden" onChange={(e) => setZipFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="skipAi"
                  checked={skipAiTagging}
                  onChange={(e) => setSkipAiTagging(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="skipAi" className="text-sm text-muted-foreground">
                  Skip AI tagging (faster import, tags can be generated later)
                </label>
              </div>

              <button
                onClick={handleUpload}
                disabled={(!csvFile && !zipFile) || uploading}
                className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Importing..." : "Start Import"}
              </button>

              {progress && (
                <div className="rounded-xl bg-muted p-4">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {progress}
                  </p>
                </div>
              )}

              {response && (
                <ImportLog response={response} />
              )}
            </div>
          </div>
        )}
        {/* ─── Update Metadata Tab ─── */}
        {activeTab === "metadata" && (
          <div>
            <h2 className="text-2xl font-light mb-2">Update Metadata</h2>
            <p className="text-muted-foreground mb-8">
              Upload a CSV to update metadata on existing works. Matches by GP
              SKU first, then falls back to filename.
            </p>

            <div className="rounded-xl border border-border p-5 mb-8">
              <h3 className="text-sm font-medium mb-3">CSV Format</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Include <span className="font-mono font-medium text-foreground">gp_sku</span> and/or{" "}
                <span className="font-mono font-medium text-foreground">filename</span> to match
                existing works. All other columns are optional — only non-empty
                fields will be updated.
              </p>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium">Column</th>
                      <th className="text-left py-2 pr-4 font-medium">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">gp_sku</td>
                      <td className="py-1.5">Match by SKU (primary)</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">filename</td>
                      <td className="py-1.5">Match by filename (fallback)</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">title</td>
                      <td className="py-1.5">Update title</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">artist_name</td>
                      <td className="py-1.5">Update artist name</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">work_type</td>
                      <td className="py-1.5">Update work type</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">dimensions</td>
                      <td className="py-1.5">Update dimensions (e.g. 24x36)</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">retailer_exclusive</td>
                      <td className="py-1.5">Update retailer exclusive</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono">artist_exclusive_to</td>
                      <td className="py-1.5">Update artist exclusive</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-4 font-mono">source_type</td>
                      <td className="py-1.5">Update source type</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  CSV File <span className="text-red-500">*</span>
                </label>
                <label
                  className={`flex items-center gap-3 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors ${
                    metadataCsvFile
                      ? "border-green-300 bg-green-50"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <FileText
                    className={`h-8 w-8 ${
                      metadataCsvFile ? "text-green-600" : "text-muted-foreground"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {metadataCsvFile ? metadataCsvFile.name : "Choose CSV file"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {metadataCsvFile
                        ? `${(metadataCsvFile.size / 1024).toFixed(1)} KB`
                        : "Must include gp_sku or filename column to match works"}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) =>
                      setMetadataCsvFile(e.target.files?.[0] || null)
                    }
                  />
                </label>
              </div>

              <button
                onClick={handleMetadataUpdate}
                disabled={!metadataCsvFile || metadataUploading}
                className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {metadataUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {metadataUploading ? "Updating..." : "Update Metadata"}
              </button>

              {metadataProgress && (
                <div className="rounded-xl bg-muted p-4">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {metadataProgress}
                  </p>
                </div>
              )}

              {metadataResponse && (
                <div className="space-y-4">
                  {metadataResponse.error && !metadataResponse.results?.length ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-medium text-red-800">
                        {metadataResponse.error}
                      </p>
                      {metadataResponse.details && (
                        <ul className="mt-2 space-y-1">
                          {metadataResponse.details.map((d, i) => (
                            <li key={i} className="text-xs text-red-600">
                              {d}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-sm font-medium">
                        {metadataResponse.message}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Total: {metadataResponse.total}</span>
                        <span className="text-green-600">
                          Updated: {metadataResponse.updatedCount}
                        </span>
                        {metadataResponse.notFoundCount > 0 && (
                          <span className="text-amber-600">
                            Not found: {metadataResponse.notFoundCount}
                          </span>
                        )}
                        {metadataResponse.errorCount > 0 && (
                          <span className="text-red-600">
                            Errors: {metadataResponse.errorCount}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {metadataResponse.results?.length > 0 && (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="text-left p-3 font-medium">Status</th>
                            <th className="text-left p-3 font-medium">Row</th>
                            <th className="text-left p-3 font-medium">SKU</th>
                            <th className="text-left p-3 font-medium">Title</th>
                            <th className="text-left p-3 font-medium">Matched By</th>
                            <th className="text-left p-3 font-medium">Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metadataResponse.results.map((r, i) => (
                            <tr
                              key={i}
                              className="border-b border-border/50 last:border-0"
                            >
                              <td className="p-3">
                                {r.success ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </td>
                              <td className="p-3 text-xs text-muted-foreground">
                                {r.row}
                              </td>
                              <td className="p-3 font-mono text-xs">
                                {r.gpSku || "—"}
                              </td>
                              <td className="p-3">{r.title}</td>
                              <td className="p-3 text-xs text-muted-foreground">
                                {r.matchedBy || "—"}
                              </td>
                              <td className="p-3 text-xs">
                                {r.error ? (
                                  <span className="text-red-500">{r.error}</span>
                                ) : r.fieldsUpdated.length > 0 ? (
                                  <span className="text-green-600">
                                    {r.fieldsUpdated.join(", ")}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {/* ─── Public Domain Tab ─── */}
        {activeTab === "public-domain" && (
          <div>
            <h2 className="text-2xl font-light mb-2">Public Domain</h2>
            <p className="text-muted-foreground mb-4">
              Search and import public domain artworks from world-class museums.
              Only images large enough for printing (12&quot;+ at 300 DPI) are shown.
            </p>

            {/* Museum sub-tabs */}
            <div className="flex gap-1 mb-8 bg-muted/50 rounded-lg p-1 w-fit">
              {([
                { key: "rijksmuseum" as MuseumSource, label: "Rijksmuseum" },
                { key: "getty" as MuseumSource, label: "Getty Museum" },
                { key: "met" as MuseumSource, label: "The Met" },
                { key: "yale" as MuseumSource, label: "Yale Art Gallery" },
                { key: "nga" as MuseumSource, label: "National Gallery" },
                { key: "cleveland" as MuseumSource, label: "Cleveland" },
              ]).map((museum) => (
                <button
                  key={museum.key}
                  onClick={() => setMuseumSource(museum.key)}
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    museumSource === museum.key
                      ? "bg-white text-black shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {museum.label}
                </button>
              ))}
            </div>

            {/* Min short side filter */}
            <div className="flex items-center gap-4 mb-6">
              <label className="text-sm text-muted-foreground whitespace-nowrap">
                Min short side:
              </label>
              <input
                type="range"
                min={0}
                max={36}
                step={1}
                value={minShortSide}
                onChange={(e) => setMinShortSide(parseInt(e.target.value, 10))}
                className="flex-1 max-w-xs accent-black"
              />
              <span className="text-sm font-medium w-16">
                {minShortSide === 0 ? "Any" : `${minShortSide}"`}
              </span>
            </div>

            {/* ── Rijksmuseum ── */}
            {museumSource === "rijksmuseum" && (
              <div>

            {/* Search */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={rijksQuery}
                  onChange={(e) => setRijksQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleRijksSearch(rijksQuery);
                    }
                  }}
                  placeholder="Search artworks... (e.g. Vermeer, landscape, still life)"
                  className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-foreground transition-colors"
                />
              </div>
              <button
                onClick={() => {
                  handleRijksSearch(rijksQuery);
                }}
                disabled={!rijksQuery.trim() || rijksLoading}
                className="px-6 py-2.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {rijksLoading ? "Searching..." : "Search"}
              </button>
            </div>

            {/* Results count */}
            {rijksTotalCount > 0 && !rijksLoading && (
              <p className="text-sm text-muted-foreground mb-4">
                {rijksTotalCount.toLocaleString()} results found
                {rijksSelected.size > 0 && (
                  <span className="text-foreground font-medium ml-2">
                    &middot; {rijksSelected.size} selected
                  </span>
                )}
              </p>
            )}

            {/* Loading */}
            {rijksLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Results Grid */}
            {!rijksLoading && rijksResults.length > 0 && (
              <>
                <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 mb-6">
                  {rijksResults.filter((item) => minShortSide === 0 || Math.min(item.maxPrintInches.width, item.maxPrintInches.height) >= minShortSide).map((item) => {
                    const isSelected = rijksSelected.has(item.objectNumber);
                    return (
                      <div
                        key={item.objectNumber}
                        className="break-inside-avoid mb-4"
                      >
                        <div
                          onClick={() => {
                            if (item.alreadyImported) return;
                            setRijksSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.objectNumber)) {
                                next.delete(item.objectNumber);
                              } else {
                                next.add(item.objectNumber);
                              }
                              return next;
                            });
                          }}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                            item.alreadyImported
                              ? "border-green-300 opacity-60 cursor-default"
                              : isSelected
                              ? "border-black ring-2 ring-black/20 cursor-pointer"
                              : "border-transparent hover:border-gray-300 cursor-pointer"
                          }`}
                        >
                          {/* Checkbox / Imported badge */}
                          <div className="absolute top-2 left-2 z-10">
                            {item.alreadyImported ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-600 text-white text-xs font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Imported
                              </span>
                            ) : (
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-black border-black"
                                    : "bg-white/80 border-gray-400"
                                }`}
                              >
                                {isSelected && (
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Download source */}
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-emerald-600 transition-colors shadow-sm"
                            title="Open source image"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>

                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full"
                            loading="lazy"
                          />
                          <div className="p-2.5 bg-white">
                            <p className="text-xs font-medium leading-tight truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.artist}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {item.imageWidth} &times; {item.imageHeight} px
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Max print: {item.maxPrintInches.width}&quot; &times; {item.maxPrintInches.height}&quot;
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Load More */}
                {rijksNextPageToken && (
                  <div className="flex items-center justify-center mb-6">
                    <button
                      onClick={() => {
                        handleRijksSearch(rijksQuery, rijksNextPageToken);
                      }}
                      className="px-6 py-2.5 text-sm border border-border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Load More Results
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Empty state */}
            {!rijksLoading &&
              rijksResults.length === 0 &&
              rijksQuery.trim() &&
              rijksTotalCount === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No results found. Try a different search term.
                </div>
              )}

            {/* Import results */}
            {rijksImportResults && (
              <div className="space-y-4 mb-6">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium">
                    {rijksImportResults.message}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {rijksImportResults.successCount > 0 && (
                      <span className="text-green-600">
                        Imported: {rijksImportResults.successCount}
                      </span>
                    )}
                    {rijksImportResults.skippedCount > 0 && (
                      <span className="text-amber-600">
                        Already existed: {rijksImportResults.skippedCount}
                      </span>
                    )}
                    {rijksImportResults.errorCount > 0 && (
                      <span className="text-red-600">
                        Failed: {rijksImportResults.errorCount}
                      </span>
                    )}
                  </div>
                </div>

                {rijksImportResults.results?.length > 0 && (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">SKU</th>
                          <th className="text-left p-3 font-medium">Title</th>
                          <th className="text-left p-3 font-medium">Artist</th>
                          <th className="text-left p-3 font-medium">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rijksImportResults.results.map((r, i) => (
                          <tr
                            key={i}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="p-3">
                              {r.success && !r.error ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : r.error === "Already imported" ? (
                                <span className="text-xs text-amber-600">
                                  Exists
                                </span>
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </td>
                            <td className="p-3 font-mono text-xs">
                              {r.gpSku}
                            </td>
                            <td className="p-3">{r.title}</td>
                            <td className="p-3 text-muted-foreground">
                              {r.artistName}
                            </td>
                            <td className="p-3 text-xs text-red-500">
                              {r.error || ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sticky import bar */}
            {rijksSelected.size > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-lg z-40">
                <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {rijksSelected.size} artwork
                    {rijksSelected.size === 1 ? "" : "s"} selected
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setRijksSelected(new Set())}
                      className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleRijksImport}
                      disabled={rijksImporting}
                      className="flex items-center gap-2 px-6 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {rijksImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {rijksImporting
                        ? "Importing..."
                        : `Import ${rijksSelected.size} to DAM`}
                    </button>
                  </div>
                </div>
              </div>
            )}
              </div>
            )}

            {/* ── Getty Museum ── */}
            {museumSource === "getty" && (
              <div>

            {/* Search */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={gettyQuery}
                  onChange={(e) => setGettyQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleGettySearch(gettyQuery);
                    }
                  }}
                  placeholder="Search artworks... (e.g. Van Gogh, landscape, portrait)"
                  className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-foreground transition-colors"
                />
              </div>
              <button
                onClick={() => {
                  handleGettySearch(gettyQuery);
                }}
                disabled={!gettyQuery.trim() || gettyLoading}
                className="px-6 py-2.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {gettyLoading ? "Searching..." : "Search"}
              </button>
            </div>

            {/* Results count */}
            {gettyTotalCount > 0 && !gettyLoading && (
              <p className="text-sm text-muted-foreground mb-4">
                {gettyTotalCount.toLocaleString()} results found — page {gettyPage}
                {gettySelected.size > 0 && (
                  <span className="text-foreground font-medium ml-2">
                    &middot; {gettySelected.size} selected
                  </span>
                )}
              </p>
            )}

            {/* Loading */}
            {gettyLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Results Grid */}
            {!gettyLoading && gettyResults.length > 0 && (
              <>
                <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 mb-6">
                  {gettyResults.filter((item) => minShortSide === 0 || Math.min(item.maxPrintInches.width, item.maxPrintInches.height) >= minShortSide).map((item) => {
                    const isSelected = gettySelected.has(item.accessionNumber);
                    return (
                      <div
                        key={item.accessionNumber}
                        className="break-inside-avoid mb-4"
                      >
                        <div
                          onClick={() => {
                            if (item.alreadyImported) return;
                            setGettySelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.accessionNumber)) {
                                next.delete(item.accessionNumber);
                              } else {
                                next.add(item.accessionNumber);
                              }
                              return next;
                            });
                          }}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                            item.alreadyImported
                              ? "border-green-300 opacity-60 cursor-default"
                              : isSelected
                              ? "border-black ring-2 ring-black/20 cursor-pointer"
                              : "border-transparent hover:border-gray-300 cursor-pointer"
                          }`}
                        >
                          {/* Checkbox / Imported badge */}
                          <div className="absolute top-2 left-2 z-10">
                            {item.alreadyImported ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-600 text-white text-xs font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Imported
                              </span>
                            ) : (
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-black border-black"
                                    : "bg-white/80 border-gray-400"
                                }`}
                              >
                                {isSelected && (
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Download source */}
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-emerald-600 transition-colors shadow-sm"
                            title="Open source image"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>

                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full"
                            loading="lazy"
                          />
                          <div className="p-2.5 bg-white">
                            <p className="text-xs font-medium leading-tight truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.artist}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {item.imageWidth} &times; {item.imageHeight} px
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Max print: {item.maxPrintInches.width}&quot; &times; {item.maxPrintInches.height}&quot;
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={() => handleGettySearch(gettyQuery, gettyPage - 1)}
                    disabled={gettyPage <= 1}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {gettyPage} of {Math.ceil(gettyTotalCount / 20)}
                  </span>
                  <button
                    onClick={() => handleGettySearch(gettyQuery, gettyPage + 1)}
                    disabled={gettyPage >= Math.ceil(gettyTotalCount / 20)}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {/* Empty state */}
            {!gettyLoading &&
              gettyResults.length === 0 &&
              gettyQuery.trim() &&
              gettyTotalCount === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No results found. Try a different search term.
                </div>
              )}

            {/* Import results */}
            {gettyImportResults && (
              <div className="space-y-4 mb-6">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium">
                    {gettyImportResults.message}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {gettyImportResults.successCount > 0 && (
                      <span className="text-green-600">
                        Imported: {gettyImportResults.successCount}
                      </span>
                    )}
                    {gettyImportResults.skippedCount > 0 && (
                      <span className="text-amber-600">
                        Already existed: {gettyImportResults.skippedCount}
                      </span>
                    )}
                    {gettyImportResults.errorCount > 0 && (
                      <span className="text-red-600">
                        Failed: {gettyImportResults.errorCount}
                      </span>
                    )}
                  </div>
                </div>

                {gettyImportResults.results?.length > 0 && (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">SKU</th>
                          <th className="text-left p-3 font-medium">Title</th>
                          <th className="text-left p-3 font-medium">Artist</th>
                          <th className="text-left p-3 font-medium">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gettyImportResults.results.map((r, i) => (
                          <tr
                            key={i}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="p-3">
                              {r.success && !r.error ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : r.error === "Already imported" ? (
                                <span className="text-xs text-amber-600">
                                  Exists
                                </span>
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </td>
                            <td className="p-3 font-mono text-xs">
                              {r.gpSku}
                            </td>
                            <td className="p-3">{r.title}</td>
                            <td className="p-3 text-muted-foreground">
                              {r.artistName}
                            </td>
                            <td className="p-3 text-xs text-red-500">
                              {r.error || ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sticky import bar */}
            {gettySelected.size > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-lg z-40">
                <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {gettySelected.size} artwork
                    {gettySelected.size === 1 ? "" : "s"} selected
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setGettySelected(new Set())}
                      className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleGettyImport}
                      disabled={gettyImporting}
                      className="flex items-center gap-2 px-6 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {gettyImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {gettyImporting
                        ? "Importing..."
                        : `Import ${gettySelected.size} to DAM`}
                    </button>
                  </div>
                </div>
              </div>
            )}
              </div>
            )}

            {/* ── The Met ── */}
            {museumSource === "met" && (
              <div>
            {/* Search */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={metQuery}
                  onChange={(e) => setMetQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleMetSearch(metQuery);
                    }
                  }}
                  placeholder="Search artworks... (e.g. Monet, landscape, portrait)"
                  className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-foreground transition-colors"
                />
              </div>
              <button
                onClick={() => {
                  handleMetSearch(metQuery);
                }}
                disabled={!metQuery.trim() || metLoading}
                className="px-6 py-2.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {metLoading ? "Searching..." : "Search"}
              </button>
            </div>

            {/* Results count */}
            {metTotalCount > 0 && !metLoading && (
              <p className="text-sm text-muted-foreground mb-4">
                {metTotalCount.toLocaleString()} results found — page {metPage} of {metTotalPages}
                {metSelected.size > 0 && (
                  <span className="text-foreground font-medium ml-2">
                    &middot; {metSelected.size} selected
                  </span>
                )}
              </p>
            )}

            {/* Loading */}
            {metLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Results Grid */}
            {!metLoading && metResults.length > 0 && (
              <>
                <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 mb-6">
                  {metResults.filter((item) => minShortSide === 0 || Math.min(item.maxPrintInches.width, item.maxPrintInches.height) >= minShortSide).map((item) => {
                    const isSelected = metSelected.has(item.accessionNumber);
                    return (
                      <div
                        key={item.objectID}
                        className="break-inside-avoid mb-4"
                      >
                        <div
                          onClick={() => {
                            if (item.alreadyImported) return;
                            setMetSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.accessionNumber)) {
                                next.delete(item.accessionNumber);
                              } else {
                                next.add(item.accessionNumber);
                              }
                              return next;
                            });
                          }}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                            item.alreadyImported
                              ? "border-green-300 opacity-60 cursor-default"
                              : isSelected
                              ? "border-black ring-2 ring-black/20 cursor-pointer"
                              : "border-transparent hover:border-gray-300 cursor-pointer"
                          }`}
                        >
                          {/* Checkbox / Imported badge */}
                          <div className="absolute top-2 left-2 z-10">
                            {item.alreadyImported ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-600 text-white text-xs font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Imported
                              </span>
                            ) : (
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-black border-black"
                                    : "bg-white/80 border-gray-400"
                                }`}
                              >
                                {isSelected && (
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Download source */}
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-emerald-600 transition-colors shadow-sm"
                            title="Open source image"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>

                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full"
                            loading="lazy"
                          />
                          <div className="p-2.5 bg-white">
                            <p className="text-xs font-medium leading-tight truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.artist}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {item.imageWidth} &times; {item.imageHeight} px
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Max print: {item.maxPrintInches.width}&quot; &times; {item.maxPrintInches.height}&quot;
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={() => handleMetSearch(metQuery, metPage - 1)}
                    disabled={metPage <= 1}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {metPage} of {metTotalPages}
                  </span>
                  <button
                    onClick={() => handleMetSearch(metQuery, metPage + 1)}
                    disabled={metPage >= metTotalPages}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {/* Empty state */}
            {!metLoading &&
              metResults.length === 0 &&
              metQuery.trim() &&
              metTotalCount === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No results found. Try a different search term.
                </div>
              )}

            {/* Import results */}
            {metImportResults && (
              <div className="space-y-4 mb-6">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium">
                    {metImportResults.message}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {metImportResults.successCount > 0 && (
                      <span className="text-green-600">
                        Imported: {metImportResults.successCount}
                      </span>
                    )}
                    {metImportResults.skippedCount > 0 && (
                      <span className="text-amber-600">
                        Already existed: {metImportResults.skippedCount}
                      </span>
                    )}
                    {metImportResults.errorCount > 0 && (
                      <span className="text-red-600">
                        Failed: {metImportResults.errorCount}
                      </span>
                    )}
                  </div>
                </div>

                {metImportResults.results?.length > 0 && (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">SKU</th>
                          <th className="text-left p-3 font-medium">Title</th>
                          <th className="text-left p-3 font-medium">Artist</th>
                          <th className="text-left p-3 font-medium">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metImportResults.results.map((r, i) => (
                          <tr
                            key={i}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="p-3">
                              {r.success && !r.error ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : r.error === "Already imported" ? (
                                <span className="text-xs text-amber-600">
                                  Exists
                                </span>
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </td>
                            <td className="p-3 font-mono text-xs">
                              {r.gpSku}
                            </td>
                            <td className="p-3">{r.title}</td>
                            <td className="p-3 text-muted-foreground">
                              {r.artistName}
                            </td>
                            <td className="p-3 text-xs text-red-500">
                              {r.error || ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sticky import bar */}
            {metSelected.size > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-lg z-40">
                <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {metSelected.size} artwork
                    {metSelected.size === 1 ? "" : "s"} selected
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setMetSelected(new Set())}
                      className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleMetImport}
                      disabled={metImporting}
                      className="flex items-center gap-2 px-6 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {metImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {metImporting
                        ? "Importing..."
                        : `Import ${metSelected.size} to DAM`}
                    </button>
                  </div>
                </div>
              </div>
            )}
              </div>
            )}

            {/* ── Yale Art Gallery ── */}
            {museumSource === "yale" && (
              <div>
            {/* Search */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={yaleQuery}
                  onChange={(e) => setYaleQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleYaleSearch(yaleQuery);
                    }
                  }}
                  placeholder="Search artworks... (e.g. Monet, landscape, portrait)"
                  className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-foreground transition-colors"
                />
              </div>
              <button
                onClick={() => {
                  handleYaleSearch(yaleQuery);
                }}
                disabled={!yaleQuery.trim() || yaleLoading}
                className="px-6 py-2.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {yaleLoading ? "Searching..." : "Search"}
              </button>
            </div>

            {/* Results count */}
            {yaleTotalCount > 0 && !yaleLoading && (
              <p className="text-sm text-muted-foreground mb-4">
                {yaleTotalCount.toLocaleString()} results found — page {yalePage} of {yaleTotalPages}
                {yaleSelected.size > 0 && (
                  <span className="text-foreground font-medium ml-2">
                    &middot; {yaleSelected.size} selected
                  </span>
                )}
              </p>
            )}

            {/* Loading */}
            {yaleLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Results Grid */}
            {!yaleLoading && yaleResults.length > 0 && (
              <>
                <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 mb-6">
                  {yaleResults.filter((item) => minShortSide === 0 || Math.min(item.maxPrintInches.width, item.maxPrintInches.height) >= minShortSide).map((item) => {
                    const isSelected = yaleSelected.has(item.accessionNumber);
                    return (
                      <div
                        key={item.objectId}
                        className="break-inside-avoid mb-4"
                      >
                        <div
                          onClick={() => {
                            if (item.alreadyImported) return;
                            setYaleSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.accessionNumber)) {
                                next.delete(item.accessionNumber);
                              } else {
                                next.add(item.accessionNumber);
                              }
                              return next;
                            });
                          }}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                            item.alreadyImported
                              ? "border-green-300 opacity-60 cursor-default"
                              : isSelected
                              ? "border-black ring-2 ring-black/20 cursor-pointer"
                              : "border-transparent hover:border-gray-300 cursor-pointer"
                          }`}
                        >
                          {/* Checkbox / Imported badge */}
                          <div className="absolute top-2 left-2 z-10">
                            {item.alreadyImported ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-600 text-white text-xs font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Imported
                              </span>
                            ) : (
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-black border-black"
                                    : "bg-white/80 border-gray-400"
                                }`}
                              >
                                {isSelected && (
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Download source */}
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-emerald-600 transition-colors shadow-sm"
                            title="Open source image"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>

                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full"
                            loading="lazy"
                          />
                          <div className="p-2.5 bg-white">
                            <p className="text-xs font-medium leading-tight truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.artist}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {item.imageWidth} &times; {item.imageHeight} px
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Max print: {item.maxPrintInches.width}&quot; &times; {item.maxPrintInches.height}&quot;
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={() => handleYaleSearch(yaleQuery, yalePage - 1)}
                    disabled={yalePage <= 1}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {yalePage} of {yaleTotalPages}
                  </span>
                  <button
                    onClick={() => handleYaleSearch(yaleQuery, yalePage + 1)}
                    disabled={yalePage >= yaleTotalPages}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {/* Empty state */}
            {!yaleLoading &&
              yaleResults.length === 0 &&
              yaleQuery.trim() &&
              yaleTotalCount === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No results found. Try a different search term.
                </div>
              )}

            {/* Import results */}
            {yaleImportResults && (
              <div className="space-y-4 mb-6">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium">
                    {yaleImportResults.message}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {yaleImportResults.successCount > 0 && (
                      <span className="text-green-600">
                        Imported: {yaleImportResults.successCount}
                      </span>
                    )}
                    {yaleImportResults.skippedCount > 0 && (
                      <span className="text-amber-600">
                        Already existed: {yaleImportResults.skippedCount}
                      </span>
                    )}
                    {yaleImportResults.errorCount > 0 && (
                      <span className="text-red-600">
                        Failed: {yaleImportResults.errorCount}
                      </span>
                    )}
                  </div>
                </div>

                {yaleImportResults.results?.length > 0 && (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">SKU</th>
                          <th className="text-left p-3 font-medium">Title</th>
                          <th className="text-left p-3 font-medium">Artist</th>
                          <th className="text-left p-3 font-medium">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yaleImportResults.results.map((r, i) => (
                          <tr
                            key={i}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="p-3">
                              {r.success && !r.error ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : r.error === "Already imported" ? (
                                <span className="text-xs text-amber-600">
                                  Exists
                                </span>
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </td>
                            <td className="p-3 font-mono text-xs">
                              {r.gpSku}
                            </td>
                            <td className="p-3">{r.title}</td>
                            <td className="p-3 text-muted-foreground">
                              {r.artistName}
                            </td>
                            <td className="p-3 text-xs text-red-500">
                              {r.error || ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sticky import bar */}
            {yaleSelected.size > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-lg z-40">
                <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {yaleSelected.size} artwork
                    {yaleSelected.size === 1 ? "" : "s"} selected
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setYaleSelected(new Set())}
                      className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleYaleImport}
                      disabled={yaleImporting}
                      className="flex items-center gap-2 px-6 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {yaleImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {yaleImporting
                        ? "Importing..."
                        : `Import ${yaleSelected.size} to DAM`}
                    </button>
                  </div>
                </div>
              </div>
            )}
              </div>
            )}

            {/* ── National Gallery of Art ── */}
            {museumSource === "nga" && (
              <div>
            {/* Search */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={ngaQuery}
                  onChange={(e) => setNgaQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleNgaSearch(ngaQuery);
                    }
                  }}
                  placeholder="Search artworks... (e.g. Monet, landscape, portrait)"
                  className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-foreground transition-colors"
                />
              </div>
              <button
                onClick={() => {
                  handleNgaSearch(ngaQuery);
                }}
                disabled={!ngaQuery.trim() || ngaLoading}
                className="px-6 py-2.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {ngaLoading ? "Searching..." : "Search"}
              </button>
            </div>

            {/* Results count */}
            {ngaTotalCount > 0 && !ngaLoading && (
              <p className="text-sm text-muted-foreground mb-4">
                {ngaTotalCount.toLocaleString()} results found — page {ngaPage} of {ngaTotalPages}
                {ngaSelected.size > 0 && (
                  <span className="text-foreground font-medium ml-2">
                    &middot; {ngaSelected.size} selected
                  </span>
                )}
              </p>
            )}

            {/* Loading */}
            {ngaLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Results Grid */}
            {!ngaLoading && ngaResults.length > 0 && (
              <>
                <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 mb-6">
                  {ngaResults.filter((item) => minShortSide === 0 || Math.min(item.maxPrintInches.width, item.maxPrintInches.height) >= minShortSide).map((item) => {
                    const isSelected = ngaSelected.has(item.accessionNumber);
                    return (
                      <div
                        key={item.objectId}
                        className="break-inside-avoid mb-4"
                      >
                        <div
                          onClick={() => {
                            if (item.alreadyImported) return;
                            setNgaSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.accessionNumber)) {
                                next.delete(item.accessionNumber);
                              } else {
                                next.add(item.accessionNumber);
                              }
                              return next;
                            });
                          }}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                            item.alreadyImported
                              ? "border-green-300 opacity-60 cursor-default"
                              : isSelected
                              ? "border-black ring-2 ring-black/20 cursor-pointer"
                              : "border-transparent hover:border-gray-300 cursor-pointer"
                          }`}
                        >
                          {/* Checkbox / Imported badge */}
                          <div className="absolute top-2 left-2 z-10">
                            {item.alreadyImported ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-600 text-white text-xs font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Imported
                              </span>
                            ) : (
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-black border-black"
                                    : "bg-white/80 border-gray-400"
                                }`}
                              >
                                {isSelected && (
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Download source */}
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-emerald-600 transition-colors shadow-sm"
                            title="Open source image"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>

                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full"
                            loading="lazy"
                          />
                          <div className="p-2.5 bg-white">
                            <p className="text-xs font-medium leading-tight truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.artist}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {item.imageWidth} &times; {item.imageHeight} px
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Max print: {item.maxPrintInches.width}&quot; &times; {item.maxPrintInches.height}&quot;
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={() => handleNgaSearch(ngaQuery, ngaPage - 1)}
                    disabled={ngaPage <= 1}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {ngaPage} of {ngaTotalPages}
                  </span>
                  <button
                    onClick={() => handleNgaSearch(ngaQuery, ngaPage + 1)}
                    disabled={ngaPage >= ngaTotalPages}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {/* Empty state */}
            {!ngaLoading &&
              ngaResults.length === 0 &&
              ngaQuery.trim() &&
              ngaTotalCount === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No results found. Try a different search term.
                </div>
              )}

            {/* Import results */}
            {ngaImportResults && (
              <div className="space-y-4 mb-6">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium">
                    {ngaImportResults.message}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {ngaImportResults.successCount > 0 && (
                      <span className="text-green-600">
                        Imported: {ngaImportResults.successCount}
                      </span>
                    )}
                    {ngaImportResults.skippedCount > 0 && (
                      <span className="text-amber-600">
                        Already existed: {ngaImportResults.skippedCount}
                      </span>
                    )}
                    {ngaImportResults.errorCount > 0 && (
                      <span className="text-red-600">
                        Failed: {ngaImportResults.errorCount}
                      </span>
                    )}
                  </div>
                </div>

                {ngaImportResults.results?.length > 0 && (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">SKU</th>
                          <th className="text-left p-3 font-medium">Title</th>
                          <th className="text-left p-3 font-medium">Artist</th>
                          <th className="text-left p-3 font-medium">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ngaImportResults.results.map((r, i) => (
                          <tr
                            key={i}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="p-3">
                              {r.success && !r.error ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : r.error === "Already imported" ? (
                                <span className="text-xs text-amber-600">
                                  Exists
                                </span>
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </td>
                            <td className="p-3 font-mono text-xs">
                              {r.gpSku}
                            </td>
                            <td className="p-3">{r.title}</td>
                            <td className="p-3 text-muted-foreground">
                              {r.artistName}
                            </td>
                            <td className="p-3 text-xs text-red-500">
                              {r.error || ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sticky import bar */}
            {ngaSelected.size > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-lg z-40">
                <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {ngaSelected.size} artwork
                    {ngaSelected.size === 1 ? "" : "s"} selected
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setNgaSelected(new Set())}
                      className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleNgaImport}
                      disabled={ngaImporting}
                      className="flex items-center gap-2 px-6 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {ngaImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {ngaImporting
                        ? "Importing..."
                        : `Import ${ngaSelected.size} to DAM`}
                    </button>
                  </div>
                </div>
              </div>
            )}
              </div>
            )}

            {/* ── Cleveland Museum of Art ── */}
            {museumSource === "cleveland" && (
              <div>
            {/* Search */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={clevelandQuery}
                  onChange={(e) => setClevelandQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleClevelandSearch(clevelandQuery);
                    }
                  }}
                  placeholder="Search artworks... (e.g. Monet, landscape, portrait)"
                  className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-foreground transition-colors"
                />
              </div>
              <button
                onClick={() => {
                  handleClevelandSearch(clevelandQuery);
                }}
                disabled={!clevelandQuery.trim() || clevelandLoading}
                className="px-6 py-2.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {clevelandLoading ? "Searching..." : "Search"}
              </button>
            </div>

            {/* Results count */}
            {clevelandTotalCount > 0 && !clevelandLoading && (
              <p className="text-sm text-muted-foreground mb-4">
                {clevelandTotalCount.toLocaleString()} results found — page {clevelandPage} of {clevelandTotalPages}
                {clevelandSelected.size > 0 && (
                  <span className="text-foreground font-medium ml-2">
                    &middot; {clevelandSelected.size} selected
                  </span>
                )}
              </p>
            )}

            {/* Loading */}
            {clevelandLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Results Grid */}
            {!clevelandLoading && clevelandResults.length > 0 && (
              <>
                <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 mb-6">
                  {clevelandResults.filter((item) => minShortSide === 0 || Math.min(item.maxPrintInches.width, item.maxPrintInches.height) >= minShortSide).map((item) => {
                    const isSelected = clevelandSelected.has(item.accessionNumber);
                    return (
                      <div
                        key={item.objectId}
                        className="break-inside-avoid mb-4"
                      >
                        <div
                          onClick={() => {
                            if (item.alreadyImported) return;
                            setClevelandSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.accessionNumber)) {
                                next.delete(item.accessionNumber);
                              } else {
                                next.add(item.accessionNumber);
                              }
                              return next;
                            });
                          }}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                            item.alreadyImported
                              ? "border-green-300 opacity-60 cursor-default"
                              : isSelected
                              ? "border-black ring-2 ring-black/20 cursor-pointer"
                              : "border-transparent hover:border-gray-300 cursor-pointer"
                          }`}
                        >
                          {/* Checkbox / Imported badge */}
                          <div className="absolute top-2 left-2 z-10">
                            {item.alreadyImported ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-600 text-white text-xs font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Imported
                              </span>
                            ) : (
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-black border-black"
                                    : "bg-white/80 border-gray-400"
                                }`}
                              >
                                {isSelected && (
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Download source */}
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-emerald-600 transition-colors shadow-sm"
                            title="Open source image"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>

                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full"
                            loading="lazy"
                          />
                          <div className="p-2.5 bg-white">
                            <p className="text-xs font-medium leading-tight truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.artist}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {item.imageWidth} &times; {item.imageHeight} px
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Max print: {item.maxPrintInches.width}&quot; &times; {item.maxPrintInches.height}&quot;
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={() => handleClevelandSearch(clevelandQuery, clevelandPage - 1)}
                    disabled={clevelandPage <= 1}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {clevelandPage} of {clevelandTotalPages}
                  </span>
                  <button
                    onClick={() => handleClevelandSearch(clevelandQuery, clevelandPage + 1)}
                    disabled={clevelandPage >= clevelandTotalPages}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {/* Empty state */}
            {!clevelandLoading &&
              clevelandResults.length === 0 &&
              clevelandQuery.trim() &&
              clevelandTotalCount === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No results found. Try a different search term.
                </div>
              )}

            {/* Import results */}
            {clevelandImportResults && (
              <div className="space-y-4 mb-6">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium">
                    {clevelandImportResults.message}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {clevelandImportResults.successCount > 0 && (
                      <span className="text-green-600">
                        Imported: {clevelandImportResults.successCount}
                      </span>
                    )}
                    {clevelandImportResults.skippedCount > 0 && (
                      <span className="text-amber-600">
                        Already existed: {clevelandImportResults.skippedCount}
                      </span>
                    )}
                    {clevelandImportResults.errorCount > 0 && (
                      <span className="text-red-600">
                        Failed: {clevelandImportResults.errorCount}
                      </span>
                    )}
                  </div>
                </div>

                {clevelandImportResults.results?.length > 0 && (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">SKU</th>
                          <th className="text-left p-3 font-medium">Title</th>
                          <th className="text-left p-3 font-medium">Artist</th>
                          <th className="text-left p-3 font-medium">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clevelandImportResults.results.map((r, i) => (
                          <tr
                            key={i}
                            className="border-b border-border/50 last:border-0"
                          >
                            <td className="p-3">
                              {r.success && !r.error ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : r.error === "Already imported" ? (
                                <span className="text-xs text-amber-600">
                                  Exists
                                </span>
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </td>
                            <td className="p-3 font-mono text-xs">
                              {r.gpSku}
                            </td>
                            <td className="p-3">{r.title}</td>
                            <td className="p-3 text-muted-foreground">
                              {r.artistName}
                            </td>
                            <td className="p-3 text-xs text-red-500">
                              {r.error || ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sticky import bar */}
            {clevelandSelected.size > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-lg z-40">
                <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {clevelandSelected.size} artwork
                    {clevelandSelected.size === 1 ? "" : "s"} selected
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setClevelandSelected(new Set())}
                      className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleClevelandImport}
                      disabled={clevelandImporting}
                      className="flex items-center gap-2 px-6 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {clevelandImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {clevelandImporting
                        ? "Importing..."
                        : `Import ${clevelandSelected.size} to DAM`}
                    </button>
                  </div>
                </div>
              </div>
            )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit Work Modal */}
      {editingWork && (
        <EditWorkModal
          work={editingWork}
          onClose={() => setEditingWork(null)}
          onSaved={fetchWorks}
        />
      )}
    </div>
  );
}
