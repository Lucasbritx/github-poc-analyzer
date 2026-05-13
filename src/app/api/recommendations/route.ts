import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth";
import { listUserRepos, saveRecommendations } from "@/lib/db";
import { recommendWithCodex, recommendationErrorMessage } from "@/lib/codex-recommendations";
import { buildPortfolioSignals } from "@/lib/recommendation-signals";
import type { RecommendationRequest } from "@/lib/types";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/", request.url));

  const formData = await request.formData();
  const recommendationRequest: RecommendationRequest = {
    learningGoals: String(formData.get("learningGoals") || "").trim(),
    targetAudience: optionalString(formData.get("targetAudience")),
    preferredStack: optionalString(formData.get("preferredStack")),
    difficulty: optionalString(formData.get("difficulty")),
    timeBudget: optionalString(formData.get("timeBudget"))
  };

  if (!recommendationRequest.learningGoals) {
    return redirectToDashboard("Tell the app what you want to learn before generating next PoCs.");
  }

  try {
    const repos = listUserRepos(user.id);
    const signals = buildPortfolioSignals(repos);
    const recommendations = await recommendWithCodex({ request: recommendationRequest, repos, signals });
    saveRecommendations(user.id, recommendationRequest, recommendations);
    return redirectToDashboard();
  } catch (error) {
    return redirectToDashboard(recommendationErrorMessage(error));
  }
}

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text || null;
}

function redirectToDashboard(error?: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = new URL("/dashboard", appUrl);
  url.searchParams.set("tab", "suggestions");
  if (error) url.searchParams.set("recommendationError", error);
  return NextResponse.redirect(url);
}
