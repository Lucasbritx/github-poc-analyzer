import { NextRequest, NextResponse } from "next/server";

import { sessionCookie } from "@/lib/auth";
import { createSession, upsertUser } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { getPublicUser } from "@/lib/github";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") || "").trim().replace(/^@/, "");

  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
    return NextResponse.redirect(`${appUrl()}/?error=${encodeURIComponent("Enter a valid GitHub username.")}`);
  }

  try {
    const publicUser = await getPublicUser(username);
    const user = upsertUser({ ...publicUser, accessToken: "" });
    const session = createSession(user.id);
    const response = NextResponse.redirect(`${appUrl()}/dashboard`);
    response.cookies.set(sessionCookie, session.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: appUrl().startsWith("https://"),
      path: "/",
      expires: new Date(session.expiresAt)
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub user lookup failed.";
    return NextResponse.redirect(`${appUrl()}/?error=${encodeURIComponent(message)}`);
  }
}
