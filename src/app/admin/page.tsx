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
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface ImportResult {
  success: boolean;
  gpSku: string;
  title: string;
  artistName: string;
  error?: string;
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
  status: string;
  createdAt: string;
}

type AdminTab = "import" | "works";

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

  // Works management state
  const [works, setWorks] = useState<Work[]>([]);
  const [worksLoading, setWorksLoading] = useState(false);
  const [worksSearch, setWorksSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [editingWork, setEditingWork] = useState<Work | null>(null);

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
    if (!csvFile) return;

    setUploading(true);
    setProgress("Uploading files...");
    setResponse(null);

    const formData = new FormData();
    formData.append("csv", csvFile);
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
            onClick={() => setActiveTab("import")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "import"
                ? "border-black text-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Bulk Import
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
              <span className="text-sm text-muted-foreground">
                {works.length} works
              </span>
            </div>

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

        {/* ─── Bulk Import Tab ─── */}
        {activeTab === "import" && (
          <div>
            <h2 className="text-2xl font-light mb-2">Bulk Import</h2>
            <p className="text-muted-foreground mb-8">
              Upload a CSV file and ZIP of images to import artwork into the
              catalog.
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
                      <td className="py-1.5">GP2006310 (auto-generated if blank)</td>
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
                  CSV File <span className="text-red-500">*</span>
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
                <label className="block text-sm font-medium mb-2">Images ZIP</label>
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
                disabled={!csvFile || uploading}
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
                          {response.results.map((r, i) => (
                            <tr key={i} className="border-b border-border/50 last:border-0">
                              <td className="p-3">
                                {r.success ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </td>
                              <td className="p-3 font-mono text-xs">{r.gpSku}</td>
                              <td className="p-3">{r.title}</td>
                              <td className="p-3 text-muted-foreground">{r.artistName}</td>
                              <td className="p-3 text-xs text-red-500">{r.error || ""}</td>
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
