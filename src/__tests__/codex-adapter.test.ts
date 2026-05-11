import { describe, expect, it, vi } from "vitest";

import { analyzeWithCodex } from "@/lib/codex-analyzer";
import type { RepoRecord } from "@/lib/types";

vi.mock("@openai/codex-sdk", () => ({
  Codex: class {
    startThread() {
      return {
        run: vi.fn(async () => ({
          finalResponse: JSON.stringify({
            note: 8.2,
            resume: "A clear PoC with useful portfolio signals.",
            whatsGood: ["Clear purpose", "Good setup"],
            whatIsBad: ["Missing screenshots"],
            howToImprove: ["Add screenshots", "Add architecture notes", "Link a live demo"]
          })
        }))
      };
    }
  }
}));

describe("analyzeWithCodex", () => {
  it("parses structured Codex output", async () => {
    const report = await analyzeWithCodex(makeRepo());

    expect(report.note).toBe(8.2);
    expect(report.resume).toContain("PoC");
    expect(report.howToImprove).toHaveLength(3);
  });
});

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
    topics: ["demo"],
    stars: 0,
    forks: 0,
    pushedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    readme: "README",
    sampledFiles: [{ path: "package.json", content: "{}" }],
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
