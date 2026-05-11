import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth";
import { upsertRepo } from "@/lib/db";
import { fetchPublicRepoSnapshots, fetchRepoSnapshots } from "@/lib/github";

export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const repos = user.access_token
      ? await fetchRepoSnapshots(user.access_token)
      : await fetchPublicRepoSnapshots(user.login);
    for (const repo of repos) {
      upsertRepo(user.id, repo);
    }
    return NextResponse.redirect(new URL("/dashboard", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repository sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
