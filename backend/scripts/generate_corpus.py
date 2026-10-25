import json
import random
from pathlib import Path

random.seed(42)

TAXONOMY_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "skills_taxonomy.json"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "training_corpus.txt"

with open(TAXONOMY_PATH) as f:
    taxonomy = json.load(f)

all_skills = [s for cat in taxonomy.values() for s in cat]

ROLE_TEMPLATES = [
    "experienced {skill} developer with a strong background in {skill2} and {skill3}",
    "responsible for building and maintaining applications using {skill} and {skill2}",
    "designed and implemented scalable systems leveraging {skill} {skill2} and {skill3}",
    "looking for a candidate proficient in {skill} with hands on experience in {skill2}",
    "collaborated with cross functional teams to deliver features using {skill} and {skill2}",
    "worked extensively with {skill} {skill2} and {skill3} in a fast paced environment",
    "strong understanding of {skill} required along with familiarity in {skill2}",
    "led a team building products with {skill} {skill2} and {skill3}",
    "seeking a candidate with expertise in {skill} for a senior engineering role",
    "hands on experience deploying applications using {skill} and {skill2} on {skill3}",
    "developed and optimized data pipelines using {skill} {skill2} and {skill3}",
    "built responsive user interfaces with {skill} and integrated with {skill2}",
    "managed infrastructure and deployments using {skill} and {skill2}",
    "analyzed large datasets using {skill} and {skill2} to derive insights",
    "wrote automated tests using {skill} to ensure code quality and reliability",
    "communicated effectively with stakeholders while managing {skill} projects",
    "mentored junior engineers on best practices for {skill} and {skill2}",
    "participated in agile ceremonies including sprint planning and retrospectives",
    "translated business requirements into technical specifications for {skill} systems",
    "improved system performance and scalability through {skill} optimizations",
]

DEGREE_TEMPLATES = [
    "bachelor of science in computer science with focus on software engineering",
    "master of science in data science and machine learning",
    "years of professional experience in full stack software development",
    "strong problem solving skills and attention to detail",
    "excellent communication and teamwork abilities in cross functional settings",
    "proven track record of delivering projects on time and within scope",
]


def sample_skills(n=3):
    return random.sample(all_skills, n)


def generate_corpus(num_lines=4000):
    lines = []
    for _ in range(num_lines):
        template = random.choice(ROLE_TEMPLATES)
        skill, skill2, skill3 = sample_skills(3)
        line = template.format(skill=skill, skill2=skill2, skill3=skill3)
        lines.append(line)
    lines.extend(DEGREE_TEMPLATES * 20)
    random.shuffle(lines)
    return lines


if __name__ == "__main__":
    corpus = generate_corpus()
    with open(OUTPUT_PATH, "w") as f:
        f.write("\n".join(corpus))
    print(f"Wrote {len(corpus)} lines to {OUTPUT_PATH}")
