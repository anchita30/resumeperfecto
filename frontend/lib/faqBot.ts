/**
 * Simple rule-based FAQ bot — no API key, no external calls.
 * Matches keywords in the user's question to a canned, helpful answer.
 * Falls back to a friendly "I don't know that one" response.
 */

interface FaqRule {
  keywords: string[];
  answer: string;
}

const RULES: FaqRule[] = [
  {
    keywords: ["overall score", "how is the score", "how is my score", "score calculated", "calculate score"],
    answer:
      "Your overall score blends two things: semantic similarity (55% weight) — how closely your resume's wording and experience align with the JD overall — and skill coverage (45% weight) — the percentage of the JD's required skills your resume actually has.",
  },
  {
    keywords: ["semantic", "similarity"],
    answer:
      "Semantic similarity measures how closely the *meaning* of your resume matches the job description, not just exact keywords. It's calculated by averaging two signals: TF-IDF (word-frequency based) and a Word2Vec model trained specifically for this app.",
  },
  {
    keywords: ["word2vec"],
    answer:
      "Word2Vec is a model that learns which words tend to appear in similar contexts (e.g. 'python' and 'java' often show up near similar phrases). This app's Word2Vec model was trained from scratch — no pretrained weights — on real resume and job description data.",
  },
  {
    keywords: ["tf-idf", "tfidf", "tf idf"],
    answer:
      "TF-IDF (Term Frequency–Inverse Document Frequency) is a classic way to score how important a word is to a document. It's computed fresh for every resume/JD pair you analyze — nothing pretrained.",
  },
  {
    keywords: ["skill coverage", "coverage"],
    answer:
      "Skill coverage is the percentage of the job description's required skills that your resume actually mentions. If a JD lists 10 skills and your resume has 7 of them, that's 70% coverage.",
  },
  {
    keywords: ["missing skill", "missing", "gap"],
    answer:
      "Missing skills are ones the job description asks for that weren't found anywhere in your resume text. Check the 'Gaps' tab — each missing skill has a 'Learn this skill' link so you can start closing the gap.",
  },
  {
    keywords: ["partial match", "partial"],
    answer:
      "A partial match means the JD wants a skill your resume doesn't literally mention, but you DO have something closely related — e.g. the JD wants 'Kubernetes' and your resume mentions 'Docker', which is in the same family.",
  },
  {
    keywords: ["extra skill", "extra"],
    answer:
      "These are skills found on your resume that the job description didn't ask for. They're not penalized — just shown so you know what else you bring to the table.",
  },
  {
    keywords: ["good score", "what score is good", "pass", "is 60 good", "is 70 good"],
    answer:
      "As a rough guide: 80+ is a strong match, 60-79 is good with some gaps, 40-59 is moderate with notable gaps, and below 40 usually means significant rework is needed before applying.",
  },
  {
    keywords: ["improve", "increase my score", "how to improve", "boost my score"],
    answer:
      "Check the 'Gaps' tab for missing skills, then either genuinely build that experience or make sure it's clearly stated on your resume if you already have it — vague wording can hide skills the parser would otherwise catch.",
  },
  {
    keywords: ["pdf", "download", "report"],
    answer:
      "Click 'Download PDF Report' at the top of any results page — it captures the full report (score, skills, gaps, weak sections) as a PDF you can save or share.",
  },
  {
    keywords: ["weak section", "weakest"],
    answer:
      "The 'Weak Sections' tab shows which parts of the job description are least well-covered by your resume, along with the closest matching part of your resume for comparison.",
  },
  {
    keywords: ["pretrained", "trained from scratch", "how does matching work", "how does this work"],
    answer:
      "This app doesn't use any pretrained AI models. Matching combines TF-IDF (computed live on your documents) with a Word2Vec model trained from scratch on real resume/JD data — genuinely original, not downloaded weights.",
  },
  {
    keywords: ["hi", "hello", "hey"],
    answer: "Hey! I'm here to help explain your match report. Ask me about your score, missing skills, or how any of this works.",
  },
];

export function getFaqAnswer(question: string): string {
  const q = question.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => q.includes(kw))) {
      return rule.answer;
    }
  }
  return "I'm not sure about that one yet! Try asking about your score, missing skills, skill coverage, semantic similarity, or how to download your PDF report.";
}
