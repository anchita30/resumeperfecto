"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History, FileText, Sparkles, RefreshCw, Trash2 } from "lucide-react";
import { getHistory, deleteHistoryItem, HistoryItem } from "@/lib/api";

interface SidebarProps {
  refreshKey?: number;
  activeId?: number | null;
}

export default function Sidebar({ refreshKey = 0, activeId = null }: SidebarProps) {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHistory(30);
      setItems(data);
    } catch (e) {
      setError("Couldn't load history. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this analysis report?")) return;
    try {
      await deleteHistoryItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (activeId === id) {
        router.push("/");
      }
    } catch (err) {
      alert("Failed to delete analysis record. Please try again.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return (
    <aside className="clay-card bg-clay-lavender/20 w-72 flex-shrink-0 h-[calc(100vh-3rem)] p-5 flex flex-col gap-4 sticky top-6">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-clay-sm bg-clay-lavender shadow-clay-sm flex items-center justify-center">
          <History size={18} className="text-clay-text" />
        </div>
        <h2 className="font-heading font-semibold text-lg">History</h2>
        <button
          onClick={load}
          className="ml-auto w-8 h-8 rounded-full flex items-center justify-center hover:bg-clay-blue/30 transition"
          title="Refresh"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        {error && <p className="text-sm text-clay-pinkDark">{error}</p>}
        {!error && items.length === 0 && !loading && (
          <div className="text-sm text-clay-textSoft flex flex-col items-center text-center gap-2 mt-8">
            <Sparkles size={22} />
            <p>No analyses yet. Run your first match to see it here.</p>
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => router.push(`/results/${item.id}`)}
            className={`group text-left clay-tab flex items-center justify-between gap-2 cursor-pointer transition ${
              activeId === item.id ? "clay-tab-active" : "clay-tab-inactive"
            }`}
          >
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <FileText size={16} className="mt-0.5 flex-shrink-0 text-clay-textSoft" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {item.resume_filename || "Pasted resume"} vs {item.jd_filename || "Pasted JD"}
                </p>
                <p className="text-xs text-clay-textSoft">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(item.id);
              }}
              title="Delete this analysis"
              className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-100/80 transition opacity-60 group-hover:opacity-100 flex-shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
