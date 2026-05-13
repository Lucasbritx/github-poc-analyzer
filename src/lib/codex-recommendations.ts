import { Codex } from "@openai/codex-sdk";
import { z } from "zod";

import { codexErrorMessage } from "./codex-analyzer";
import type { PocRecommendation, PortfolioSignals, RecommendationRequest, RepoRecord } from "./types";

const recommendationsSchema = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          resume: { type: "string" },
          whyThisFits: { type: "string" },
          suggestedStack: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
          mvpScope: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
          portfolioValue: { type: "string" },
          difficulty: { type: "string" },
          estimatedTime: { type: "string" },
          nextSteps: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 7 },
          relatedGaps: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
          relatedRepoIds: { type: "array", items: { type: "number" }, maxItems: 5 }
        },
        required: [
          "title",
          "resume",
          "whyThisFits",
          "suggestedStack",
          "mvpScope",
          "portfolioValue",
          "difficulty",
          "estimatedTime",
          "nextSteps",
          "relatedGaps",
          "relatedRepoIds"
        ],
        additionalProperties: false
      }
    }
  },
  required: ["recommendations"],
  additionalProperties: false
} as const;

const recommendationSchema = z.object({
  title: z.string().min(1),
  resume: z.string().min(1),
  whyThisFits: z.string().min(1),
  suggestedStack: z.array(z.string()).min(1),
  mvpScope: z.array(z.string()).min(1),
  portfolioValue: z.string().min(1),
  difficulty: z.string().min(1),
  estimatedTime: z.string().min(1),
  nextSteps: z.array(z.string()).min(1),
  relatedGaps: z.array(z.string()).min(1),
  relatedRepoIds: z.array(z.number()).default([])
});

const responseSchema = z.object({
  recommendations: z.array(recommendationSchema).min(1)
});

export async function recommendWithCodex({
  request,
  repos,
  signals
}: {
  request: RecommendationRequest;
  repos: RepoRecord[];
  signals: PortfolioSignals;
}): Promise<PocRecommendation[]> {
  const codex = new Codex();
  const thread = codex.startThread({
    workingDirectory: process.cwd(),
    skipGitRepoCheck: true,
    sandboxMode: "read-only",
    modelReasoningEffort: "medium"
  });

  const turn = await thread.run(buildRecommendationPrompt({ request, repos, signals }), {
    outputSchema: recommendationsSchema
  });
  const parsed = safeJson(turn.finalResponse);
  const response = responseSchema.parse(parsed);

  return response.recommendations.map((recommendation) => ({
    ...recommendation,
    relatedRepoIds: recommendation.relatedRepoIds.filter((id) => repos.some((repo) => repo.dbId === id))
  }));
}

export { codexErrorMessage as recommendationErrorMessage };

function buildRecommendationPrompt({
  request,
  repos,
  signals
}: {
  request: RecommendationRequest;
  repos: RepoRecord[];
  signals: PortfolioSignals;
}) {
  const repoContext = repos.length
    ? repos
        .slice(0, 12)
        .map(
          (repo) => `
- DB id: ${repo.dbId}
  Name: ${repo.fullName}
  Description: ${repo.description || "none"}
  Language: ${repo.primaryLanguage || "unknown"}
  Topics: ${repo.topics.join(", ") || "none"}
  Demo/homepage: ${repo.homepage || "none"}
  Score: ${repo.analysis?.note ?? repo.score.note}/10
  Strengths: ${repo.analysis?.whatsGood.join(" | ") || repo.score.rationale.join(" | ") || "none"}
  Weaknesses: ${repo.analysis?.whatIsBad.join(" | ") || "not analyzed yet"}
`.trim()
        )
        .join("\n\n")
    : "No synced PoCs yet.";

  return `
You are helping a developer choose the next proof-of-concept projects for a GitHub portfolio.
Return only JSON matching the provided schema.

Create 3 to 5 project briefs. Each brief must be concrete enough to start building and should fit the user's learning goal while improving the portfolio gaps.
Prioritize ideas that demonstrate practical judgment, demo readiness, maintainability, and clear reviewer value.

User request:
- Learning goals: ${request.learningGoals}
- Target role/audience: ${request.targetAudience || "not specified"}
- Preferred stack: ${request.preferredStack || "not specified"}
- Difficulty preference: ${request.difficulty || "not specified"}
- Time budget: ${request.timeBudget || "not specified"}

Portfolio signals:
- Languages: ${signals.languages.join(", ") || "none"}
- Topics: ${signals.topics.join(", ") || "none"}
- Existing strengths: ${signals.existingStrengths.join(" | ")}
- Gaps: ${signals.portfolioGaps.join(" | ")}
- Missing demos: ${signals.missingDemoRepos.join(", ") || "none"}
- Weak READMEs: ${signals.weakReadmeRepos.join(", ") || "none"}
- Low test signal: ${signals.lowTestSignalRepos.join(", ") || "none"}
- Stale repos: ${signals.staleRepos.join(", ") || "none"}
- Repeated signals: ${signals.repeatedProjectSignals.join(", ") || "none"}

Existing PoCs:
${repoContext}

Rules:
- suggestedStack should be technologies, not paragraphs.
- mvpScope and nextSteps should be short action items.
- relatedRepoIds must use only the DB ids shown above, or [] when no existing repo is related.
- Use the same language as the user's learning goals when obvious; otherwise use English.
`.trim();
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Codex returned a non-JSON recommendation response.");
    return JSON.parse(match[0]);
  }
}
