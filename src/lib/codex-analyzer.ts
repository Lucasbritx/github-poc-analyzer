import { Codex } from "@openai/codex-sdk";
import { z } from "zod";

import type { AnalysisReport, RepoRecord } from "./types";

const analysisSchema = {
  type: "object",
  properties: {
    note: { type: "number", minimum: 0, maximum: 10 },
    resume: { type: "string" },
    whatsGood: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
    whatIsBad: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
    howToImprove: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 }
  },
  required: ["note", "resume", "whatsGood", "whatIsBad", "howToImprove"],
  additionalProperties: false
} as const;

const reportSchema = z.object({
  note: z.number().min(0).max(10),
  resume: z.string().min(1),
  whatsGood: z.array(z.string()).min(1),
  whatIsBad: z.array(z.string()).min(1),
  howToImprove: z.array(z.string()).min(1)
});

export async function analyzeWithCodex(repo: RepoRecord): Promise<AnalysisReport> {
  const codex = new Codex();
  const thread = codex.startThread({
    workingDirectory: process.cwd(),
    skipGitRepoCheck: true,
    sandboxMode: "read-only",
    modelReasoningEffort: "medium"
  });

  const prompt = buildPrompt(repo);
  const turn = await thread.run(prompt, { outputSchema: analysisSchema });
  const parsed = safeJson(turn.finalResponse);
  const report = reportSchema.parse(parsed);

  return {
    note: Number(report.note.toFixed(1)),
    resume: report.resume,
    whatsGood: report.whatsGood,
    whatIsBad: report.whatIsBad,
    howToImprove: report.howToImprove
  };
}

export function codexErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Codex analysis failed.";
  if (message.includes("Unable to locate Codex CLI binaries")) {
    return "Codex CLI is unavailable. Install @openai/codex or make sure the SDK optional binaries are installed.";
  }
  if (/not authenticated|login|api key|CODEX_API_KEY/i.test(message)) {
    return "Codex is not authenticated. Run `codex` in your terminal and sign in before analyzing.";
  }
  return message;
}

function buildPrompt(repo: RepoRecord) {
  const files = repo.sampledFiles
    .map((file) => `--- ${file.path} ---\n${file.content.slice(0, 4000)}`)
    .join("\n\n");

  return `
You are reviewing a GitHub proof-of-concept repository as a portfolio reviewer.
Return only JSON matching the provided schema.

Evaluate whether this PoC would impress recruiters, clients, or technical reviewers.
Be direct, practical, and concrete. The output language should match the repository's dominant language when obvious; otherwise use English.

Repository:
- Name: ${repo.fullName}
- Description: ${repo.description || "none"}
- URL: ${repo.htmlUrl}
- Homepage/demo: ${repo.homepage || "none"}
- Primary language: ${repo.primaryLanguage || "unknown"}
- Topics: ${repo.topics.join(", ") || "none"}
- Stars: ${repo.stars}
- Forks: ${repo.forks}
- Last push: ${repo.pushedAt || "unknown"}
- Deterministic score: ${repo.score.note}/10
- Deterministic rationale: ${repo.score.rationale.join(" | ") || "none"}
- PoC detection reasons: ${repo.pocReasons.join(" | ")}

README:
${repo.readme || "No README found."}

Sampled files:
${files || "No sample files found."}
`.trim();
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Codex returned a non-JSON response.");
    return JSON.parse(match[0]);
  }
}
