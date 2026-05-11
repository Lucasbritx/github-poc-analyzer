import { describe, expect, it } from "vitest";

import { clamp, detectPoc, scoreRepo } from "@/lib/detector";

describe("detectPoc", () => {
  it("detects repositories with explicit proof-of-concept signals", () => {
    const result = detectPoc({
      name: "stripe-webhook-poc",
      description: "Proof of concept for webhook verification",
      topics: ["demo"],
      readme: "A small prototype with setup instructions and screenshots."
    });

    expect(result.isPoc).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.25);
    expect(result.reasons.join(" ")).toContain("PoC");
  });

  it("does not classify ordinary repositories as PoCs", () => {
    const result = detectPoc({
      name: "company-website",
      description: "Production marketing site",
      topics: ["nextjs"],
      readme: "Main company website."
    });

    expect(result.isPoc).toBe(false);
    expect(result.confidence).toBe(0);
  });
});

describe("scoreRepo", () => {
  it("keeps scores inside the 0-10 range", () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(12)).toBe(10);

    const score = scoreRepo({
      description: "A complete demo with a live preview",
      homepage: "https://example.com",
      primaryLanguage: "TypeScript",
      readme: "Getting started\nInstall\nUsage\nDemo\nFeatures\n".repeat(80),
      sampledFiles: [
        { path: "package.json", content: "{\"scripts\":{\"test\":\"vitest\"}}" },
        { path: "LICENSE", content: "MIT" }
      ],
      stars: 2,
      forks: 1,
      pushedAt: new Date().toISOString()
    });

    expect(score.note).toBeGreaterThanOrEqual(0);
    expect(score.note).toBeLessThanOrEqual(10);
    expect(score.presentation).toBeLessThanOrEqual(10);
  });
});
