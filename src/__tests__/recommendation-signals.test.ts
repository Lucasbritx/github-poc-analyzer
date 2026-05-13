import { describe, expect, it } from "vitest";

import { buildPortfolioSignals } from "@/lib/recommendation-signals";
import type { RepoRecord } from "@/lib/types";

describe("buildPortfolioSignals", () => {
  it("extracts portfolio gaps from existing PoCs", () => {
    const signals = buildPortfolioSignals([
      makeRepo({
        name: "agent-demo",
        primaryLanguage: "TypeScript",
        topics: ["agents", "demo"],
        homepage: null,
        readme: "Small demo",
        sampledFiles: [{ path: "package.json", content: "{\"scripts\":{\"dev\":\"next dev\"}}" }],
        pushedAt: "2023-01-01T00:00:00.000Z"
      }),
      makeRepo({
        dbId: 2,
        githubId: 11,
        name: "rag-demo",
        primaryLanguage: "TypeScript",
        topics: ["rag", "demo"],
        homepage: "https://example.com",
        readme: "Install\nUsage\nDemo\nFeatures\n".repeat(80),
        sampledFiles: [{ path: "package.json", content: "{\"scripts\":{\"test\":\"vitest\"}}" }]
      })
    ]);

    expect(signals.languages).toContain("TypeScript");
    expect(signals.topics).toContain("demo");
    expect(signals.missingDemoRepos).toContain("agent-demo");
    expect(signals.weakReadmeRepos).toContain("agent-demo");
    expect(signals.lowTestSignalRepos).toContain("agent-demo");
    expect(signals.portfolioGaps.join(" ")).toContain("README");
  });

  it("supports goal-only recommendations when no repos are synced", () => {
    const signals = buildPortfolioSignals([]);

    expect(signals.languages).toEqual([]);
    expect(signals.existingStrengths[0]).toContain("No synced PoCs");
    expect(signals.portfolioGaps[0]).toContain("No synced PoCs");
  });
});

function makeRepo(overrides: Partial<RepoRecord> = {}): RepoRecord {
  return {
    dbId: 1,
    id: 10,
    githubId: 10,
    owner: "lucas",
    name: "demo-poc",
    fullName: "lucas/demo-poc",
    description: "Demo PoC",
    htmlUrl: "https://github.com/lucas/demo-poc",
    homepage: null,
    primaryLanguage: "TypeScript",
    topics: ["demo"],
    stars: 0,
    forks: 0,
    pushedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    readme: "README",
    sampledFiles: [],
    pocConfidence: 0.6,
    pocReasons: ["Contains prototype signal: demo"],
    isPoc: true,
    score: {
      note: 6,
      presentation: 6,
      completeness: 5,
      technicalSignal: 4,
      freshness: 8,
      rationale: ["Test rationale"]
    },
    analysisStatus: "idle",
    analysisError: null,
    analysis: null,
    analyzedAt: null,
    ...overrides
  };
}
