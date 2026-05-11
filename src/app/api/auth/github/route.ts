import { NextResponse } from "next/server";

import { appUrl, requireEnv } from "@/lib/env";
import { stateCookie } from "@/lib/auth";

export async function GET() {
  let clientId: string;
  try {
    clientId = requireEnv("GITHUB_CLIENT_ID");
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub OAuth is not configured.";
    return NextResponse.redirect(`${appUrl()}/?error=${encodeURIComponent(message)}`);
  }

  const state = crypto.randomUUID();
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${appUrl()}/api/auth/callback`);
  url.searchParams.set("scope", "");
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url);
  response.cookies.set(stateCookie, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: appUrl().startsWith("https://"),
    path: "/",
    maxAge: 60 * 10
  });
  return response;
}
