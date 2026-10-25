import axios from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001";

export interface PartialMatch {
  skill: string;
  category: string;
  related_skill_found: string[];
}

export interface MissingSkill {
  skill: string;
  category: string;
}

export interface SkillGap {
  matched_skills: string[];
  partial_matches: PartialMatch[];
  missing_skills: MissingSkill[];
  extra_resume_skills: string[];
  skill_coverage_pct: number;
  jd_skill_count: number;
  matched_count: number;
}

export interface Scoring {
  overall_score: number;
  semantic_score_pct: number;
  tfidf_score_pct: number;
  word2vec_score_pct: number | null;
  skill_coverage_pct: number;
  verdict: string;
  note: string | null;
}

export interface WeakSection {
  jd_chunk: string;
  best_matching_resume_chunk: string;
  similarity: number;
}

export interface AnalysisResult {
  id: number;
  created_at: string;
  scoring: Scoring;
  skill_gap: SkillGap;
  resume_skills_by_category: Record<string, string[]>;
  jd_skills_by_category: Record<string, string[]>;
  weakest_covered_jd_sections: WeakSection[];
}

export interface HistoryItem {
  id: number;
  created_at: string;
  resume_filename: string | null;
  jd_filename: string | null;
}

const client = axios.create({ baseURL: API_BASE_URL });

export async function analyze(params: {
  resumeFile?: File | null;
  jdFile?: File | null;
  resumeText?: string;
  jdText?: string;
}): Promise<AnalysisResult> {
  const form = new FormData();
  if (params.resumeFile) form.append("resume_file", params.resumeFile);
  if (params.jdFile) form.append("jd_file", params.jdFile);
  if (params.resumeText) form.append("resume_text", params.resumeText);
  if (params.jdText) form.append("jd_text", params.jdText);

  // IMPORTANT: don't set a manual Content-Type header here. When posting a
  // FormData object, the browser needs to generate its own boundary string
  // (e.g. "multipart/form-data; boundary=----WebKit..."). Overriding it with
  // a bare "multipart/form-data" (no boundary) breaks multipart parsing on
  // the backend, causing file fields to arrive empty/malformed — which is
  // exactly what caused the "No resume provided" error despite a file being
  // selected. Axios sets the correct header automatically when we omit it.
  const res = await client.post<AnalysisResult>("/api/analyze", form);
  return res.data;
}

export async function getHistory(limit = 20): Promise<HistoryItem[]> {
  const res = await client.get<HistoryItem[]>("/api/history", {
    params: { limit },
  });
  return res.data;
}

export async function getHistoryItem(id: number): Promise<{
  id: number;
  created_at: string;
  resume_filename: string | null;
  jd_filename: string | null;
  result: Omit<AnalysisResult, "id" | "created_at">;
}> {
  const res = await client.get(`/api/history/${id}`);
  return res.data;
}

export async function deleteHistoryItem(id: number): Promise<{ status: string; id: number }> {
  const res = await client.delete(`/api/history/${id}`);
  return res.data;
}

export async function sendChatMessage(params: {
  message: string;
  reportId?: number | null;
  conversation?: { role: string; text: string }[];
}): Promise<{ reply: string; report_id: number | null }> {
  const res = await client.post("/api/chat", {
    message: params.message,
    report_id: params.reportId ?? null,
    conversation: params.conversation ?? [],
  });
  return res.data;
}

export async function checkHealth(): Promise<{
  status: string;
  word2vec_trained: boolean;
  word2vec_vocab_size: number;
}> {
  const res = await client.get("/api/health");
  return res.data;
}