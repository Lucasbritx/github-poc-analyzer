import { cookies } from "next/headers";

import { getUserBySession } from "./db";

export const sessionCookie = "poc_analyzer_session";
export const stateCookie = "poc_analyzer_oauth_state";

export async function currentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(sessionCookie)?.value;
  return getUserBySession(sessionId);
}
