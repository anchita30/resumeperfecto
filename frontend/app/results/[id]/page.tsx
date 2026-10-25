"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ResultsPanel from "@/components/ResultsPanel";
import Mascot from "@/components/Mascot";
import { AnalysisResult, getHistoryItem } from "@/lib/api";

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || Number.isNaN(id)) return;
    setLoading(true);
    setError(null);
    getHistoryItem(id)
      .then((item) => {
        setResult({ id: item.id, created_at: item.created_at, ...item.result } as AnalysisResult);
      })
      .catch(() => setError("Couldn't load this report. It may not exist, or the backend isn't running."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <main className="max-w-[1400px] mx-auto p-6 flex gap-6 items-start">
      <Sidebar activeId={id} />

      <div className="flex-1 flex flex-col gap-6 min-w-0">
        <header className="clay-card-peach px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-clay-sm relative flex-shrink-0">
              <Image src="/character.png" alt="ResumePerfecto" fill className="object-cover" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl">ResumePerfecto</h1>
              <p className="text-sm text-clay-textSoft">Match report #{id}</p>
            </div>
          </div>
          <Link
            href="/"
            className="clay-button px-4 py-2 bg-clay-blue flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            New Analysis
          </Link>
        </header>

        {loading && (
          <div className="clay-card p-10 flex justify-center">
            <Mascot mood="thinking" message="Loading your report..." />
          </div>
        )}

        {!loading && error && (
          <div className="clay-card p-10 flex flex-col items-center gap-3 text-center">
            <Mascot mood="sad" message={error} />
            <Link href="/" className="clay-button px-4 py-2 bg-clay-blue text-sm">
              Start a new analysis
            </Link>
          </div>
        )}

        {!loading && !error && result && <ResultsPanel result={result} />}
      </div>
    </main>
  );
}
