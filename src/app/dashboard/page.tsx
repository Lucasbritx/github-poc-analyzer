import { Github, LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import { SubmitButton } from "@/components/actions";
import { RecommendationCard } from "@/components/recommendation-card";
import { RepoCard } from "@/components/repo-card";
import { currentUser } from "@/lib/auth";
import { listPocRepos, listRecommendations } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams?: Promise<{ recommendationError?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/");
  const repos = listPocRepos(user.id);
  const recommendations = listRecommendations(user.id);
  const params = searchParams ? await searchParams : {};

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{user.access_token ? "Verified GitHub" : "Public profile test mode"}</p>
          <h1>{user.login}</h1>
        </div>
        <div className="topbar__actions">
          <a className="icon-link" href={user.html_url} rel="noreferrer" target="_blank" title="Open GitHub profile">
            <Github aria-hidden="true" size={20} />
          </a>
          <form action="/api/logout" method="post">
            <button className="icon-link" title="Log out" type="submit">
              <LogOut aria-hidden="true" size={20} />
            </button>
          </form>
        </div>
      </header>

      <section className="toolbar">
        <div>
          <h2>Detected PoCs</h2>
          <p>{repos.length ? `${repos.length} repositories look like proof-of-concept work.` : "Sync GitHub to detect public PoCs."}</p>
        </div>
        <form action="/api/sync" method="post">
          <SubmitButton icon="sync" label="Sync GitHub" pendingLabel="Syncing..." />
        </form>
      </section>

      {repos.length ? (
        <section className="repo-grid">
          {repos.map((repo) => (
            <RepoCard key={repo.dbId} repo={repo} />
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <h2>No PoCs detected yet</h2>
          <p>Run a sync to scan names, topics, descriptions, README files, and repo metadata for PoC signals.</p>
        </section>
      )}

      <section className="recommendation-panel">
        <div className="recommendation-panel__intro">
          <div>
            <p className="eyebrow">Suggested next PoCs</p>
            <h2>Turn learning goals into portfolio projects</h2>
            <p>
              Codex blends what you want to learn with the repos already synced here, then suggests concrete project
              briefs that can strengthen the portfolio.
            </p>
          </div>
        </div>

        {params.recommendationError ? <p className="error-box">{params.recommendationError}</p> : null}

        <form className="recommendation-form" action="/api/recommendations" method="post">
          <label>
            <span>Learning goals</span>
            <textarea name="learningGoals" placeholder="Example: learn agents, RAG, evals, and production-ready Next.js" required rows={4} />
          </label>
          <div className="recommendation-form__grid">
            <label>
              <span>Target audience</span>
              <input name="targetAudience" placeholder="Recruiters, clients, AI startups..." />
            </label>
            <label>
              <span>Preferred stack</span>
              <input name="preferredStack" placeholder="Next.js, Python, OpenAI, SQLite..." />
            </label>
            <label>
              <span>Difficulty</span>
              <select name="difficulty" defaultValue="">
                <option value="">Any difficulty</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label>
              <span>Time budget</span>
              <input name="timeBudget" placeholder="Weekend, 1 week, 2 weeks..." />
            </label>
          </div>
          <SubmitButton icon="sparkles" label="Suggest next PoCs" pendingLabel="Generating..." />
        </form>

        {recommendations.length ? (
          <section className="recommendation-grid">
            {recommendations.map((recommendation) => (
              <RecommendationCard key={recommendation.id ?? recommendation.title} recommendation={recommendation} />
            ))}
          </section>
        ) : (
          <section className="recommendation-empty">
            <h3>No suggestions yet</h3>
            <p>Describe what you want to learn and generate project briefs tailored to your current GitHub signal.</p>
          </section>
        )}
      </section>
    </main>
  );
}
