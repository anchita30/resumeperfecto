/**
 * Maps ANY missing skill (from the taxonomy or otherwise) to a learning
 * resource link automatically — no manual curation required, so every
 * missing skill the backend reports gets a usable link.
 *
 * Sources are chosen by CATEGORY, not just generated blindly for every
 * skill: freeCodeCamp is a coding-tutorial site with no content for soft
 * skills like "communication" or "teamwork", so it's only offered for
 * technical categories. This is a deterministic rule rather than a live
 * check against the site (fetching each site to verify "does this actually
 * have results" would mean an extra network call per skill, is fragile
 * against layout/anti-bot changes, and can't run reliably client-side) —
 * so instead we curate which SOURCES make sense per category, and always
 * link to real content for whichever sources we do show.
 */
export interface LearnLink {
  label: string;
  url: string;
}

const SOFT_SKILL_CATEGORY = "soft_skills";

export function getLearnLinks(skill: string, category?: string): LearnLink[] {
  const query = encodeURIComponent(`${skill} tutorial for beginners`);
  const searchQuery = encodeURIComponent(skill);
  const isSoftSkill = category === SOFT_SKILL_CATEGORY;

  const links: LearnLink[] = [
    {
      label: "YouTube",
      url: `https://www.youtube.com/results?search_query=${query}`,
    },
  ];

  // freeCodeCamp is coding-only — skip it for soft skills, since a search
  // there for something like "communication" or "teamwork" won't surface
  // genuinely relevant tutorial content.
  if (!isSoftSkill) {
    links.push({
      label: "freeCodeCamp",
      url: `https://www.freecodecamp.org/news/search/?query=${searchQuery}`,
    });
  }

  links.push({
    label: "Coursera",
    url: `https://www.coursera.org/search?query=${searchQuery}`,
  });

  return links;
}