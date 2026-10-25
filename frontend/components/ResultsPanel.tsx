"use client";

import { useRef, useState } from "react";
import { Download, Gauge, ListChecks, AlertTriangle, ExternalLink } from "lucide-react";
import { AnalysisResult } from "@/lib/api";
import ScoreGauge from "./ScoreGauge";
import Mascot, { moodFromScore, messageFromScore } from "./Mascot";
import SkillChip from "./SkillChip";
import { getLearnLinks } from "@/lib/learnLinks";

type Tab = "score" | "skills" | "gaps";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "score", label: "Score", icon: Gauge },
  { key: "skills", label: "Skills", icon: ListChecks },
  { key: "gaps", label: "Gaps", icon: AlertTriangle },
];

export default function ResultsPanel({ result }: { result: AnalysisResult }) {
  const [tab, setTab] = useState<Tab>("score");
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const { scoring, skill_gap, resume_skills_by_category, jd_skills_by_category } = result;

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#FFFFFF",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, "", "FAST");
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, "", "FAST");
        heightLeft -= pageHeight;
      }

      pdf.save(`Resume_Match_Report_${result.id}.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const getVerdictBadgeColor = (verdict: string) => {
    if (verdict.includes("Strong")) return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (verdict.includes("Good")) return "bg-blue-100 text-blue-800 border-blue-300";
    if (verdict.includes("Moderate")) return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-rose-100 text-rose-800 border-rose-300";
  };

  return (
    <div className="clay-card p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-heading font-bold text-xl">Analysis Report</h2>
        <button
          onClick={handleDownloadPdf}
          disabled={exporting}
          className="clay-button px-4 py-2 bg-clay-lavender flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Download size={16} />
          {exporting ? "Preparing PDF..." : "Download PDF Report"}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`clay-tab flex items-center gap-2 ${tab === key ? "clay-tab-active" : "clay-tab-inactive"}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Visible, interactive tabbed view */}
      <div className="flex flex-col gap-6">
        {tab === "score" && (
          <section className="flex flex-col md:flex-row items-center gap-6 clay-card-peach p-6">
            <ScoreGauge score={scoring.overall_score} />
            <div className="flex-1 flex flex-col gap-3">
              <Mascot
                mood={moodFromScore(scoring.overall_score)}
                message={messageFromScore(scoring.overall_score)}
              />
              <p className="font-heading font-semibold text-lg">{scoring.verdict}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="clay-card-blue p-3">
                  <p className="text-clay-textSoft">Skill Coverage</p>
                  <p className="font-heading font-bold text-lg">{scoring.skill_coverage_pct}%</p>
                </div>
                <div className="clay-card-green p-3">
                  <p className="text-clay-textSoft">Skills Matched</p>
                  <p className="font-heading font-bold text-lg">
                    {skill_gap.matched_count} / {skill_gap.jd_skill_count}
                  </p>
                </div>
                <div className="clay-card-yellow p-3">
                  <p className="text-clay-textSoft">Semantic Fit</p>
                  <p className="font-heading font-bold text-lg">{scoring.semantic_score_pct}%</p>
                </div>
                <div className="clay-card-lavender p-3">
                  <p className="text-clay-textSoft">TF-IDF Fit</p>
                  <p className="font-heading font-bold text-lg">{scoring.tfidf_score_pct}%</p>
                </div>
              </div>
              {scoring.note && (
                <p className="text-xs text-clay-textSoft italic">{scoring.note}</p>
              )}
            </div>
          </section>
        )}

        {tab === "skills" && (
          <section className="grid md:grid-cols-2 gap-5">
            <div className="clay-card-blue p-5">
              <h3 className="font-heading font-semibold mb-3">Resume Skills</h3>
              <div className="flex flex-col gap-3">
                {Object.entries(resume_skills_by_category).map(([cat, skills]) => (
                  <div key={cat}>
                    <p className="text-xs uppercase text-clay-textSoft mb-1">{cat.replace(/_/g, " ")}</p>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((s) => (
                        <SkillChip key={s} label={s} variant="matched" />
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(resume_skills_by_category).length === 0 && (
                  <p className="text-sm text-clay-textSoft">No known skills detected.</p>
                )}
              </div>
            </div>
            <div className="clay-card-green p-5">
              <h3 className="font-heading font-semibold mb-3">JD Required Skills</h3>
              <div className="flex flex-col gap-3">
                {Object.entries(jd_skills_by_category).map(([cat, skills]) => (
                  <div key={cat}>
                    <p className="text-xs uppercase text-clay-textSoft mb-1">{cat.replace(/_/g, " ")}</p>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((s) => (
                        <SkillChip key={s} label={s} variant="extra" />
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(jd_skills_by_category).length === 0 && (
                  <p className="text-sm text-clay-textSoft">No known skills detected.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {tab === "gaps" && (
          <section className="flex flex-col gap-5">
            <div className="clay-card-green p-5">
              <h3 className="font-heading font-semibold mb-3">
                Matched Skills ({skill_gap.matched_count}/{skill_gap.jd_skill_count})
              </h3>
              <div className="flex flex-wrap gap-2">
                {skill_gap.matched_skills.map((s) => (
                  <SkillChip key={s} label={s} variant="matched" />
                ))}
                {skill_gap.matched_skills.length === 0 && (
                  <p className="text-sm text-clay-textSoft">No direct matches found.</p>
                )}
              </div>
            </div>

            {(skill_gap?.partial_matches || []).length > 0 && (
              <div className="clay-card-yellow p-5">
                <h3 className="font-heading font-semibold mb-3">Partial Matches</h3>
                <div className="flex flex-col gap-2">
                  {(skill_gap?.partial_matches || []).map((p: any, idx: number) => {
                    const skillName = typeof p === "string" ? p : p?.skill || String(p);
                    const related = Array.isArray(p?.related_skill_found) ? p.related_skill_found : [];
                    return (
                      <div key={`${skillName}-${idx}`} className="flex items-center gap-2 flex-wrap">
                        <SkillChip label={skillName} variant="partial" />
                        {related.length > 0 && (
                          <>
                            <span className="text-xs text-clay-textSoft">via</span>
                            {related.map((r: string) => (
                              <SkillChip key={r} label={r} variant="matched" />
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="clay-card-pink p-5">
              <h3 className="font-heading font-semibold mb-3">Missing Skills</h3>
              <div className="flex flex-col gap-3">
                {(skill_gap?.missing_skills || []).map((m: any, idx: number) => {
                  const skillName = typeof m === "string" ? m : m?.skill || String(m);
                  const categoryName = (typeof m === "string" ? "other" : m?.category) || "other";
                  return (
                    <div key={`${skillName}-${idx}`} className="flex items-center gap-2 flex-wrap">
                      <SkillChip label={skillName} variant="missing" />
                      <span className="text-xs text-clay-textSoft">Learn it:</span>
                      {getLearnLinks(skillName, categoryName).map((link) => (
                        <a
                          key={link.label}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="clay-chip bg-white/70 text-xs flex items-center gap-1 hover:shadow-clay-hover"
                        >
                          {link.label}
                          <ExternalLink size={11} />
                        </a>
                      ))}
                    </div>
                  );
                })}
                {(skill_gap?.missing_skills || []).length === 0 && (
                  <p className="text-sm text-clay-textSoft">No gaps — every required skill is covered!</p>
                )}
              </div>
            </div>

            {skill_gap.extra_resume_skills.length > 0 && (
              <div className="clay-card-green p-5">
                <h3 className="font-heading font-semibold mb-3">Extra Skills on Resume</h3>
                <div className="flex flex-wrap gap-2">
                  {skill_gap.extra_resume_skills.map((s) => (
                    <SkillChip key={s} label={s} variant="extra" />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* DEDICATED EXECUTIVE PDF REPORT TEMPLATE */}
      <div
        style={{ position: "absolute", left: "-9999px", top: 0, width: "800px" }}
        aria-hidden="true"
      >
        <div
          ref={reportRef}
          className="w-[800px] bg-white text-slate-800 p-8 flex flex-col gap-6 font-sans border border-slate-200"
          style={{ boxSizing: "border-box" }}
        >
          {/* Header Banner */}
          <div className="bg-slate-900 text-white p-6 rounded-lg flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] tracking-widest uppercase font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded">
                ResumePerfecto • Executive Report
              </span>
              <h1 className="text-2xl font-bold mt-2">Candidate Match &amp; Skill Analysis</h1>
              <p className="text-xs text-slate-400 mt-1">
                Automated ATS alignment evaluation &amp; skill gap diagnostic
              </p>
            </div>
            <div className="text-right text-xs text-slate-300 border-l border-slate-700 pl-4 py-1">
              <p><span className="text-slate-400">Report ID:</span> #{result.id}</p>
              <p className="mt-1">
                <span className="text-slate-400">Generated:</span>{" "}
                {new Date(result.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Executive Overview Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 flex items-center gap-8">
            <div className="flex flex-col items-center justify-center bg-white border border-slate-300 rounded-xl p-5 w-44 text-center shadow-sm">
              <span className="text-4xl font-extrabold text-slate-900">
                {scoring.overall_score}%
              </span>
              <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider mt-1">
                Overall Match Score
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border mt-3 ${getVerdictBadgeColor(
                  scoring.verdict
                )}`}
              >
                {scoring.verdict}
              </span>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase">Skill Match Rate</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">
                  {skill_gap.matched_count} <span className="text-sm font-normal text-slate-500">/ {skill_gap.jd_skill_count} skills</span>
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase">Skill Coverage</p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">{scoring.skill_coverage_pct}%</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase">Semantic Similarity</p>
                <p className="text-lg font-bold text-blue-700 mt-0.5">{scoring.semantic_score_pct}%</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-sm">
                <p className="text-xs font-medium text-slate-500 uppercase">TF-IDF Statistical Score</p>
                <p className="text-lg font-bold text-purple-700 mt-0.5">{scoring.tfidf_score_pct}%</p>
              </div>
            </div>
          </div>

          {/* Skill Alignment Matrix */}
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
              Skill Alignment Matrix
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Matched Skills */}
              <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-emerald-900">
                    Matched Skills ({skill_gap.matched_skills.length})
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Verified
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {skill_gap.matched_skills.map((s) => (
                    <span
                      key={s}
                      className="bg-white text-emerald-800 border border-emerald-300 text-xs px-2.5 py-1 rounded font-medium shadow-2xs"
                    >
                      ✓ {s}
                    </span>
                  ))}
                  {skill_gap.matched_skills.length === 0 && (
                    <p className="text-xs text-emerald-700 italic">No direct matches identified.</p>
                  )}
                </div>
              </div>

              {/* Partial Matches */}
              <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-amber-900">
                    Partial Skill Matches ({skill_gap.partial_matches.length})
                  </h3>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Related Found
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {(skill_gap?.partial_matches || []).map((p: any, idx: number) => {
                    const skillName = typeof p === "string" ? p : p?.skill || String(p);
                    const related = Array.isArray(p?.related_skill_found) ? p.related_skill_found : [];
                    return (
                      <div
                        key={`${skillName}-${idx}`}
                        className="bg-white border border-amber-300 text-xs p-2 rounded flex items-center justify-between shadow-2xs"
                      >
                        <span className="font-semibold text-amber-900">{skillName}</span>
                        {related.length > 0 && (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            via {related.join(", ")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {(skill_gap?.partial_matches || []).length === 0 && (
                    <p className="text-xs text-amber-700 italic">No partial matches.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-1">
              {/* Missing Skills */}
              <div className="border border-rose-200 bg-rose-50/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-rose-900">
                    Missing Required Skills ({(skill_gap?.missing_skills || []).length})
                  </h3>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                    Critical Gap
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(skill_gap?.missing_skills || []).map((m: any, idx: number) => {
                    const skillName = typeof m === "string" ? m : m?.skill || String(m);
                    return (
                      <span
                        key={`${skillName}-${idx}`}
                        className="bg-white text-rose-800 border border-rose-300 text-xs px-2.5 py-1 rounded font-medium shadow-2xs"
                      >
                        ✗ {skillName}
                      </span>
                    );
                  })}
                  {(skill_gap?.missing_skills || []).length === 0 && (
                    <p className="text-xs text-rose-700 italic">No missing skills — 100% coverage!</p>
                  )}
                </div>
              </div>

              {/* Extra Resume Skills */}
              <div className="border border-slate-200 bg-slate-50/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800">
                    Additional Resume Skills ({(skill_gap?.extra_resume_skills || []).length})
                  </h3>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                    Extra Value
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(skill_gap?.extra_resume_skills || []).map((s: string) => (
                    <span
                      key={s}
                      className="bg-white text-slate-700 border border-slate-300 text-xs px-2.5 py-1 rounded font-medium shadow-2xs"
                    >
                      + {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Upskilling Plan Table */}
          {(skill_gap?.missing_skills || []).length > 0 && (
            <div className="flex flex-col gap-3 mt-2">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
                Recommended Upskilling &amp; Training Plan
              </h2>
              <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-2.5 border-r border-slate-200">Missing Skill</th>
                    <th className="p-2.5 border-r border-slate-200">Category</th>
                    <th className="p-2.5">Suggested Learning Sources</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(skill_gap?.missing_skills || []).map((m: any, idx: number) => {
                    const skillName = typeof m === "string" ? m : m?.skill || String(m);
                    const categoryName = (typeof m === "string" ? "other" : m?.category) || "other";
                    const links = getLearnLinks(skillName, categoryName);
                    return (
                      <tr key={`${skillName}-${idx}`} className="bg-white">
                        <td className="p-2.5 font-bold text-slate-800 border-r border-slate-200">
                          {skillName}
                        </td>
                        <td className="p-2.5 text-slate-600 border-r border-slate-200 capitalize">
                          {categoryName.replace(/_/g, " ")}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {links.map((l) => l.label).join(" | ")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Document Footer */}
          <div className="border-t border-slate-200 pt-4 mt-4 flex items-center justify-between text-[11px] text-slate-400">
            <p>ResumePerfecto Automated Resume Evaluation System</p>
            <p>Confidential Candidate Document</p>
          </div>
        </div>
      </div>
    </div>
  );
}