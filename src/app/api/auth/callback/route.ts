import { NextRequest, NextResponse } from "next/server";

import { sessionCookie, stateCookie } from "@/lib/auth";
import { createSession, upsertUser } from "@/lib/db";
import { appUrl, requireEnv } from "@/lib/env";
import { exchangeCodeForToken, getViewer } from "@/lib/github";

export async function GET(request: NextRequest) {
  requireEnv("GITHUB_CLIENT_ID");
  requireEnv("GITHUB_CLIENT_SECRET");

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const expectedState = request.cookies.get(stateCookie)?.value;

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(`${appUrl()}/?error=oauth_state`);
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const viewer = await getViewer(accessToken);
    const user = upsertUser({ ...viewer, accessToken });
    const session = createSession(user.id);
    const response = NextResponse.redirect(`${appUrl()}/dashboard`);
    response.cookies.delete(stateCookie);
    response.cookies.set(sessionCookie, session.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: appUrl().startsWith("https://"),
      path: "/",
      expires: new Date(session.expiresAt)
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub OAuth failed.";
    return NextResponse.redirect(`${appUrl()}/?error=${encodeURIComponent(message)}`);
  }
}
