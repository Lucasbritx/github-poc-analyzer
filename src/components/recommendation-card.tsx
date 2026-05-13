import { ArrowRight, Clock3, Gauge, Layers3 } from "lucide-react";

import type { PocRecommendation } from "@/lib/types";

export function RecommendationCard({ recommendation }: { recommendation: PocRecommendation }) {
  return (
    <article className="recommendation-card">
      <div>
        <p className="repo-card__owner">Next PoC</p>
        <h3>{recommendation.title}</h3>
        <p className="recommendation-card__resume">{recommendation.resume}</p>
      </div>

      <div className="repo-card__meta">
        <span>
          <Gauge aria-hidden="true" size={14} /> {recommendation.difficulty}
        </span>
        <span>
          <Clock3 aria-hidden="true" size={14} /> {recommendation.estimatedTime}
        </span>
        <span>
          <Layers3 aria-hidden="true" size={14} /> {recommendation.suggestedStack.slice(0, 3).join(", ")}
        </span>
      </div>

      <details>
        <summary>
          Project brief <ArrowRight aria-hidden="true" size={15} />
        </summary>
        <div className="recommendation-card__details">
          <Section title="Why this fits" items={[recommendation.whyThisFits]} />
          <Section title="MVP scope" items={recommendation.mvpScope} />
          <Section title="Portfolio value" items={[recommendation.portfolioValue]} />
          <Section title="Next steps" items={recommendation.nextSteps} />
          <Section title="Related gaps" items={recommendation.relatedGaps} />
        </div>
      </details>
    </article>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
