import type { RepoSnapshot, SampledFile } from "./types";
import { detectPoc, scoreRepo } from "./detector";

const githubApi = "https://api.github.com";

type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  pushed_at: string | null;
  updated_at: string;
};

export class GithubError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function exchangeCodeForToken(code: string) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    })
  });

  const payload = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !payload.access_token) {
    throw new GithubError(payload.error_description || "GitHub OAuth token exchange failed.", response.status);
  }

  return payload.access_token;
}

export async function getViewer(token: string) {
  const user = await githubFetch<{
    id: number;
    login: string;
    name: string | null;
    avatar_url: string;
    html_url: string;
  }>(token, "/user");

  return {
    githubId: user.id,
    login: user.login,
    name: user.name,
    avatarUrl: user.avatar_url,
    htmlUrl: user.html_url
  };
}

export async function getPublicUser(username: string) {
  const token = process.env.GITHUB_TOKEN || null;
  const user = await githubFetch<{
    id: number;
    login: string;
    name: string | null;
    avatar_url: string;
    html_url: string;
  }>(token, `/users/${encodeURIComponent(username)}`);

  return {
    githubId: user.id,
    login: user.login,
    name: user.name,
    avatarUrl: user.avatar_url,
    htmlUrl: user.html_url
  };
}

export async function fetchRepoSnapshots(token: string): Promise<RepoSnapshot[]> {
  const repos = await githubFetch<GithubRepo[]>(
    token,
    "/user/repos?visibility=public&affiliation=owner&sort=updated&direction=desc&per_page=100"
  );
  return buildRepoSnapshots(token, repos);
}

export async function fetchPublicRepoSnapshots(username: string): Promise<RepoSnapshot[]> {
  const token = process.env.GITHUB_TOKEN || null;
  const repos = await githubFetch<GithubRepo[]>(
    token,
    `/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&direction=desc&per_page=100`
  );
  return buildRepoSnapshots(token, repos);
}

async function buildRepoSnapshots(token: string | null, repos: GithubRepo[]): Promise<RepoSnapshot[]> {
  const snapshots: RepoSnapshot[] = [];
  for (const repo of repos.filter((item) => !item.full_name.includes("/.") && item.owner.login)) {
    const [readme, sampledFiles] = await Promise.all([fetchReadme(token, repo), fetchSampledFiles(token, repo)]);
    const detection = detectPoc({
      name: repo.name,
      description: repo.description,
      topics: repo.topics || [],
      readme
    });
    const base = {
      id: repo.id,
      githubId: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      htmlUrl: repo.html_url,
      homepage: repo.homepage,
      primaryLanguage: repo.language,
      topics: repo.topics || [],
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      pushedAt: repo.pushed_at,
      updatedAt: repo.updated_at,
      readme,
      sampledFiles,
      pocConfidence: detection.confidence,
      pocReasons: detection.reasons,
      isPoc: detection.isPoc
    };

    snapshots.push({
      ...base,
      score: scoreRepo(base)
    });
  }

  return snapshots;
}

async function fetchReadme(token: string | null, repo: GithubRepo) {
  try {
    const payload = await githubFetch<{ content?: string; encoding?: string }>(token, `/repos/${repo.full_name}/readme`);
    if (payload.encoding === "base64" && payload.content) {
      return Buffer.from(payload.content, "base64").toString("utf8").slice(0, 16_000);
    }
  } catch (error) {
    if (error instanceof GithubError && error.status === 404) return null;
    throw error;
  }

  return null;
}

async function fetchSampledFiles(token: string | null, repo: GithubRepo): Promise<SampledFile[]> {
  const candidates = [
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "README.md",
    "LICENSE",
    "src/index.ts",
    "src/app/page.tsx",
    "app.py",
    "main.py"
  ];
  const files: SampledFile[] = [];

  for (const filePath of candidates) {
    if (files.length >= 5) break;
    try {
      const payload = await githubFetch<{ content?: string; encoding?: string; size?: number }>(
        token,
        `/repos/${repo.full_name}/contents/${filePath.split("/").map(encodeURIComponent).join("/")}`
      );
      if (payload.encoding === "base64" && payload.content && (payload.size || 0) < 80_000) {
        files.push({
          path: filePath,
          content: Buffer.from(payload.content, "base64").toString("utf8").slice(0, 12_000)
        });
      }
    } catch (error) {
      if (error instanceof GithubError && error.status === 404) continue;
      throw error;
    }
  }

  return files;
}

async function githubFetch<T>(token: string | null, path: string): Promise<T> {
  const response = await fetch(`${githubApi}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-GitHub-Api-Version": "2022-11-28"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new GithubError(payload.message || `GitHub request failed with ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
}
