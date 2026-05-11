import { Github, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main className="auth-page">
      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">Local-first portfolio review</p>
          <h1>GitHub PoC Analyzer</h1>
          <p className="hero__copy">
            Connect GitHub, detect proof-of-concept repositories, and get focused feedback on presentation, technical signal, weak spots, and concrete improvements.
          </p>
          {params.error ? <p className="error-box">{decodeURIComponent(params.error)}</p> : null}
          <div className="auth-actions">
            <a className="button button--large" href="/api/auth/github">
              <Github aria-hidden="true" size={20} />
              Continue with GitHub
            </a>
            <form action="/api/auth/test" className="username-form" method="post">
              <input aria-label="GitHub username" name="username" placeholder="github username" required />
              <button className="button button--large button--secondary" type="submit">
                Search
              </button>
            </form>
          </div>
        </div>
        <div className="signal-panel">
          <div>
            <ShieldCheck aria-hidden="true" size={22} />
            <span>Public repos only</span>
          </div>
          <div>
            <Sparkles aria-hidden="true" size={22} />
            <span>Codex-powered review</span>
          </div>
          <strong>0-10</strong>
          <p>Scores blend deterministic repo signals with a local Codex analysis pass.</p>
        </div>
      </section>
    </main>
  );
}
