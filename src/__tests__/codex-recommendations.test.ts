import { describe, expect, it, vi } from "vitest";

import { recommendWithCodex } from "@/lib/codex-recommendations";
import type { PortfolioSignals, RepoRecord } from "@/lib/types";

vi.mock("@openai/codex-sdk", () => ({
  Codex: class {
    startThread() {
      return {
        run: vi.fn(async () => ({
          finalResponse: JSON.stringify({
            recommendations: [
              {
                title: "Agentic Support Desk",
                resume: "A customer support PoC with tool-calling and evaluation traces.",
                whyThisFits: "It matches the user's agent learning goal and adds a more complete demo signal.",
                suggestedStack: ["Next.js", "OpenAI", "SQLite"],
                mvpScope: ["Upload a support FAQ", "Ask questions with cited answers"],
                portfolioValue: "Shows practical agent orchestration and product thinking.",
                difficulty: "intermediate",
                estimatedTime: "1 week",
                nextSteps: ["Define the support dataset", "Build the retrieval flow", "Add screenshots and eval notes"],
                relatedGaps: ["Several PoCs do not expose a live demo."],
                relatedRepoIds: [1, 999]
              }
            ]
          })
        }))
      };
    }
  }
}));

describe("recommendWithCodex", () => {
  it("parses project briefs and filters unknown related repo ids", async () => {
    const recommendations = await recommendWithCodex({
      request: {
        learningGoals: "I want to learn AI agents",
        targetAudience: null,
        preferredStack: "Next.js",
        difficulty: null,
        timeBudget: null
      },
      repos: [makeRepo()],
      signals: makeSignals()
    });

    expect(recommendations[0].title).toContain("Agentic");
    expect(recommendations[0].suggestedStack).toContain("OpenAI");
    expect(recommendations[0].relatedRepoIds).toEqual([1]);
  });
});

function makeSignals(): PortfolioSignals {
  return {
    languages: ["TypeScript"],
    topics: ["agents"],
    missingDemoRepos: ["demo-poc"],
    weakReadmeRepos: ["demo-poc"],
    lowTestSignalRepos: ["demo-poc"],
    staleRepos: [],
    repeatedProjectSignals: [],
    existingStrengths: ["Shows practical work in TypeScript."],
    portfolioGaps: ["Several PoCs do not expose a live demo."]
  };
}

function makeRepo(): RepoRecord {
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
    topics: ["agents"],
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
    analyzedAt: null
  };
}
