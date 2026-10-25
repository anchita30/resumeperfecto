"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import AnalyzeForm from "@/components/AnalyzeForm";
import { AnalysisResult } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNewResult = (r: AnalysisResult) => {
    setRefreshKey((k) => k + 1);
    router.push(`/results/${r.id}`);
  };

  return (
    <main className="max-w-[1400px] mx-auto p-6 flex gap-6 items-start">
      <Sidebar refreshKey={refreshKey} />

      <div className="flex-1 flex flex-col gap-6 min-w-0">
        <header className="clay-card-peach px-6 py-4 flex items-center gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden shadow-clay-sm relative flex-shrink-0">
            <Image src="/character.png" alt="ResumePerfecto" fill className="object-cover" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl">ResumePerfecto</h1>
            <p className="text-sm text-clay-textSoft">
              Semantic resume ↔ job description matcher &amp; skill gap analyzer
            </p>
          </div>
        </header>

        <AnalyzeForm onResult={handleNewResult} />

        <div className="clay-card-blue p-8 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-24 h-24 rounded-full overflow-hidden shadow-clay-sm relative">
            <Image src="/character.png" alt="Helper" fill className="object-cover" />
          </div>
          <p className="text-sm max-w-md">
            Upload or paste a resume and job description above, then hit
            <strong> Analyze Match</strong> — you'll be taken straight to your
            full report with score, skill gaps, and downloadable PDF.
          </p>
        </div>
      </div>
    </main>
  );
}
