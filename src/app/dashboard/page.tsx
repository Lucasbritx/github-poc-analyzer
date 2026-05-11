import { Github, LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import { SubmitButton } from "@/components/actions";
import { RepoCard } from "@/components/repo-card";
import { currentUser } from "@/lib/auth";
import { listPocRepos } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await currentUser();
  if (!user) redirect("/");
  const repos = listPocRepos(user.id);

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
    </main>
  );
}
