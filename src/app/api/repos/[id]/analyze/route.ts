import { NextRequest, NextResponse } from "next/server";

import { analyzeWithCodex, codexErrorMessage } from "@/lib/codex-analyzer";
import { currentUser } from "@/lib/auth";
import { getRepo, markAnalysisRunning, saveAnalysis, saveAnalysisError } from "@/lib/db";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, { params }: Params) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const repoId = Number(id);
  const repo = getRepo(user.id, repoId);
  if (!repo) return NextResponse.json({ error: "Repository not found" }, { status: 404 });

  markAnalysisRunning(repo.dbId);

  try {
    const analysis = await analyzeWithCodex(repo);
    saveAnalysis(repo.dbId, analysis);
  } catch (error) {
    saveAnalysisError(repo.dbId, codexErrorMessage(error));
  }

  return NextResponse.redirect(new URL(`/repos/${repoId}`, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
