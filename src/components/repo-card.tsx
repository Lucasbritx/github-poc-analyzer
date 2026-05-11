import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock3, Star } from "lucide-react";

import type { RepoRecord } from "@/lib/types";

export function RepoCard({ repo }: { repo: RepoRecord }) {
  const statusIcon =
    repo.analysisStatus === "completed" ? (
      <CheckCircle2 aria-hidden="true" size={16} />
    ) : repo.analysisStatus === "failed" ? (
      <AlertCircle aria-hidden="true" size={16} />
    ) : (
      <Clock3 aria-hidden="true" size={16} />
    );

  return (
    <Link className="repo-card" href={`/repos/${repo.dbId}`}>
      <div className="repo-card__top">
        <div>
          <p className="repo-card__owner">{repo.owner}</p>
          <h2>{repo.name}</h2>
        </div>
        <strong>{repo.analysis?.note ?? repo.score.note}</strong>
      </div>
      <p className="repo-card__description">{repo.description || "No description provided."}</p>
      <div className="repo-card__meta">
        <span>{repo.primaryLanguage || "Unknown"}</span>
        <span>
          <Star aria-hidden="true" size={14} /> {repo.stars}
        </span>
        <span>{Math.round(repo.pocConfidence * 100)}% PoC</span>
        <span>
          {statusIcon} {repo.analysisStatus}
        </span>
      </div>
    </Link>
  );
}
