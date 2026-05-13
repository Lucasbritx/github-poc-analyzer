import type { PortfolioSignals, RepoRecord } from "./types";

const staleCutoffDays = 180;

export function buildPortfolioSignals(repos: RepoRecord[]): PortfolioSignals {
  const languages = topValues(repos.map((repo) => repo.primaryLanguage).filter(Boolean) as string[]);
  const topics = topValues(repos.flatMap((repo) => repo.topics));
  const missingDemoRepos = repos.filter((repo) => !repo.homepage).map((repo) => repo.name).slice(0, 6);
  const weakReadmeRepos = repos.filter(hasWeakReadme).map((repo) => repo.name).slice(0, 6);
  const lowTestSignalRepos = repos.filter(hasLowTestSignal).map((repo) => repo.name).slice(0, 6);
  const staleRepos = repos.filter(isStale).map((repo) => repo.name).slice(0, 6);
  const repeatedProjectSignals = repeatedSignals(repos);
  const existingStrengths = strengths({ languages, topics, repos });
  const portfolioGaps = gaps({
    repos,
    missingDemoRepos,
    weakReadmeRepos,
    lowTestSignalRepos,
    staleRepos,
    repeatedProjectSignals
  });

  return {
    languages,
    topics,
    missingDemoRepos,
    weakReadmeRepos,
    lowTestSignalRepos,
    staleRepos,
    repeatedProjectSignals,
    existingStrengths,
    portfolioGaps
  };
}

function hasWeakReadme(repo: RepoRecord) {
  const readme = repo.readme?.trim() || "";
  return readme.length < 700 || !/(install|usage|setup|demo|screenshot|features)/i.test(readme);
}

function hasLowTestSignal(repo: RepoRecord) {
  const text = `${repo.readme || ""}\n${repo.sampledFiles.map((file) => `${file.path}\n${file.content}`).join("\n")}`;
  return !/(test|spec|vitest|jest|playwright|pytest|rspec|go test|cargo test)/i.test(text);
}

function isStale(repo: RepoRecord) {
  if (!repo.pushedAt) return true;
  const pushedAt = new Date(repo.pushedAt).getTime();
  if (Number.isNaN(pushedAt)) return false;
  const ageDays = (Date.now() - pushedAt) / (1000 * 60 * 60 * 24);
  return ageDays > staleCutoffDays;
}

function repeatedSignals(repos: RepoRecord[]) {
  const names = repos.flatMap((repo) => [...repo.topics, repo.primaryLanguage || ""]);
  return topValues(names.filter(Boolean), 2).filter((value) => repos.filter((repo) => repo.topics.includes(value) || repo.primaryLanguage === value).length > 1);
}

function strengths({ languages, topics, repos }: { languages: string[]; topics: string[]; repos: RepoRecord[] }) {
  const values: string[] = [];
  if (languages.length) values.push(`Shows practical work in ${languages.slice(0, 3).join(", ")}.`);
  if (topics.length) values.push(`Has visible themes around ${topics.slice(0, 4).join(", ")}.`);
  if (repos.some((repo) => repo.homepage)) values.push("Some projects already include demo or homepage links.");
  if (repos.some((repo) => repo.analysis?.note && repo.analysis.note >= 7)) values.push("At least one analyzed PoC already has strong portfolio potential.");
  return values.length ? values : ["No synced PoCs yet, so recommendations should lean on the stated learning goal."];
}

function gaps({
  repos,
  missingDemoRepos,
  weakReadmeRepos,
  lowTestSignalRepos,
  staleRepos,
  repeatedProjectSignals
}: {
  repos: RepoRecord[];
  missingDemoRepos: string[];
  weakReadmeRepos: string[];
  lowTestSignalRepos: string[];
  staleRepos: string[];
  repeatedProjectSignals: string[];
}) {
  const values: string[] = [];
  if (!repos.length) values.push("No synced PoCs are available yet, so the next project should be easy to evaluate from GitHub alone.");
  if (missingDemoRepos.length) values.push("Several PoCs do not expose a live demo or homepage.");
  if (weakReadmeRepos.length) values.push("README quality is inconsistent, which weakens first impressions.");
  if (lowTestSignalRepos.length) values.push("Testing and validation signals are limited.");
  if (staleRepos.length) values.push("Some PoCs look stale from recent activity.");
  if (repeatedProjectSignals.length) values.push(`The portfolio repeats ${repeatedProjectSignals.slice(0, 3).join(", ")} signals.`);
  return values.length ? values : ["Current PoCs show a balanced baseline; suggest a project that adds a sharper differentiator."];
}

function topValues(values: string[], limit = 6) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .slice(0, limit)
    .map(([value]) => value);
}
