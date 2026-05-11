import { NextRequest, NextResponse } from "next/server";

import { sessionCookie } from "@/lib/auth";
import { deleteSession } from "@/lib/db";
import { appUrl } from "@/lib/env";

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(sessionCookie)?.value;
  if (sessionId) deleteSession(sessionId);
  const response = NextResponse.redirect(appUrl());
  response.cookies.delete(sessionCookie);
  return response;
}
