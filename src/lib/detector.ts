import type { RepoSnapshot, ScoreBreakdown } from "./types";

const strongSignals = ["poc", "proof-of-concept", "proof of concept"];
const mediumSignals = ["prototype", "demo", "sample", "experiment", "mvp", "hackathon", "playground", "starter"];

export function detectPoc(input: {
  name: string;
  description: string | null;
  topics: string[];
  readme: string | null;
}) {
  const haystack = [
    input.name,
    input.description || "",
    input.topics.join(" "),
    (input.readme || "").slice(0, 4000)
  ]
    .join(" ")
    .toLowerCase();

  const reasons: string[] = [];
  let confidence = 0;

  for (const signal of strongSignals) {
    if (haystack.includes(signal)) {
      confidence += 0.45;
      reasons.push(`Contains strong PoC signal: ${signal}`);
    }
  }

  for (const signal of mediumSignals) {
    if (haystack.includes(signal)) {
      confidence += 0.2;
      reasons.push(`Contains prototype signal: ${signal}`);
    }
  }

  if (input.topics.some((topic) => mediumSignals.includes(topic.toLowerCase()))) {
    confidence += 0.15;
    reasons.push("Repository topics indicate prototype/demo intent");
  }

  if ((input.readme || "").length > 500 && confidence > 0) {
    confidence += 0.1;
    reasons.push("README provides enough context for portfolio analysis");
  }

  const normalized = Math.min(1, Number(confidence.toFixed(2)));
  return {
    isPoc: normalized >= 0.25,
    confidence: normalized,
    reasons: reasons.length ? reasons : ["No explicit PoC signals found"]
  };
}

export function scoreRepo(repo: Pick<RepoSnapshot, "description" | "homepage" | "primaryLanguage" | "readme" | "sampledFiles" | "stars" | "forks" | "pushedAt">): ScoreBreakdown {
  const rationale: string[] = [];
  const readme = repo.readme || "";
  const hasDemo = Boolean(repo.homepage) || /https?:\/\/\S+/.test(readme);
  const hasSetup = /install|setup|getting started|usage|run/i.test(readme);
  const hasOutcome = /feature|result|screenshot|demo|preview|why|problem/i.test(readme);
  const hasLicense = repo.sampledFiles.some((file) => /^licen[sc]e/i.test(file.path));
  const hasTests = repo.sampledFiles.some((file) => /test|spec|vitest|jest|pytest|rspec/i.test(`${file.path}\n${file.content}`));
  const daysSincePush = repo.pushedAt ? (Date.now() - new Date(repo.pushedAt).getTime()) / 86_400_000 : 9999;

  const presentation = clamp(
    2 +
      (repo.description ? 1.5 : 0) +
      (readme.length > 300 ? 2 : 0) +
      (readme.length > 1200 ? 1 : 0) +
      (hasDemo ? 1.5 : 0) +
      (hasOutcome ? 1 : 0)
  );

  const completeness = clamp(2 + (hasSetup ? 2.5 : 0) + (hasLicense ? 1 : 0) + (hasDemo ? 1 : 0) + (repo.primaryLanguage ? 1 : 0));
  const technicalSignal = clamp(2 + (repo.sampledFiles.length >= 2 ? 2 : 0) + (hasTests ? 1.5 : 0) + (repo.stars > 0 ? 0.5 : 0) + (repo.forks > 0 ? 0.5 : 0));
  const freshness = clamp(daysSincePush < 30 ? 8 : daysSincePush < 180 ? 6.5 : daysSincePush < 730 ? 4.5 : 2.5);

  if (!repo.description) rationale.push("Missing repository description hurts first impression.");
  if (readme.length <= 300) rationale.push("README is too thin for an external reviewer.");
  if (!hasDemo) rationale.push("No obvious demo, preview, or live link was found.");
  if (!hasSetup) rationale.push("Setup or usage instructions are unclear.");
  if (hasTests) rationale.push("Test-related files improve technical credibility.");
  if (daysSincePush < 180) rationale.push("Recent activity makes the PoC feel maintained.");

  const note = clamp(presentation * 0.38 + completeness * 0.28 + technicalSignal * 0.2 + freshness * 0.14);

  return {
    note: Number(note.toFixed(1)),
    presentation: Number(presentation.toFixed(1)),
    completeness: Number(completeness.toFixed(1)),
    technicalSignal: Number(technicalSignal.toFixed(1)),
    freshness: Number(freshness.toFixed(1)),
    rationale
  };
}

export function clamp(value: number) {
  return Math.max(0, Math.min(10, value));
}
