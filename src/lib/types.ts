export type GithubUser = {
  githubId: number;
  login: string;
  name: string | null;
  avatarUrl: string;
  htmlUrl: string;
};

export type RepoSnapshot = {
  id: number;
  githubId: number;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  homepage: string | null;
  primaryLanguage: string | null;
  topics: string[];
  stars: number;
  forks: number;
  pushedAt: string | null;
  updatedAt: string;
  readme: string | null;
  sampledFiles: SampledFile[];
  pocConfidence: number;
  pocReasons: string[];
  isPoc: boolean;
  score: ScoreBreakdown;
};

export type SampledFile = {
  path: string;
  content: string;
};

export type ScoreBreakdown = {
  note: number;
  presentation: number;
  completeness: number;
  technicalSignal: number;
  freshness: number;
  rationale: string[];
};

export type AnalysisReport = {
  note: number;
  resume: string;
  whatsGood: string[];
  whatIsBad: string[];
  howToImprove: string[];
};

export type AnalysisStatus = "idle" | "running" | "completed" | "failed";

export type RecommendationRequest = {
  learningGoals: string;
  targetAudience: string | null;
  preferredStack: string | null;
  difficulty: string | null;
  timeBudget: string | null;
};

export type PortfolioSignals = {
  languages: string[];
  topics: string[];
  missingDemoRepos: string[];
  weakReadmeRepos: string[];
  lowTestSignalRepos: string[];
  staleRepos: string[];
  repeatedProjectSignals: string[];
  existingStrengths: string[];
  portfolioGaps: string[];
};

export type PocRecommendation = {
  id?: number;
  title: string;
  resume: string;
  whyThisFits: string;
  suggestedStack: string[];
  mvpScope: string[];
  portfolioValue: string;
  difficulty: string;
  estimatedTime: string;
  nextSteps: string[];
  relatedGaps: string[];
  relatedRepoIds: number[];
  createdAt?: string;
};

export type RepoRecord = RepoSnapshot & {
  dbId: number;
  analysisStatus: AnalysisStatus;
  analysisError: string | null;
  analysis: AnalysisReport | null;
  analyzedAt: string | null;
};
