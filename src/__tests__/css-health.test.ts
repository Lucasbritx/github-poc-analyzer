import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("global CSS health", () => {
  it("keeps the App Router stylesheet wired into the root layout", () => {
    const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
    const styles = readFileSync(join(root, "src/app/styles.css"), "utf8");

    expect(layout).toContain('import "./styles.css"');
    expect(styles).toContain(".auth-page");
    expect(styles).toContain(".button");
    expect(styles).toContain(".shell");
  });
});
