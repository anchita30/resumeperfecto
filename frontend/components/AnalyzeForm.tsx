"use client";

import { useState } from "react";
import { UploadCloud, FileText, Sparkles, Loader2 } from "lucide-react";
import { analyze, AnalysisResult } from "@/lib/api";

interface AnalyzeFormProps {
  onResult: (result: AnalysisResult) => void;
}

function FileOnlyPane({
  label,
  file,
  setFile,
  accent,
  accept,
}: {
  label: string;
  file: File | null;
  setFile: (f: File | null) => void;
  accent: string;
  accept: string;
}) {
  return (
    <div className="clay-card-blue p-5 flex-1 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-clay-sm shadow-clay-sm flex items-center justify-center"
          style={{ backgroundColor: accent }}
        >
          <FileText size={16} className="text-clay-text" />
        </div>
        <h3 className="font-heading font-semibold">{label}</h3>
      </div>

      <label className="clay-input flex flex-col items-center justify-center gap-1 py-10 cursor-pointer text-center">
        <UploadCloud size={22} className="text-clay-textSoft" />
        <span className="text-sm text-clay-textSoft">
          {file ? file.name : `Click to upload ${accept.replace(/\./g, "").replace(/,/g, " / ")}`}
        </span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>
    </div>
  );
}

function FileOrTextPane({
  label,
  file,
  setFile,
  text,
  setText,
  accent,
  accept,
}: {
  label: string;
  file: File | null;
  setFile: (f: File | null) => void;
  text: string;
  setText: (t: string) => void;
  accent: string;
  accept: string;
}) {
  return (
    <div className="clay-card-green p-5 flex-1 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-clay-sm shadow-clay-sm flex items-center justify-center"
          style={{ backgroundColor: accent }}
        >
          <FileText size={16} className="text-clay-text" />
        </div>
        <h3 className="font-heading font-semibold">{label}</h3>
      </div>

      <label className="clay-input flex flex-col items-center justify-center gap-1 py-6 cursor-pointer text-center">
        <UploadCloud size={22} className="text-clay-textSoft" />
        <span className="text-sm text-clay-textSoft">
          {file ? file.name : `Click to upload ${accept.replace(/\./g, "").replace(/,/g, " / ")}`}
        </span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>

      <div className="flex items-center gap-2 text-xs text-clay-textSoft">
        <div className="flex-1 h-px bg-clay-textSoft/20" />
        or paste text
        <div className="flex-1 h-px bg-clay-textSoft/20" />
      </div>

      <textarea
        className="clay-input p-3 text-sm resize-none h-28"
        placeholder={`Paste ${label.toLowerCase()} text here...`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
}

export default function AnalyzeForm({ onResult }: AnalyzeFormProps) {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resume is file-only now, so it just needs a file selected.
  const canSubmit = !!resumeFile && (!!jdFile || jdText.trim());

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyze({
        resumeFile,
        jdFile,
        jdText: jdText.trim() || undefined,
      });
      onResult(result);
    } catch (e: any) {
      setError(
        e?.response?.data?.detail
          ? String(e.response.data.detail)
          : "Something went wrong reaching the backend. Is it running on port 8000?"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clay-card p-6 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Sparkles size={20} className="text-clay-pinkDark" />
        <h2 className="font-heading font-bold text-xl">New Match Analysis</h2>
      </div>

      <div className="flex flex-col md:flex-row gap-5">
        <FileOnlyPane
          label="Resume"
          file={resumeFile}
          setFile={setResumeFile}
          accent="#B7D3E8"
          accept=".pdf,.docx"
        />
        <FileOrTextPane
          label="Job Description"
          file={jdFile}
          setFile={setJdFile}
          text={jdText}
          setText={setJdText}
          accent="#C6DABF"
          accept=".pdf,.docx,.txt"
        />
      </div>

      {error && (
        <div className="clay-card-flat p-3 text-sm text-clay-pinkDark bg-clay-pink/20">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="clay-button self-start px-6 py-3 bg-clay-blue disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
        {loading ? "Analyzing..." : "Analyze Match"}
      </button>
    </div>
  );
}