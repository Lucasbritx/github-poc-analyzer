import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { SubmitButton } from "@/components/actions";
import { currentUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RepoDetail({ params }: Props) {
  const user = await currentUser();
  if (!user) redirect("/");
  const { id } = await params;
  const repo = getRepo(user.id, Number(id));
  if (!repo) notFound();

  const analysis = repo.analysis;

  return (
    <main className="shell">
      <Link className="back-link" href="/dashboard">
        <ArrowLeft aria-hidden="true" size={18} />
        Dashboard
      </Link>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">{repo.owner}</p>
          <h1>{repo.name}</h1>
          <p>{repo.description || "No description provided."}</p>
          <div className="detail-links">
            <a href={repo.htmlUrl} rel="noreferrer" target="_blank">
              Repository <ExternalLink aria-hidden="true" size={15} />
            </a>
            {repo.homepage ? (
              <a href={repo.homepage} rel="noreferrer" target="_blank">
                Demo <ExternalLink aria-hidden="true" size={15} />
              </a>
            ) : null}
          </div>
        </div>
        <div className="score-tile">
          <span>Note</span>
          <strong>{analysis?.note ?? repo.score.note}</strong>
          <p>{analysis ? "Codex report" : "Deterministic preview"}</p>
        </div>
      </section>

      <section className="toolbar">
        <div>
          <h2>Analysis</h2>
          <p>{repo.analysisStatus === "completed" ? `Analyzed ${repo.analyzedAt ? new Date(repo.analyzedAt).toLocaleString() : ""}` : "Run Codex to generate the full review."}</p>
        </div>
        <form action={`/api/repos/${repo.dbId}/analyze`} method="post">
          <SubmitButton icon="scan" label="Run Codex analysis" pendingLabel="Analyzing..." />
        </form>
      </section>

      {repo.analysisError ? <p className="error-box">{repo.analysisError}</p> : null}

      <section className="score-grid">
        <Metric label="Presentation" value={repo.score.presentation} />
        <Metric label="Completeness" value={repo.score.completeness} />
        <Metric label="Technical signal" value={repo.score.technicalSignal} />
        <Metric label="Freshness" value={repo.score.freshness} />
      </section>

      {analysis ? (
        <section className="report">
          <Panel title="Resume" items={[analysis.resume]} />
          <Panel title="What's good" items={analysis.whatsGood} />
          <Panel title="What is bad" items={analysis.whatIsBad} />
          <Panel title="How to improve" items={analysis.howToImprove} />
        </section>
      ) : (
        <section className="report">
          <Panel title="Detection reasons" items={repo.pocReasons} />
          <Panel title="Score rationale" items={repo.score.rationale.length ? repo.score.rationale : ["No deterministic concerns found."]} />
        </section>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Panel({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="panel">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}
