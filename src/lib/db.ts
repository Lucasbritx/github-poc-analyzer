import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { AnalysisReport, AnalysisStatus, PocRecommendation, RecommendationRequest, RepoRecord, RepoSnapshot } from "./types";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "app.sqlite");

let db: DatabaseSync | null = null;

function getDb() {
  if (!db) {
    fs.mkdirSync(dataDir, { recursive: true });
    db = new DatabaseSync(dbPath);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        github_id INTEGER NOT NULL UNIQUE,
        login TEXT NOT NULL,
        name TEXT,
        avatar_url TEXT NOT NULL,
        html_url TEXT NOT NULL,
        access_token TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS repos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        github_id INTEGER NOT NULL,
        owner TEXT NOT NULL,
        name TEXT NOT NULL,
        full_name TEXT NOT NULL,
        description TEXT,
        html_url TEXT NOT NULL,
        homepage TEXT,
        primary_language TEXT,
        topics_json TEXT NOT NULL,
        stars INTEGER NOT NULL,
        forks INTEGER NOT NULL,
        pushed_at TEXT,
        updated_at TEXT NOT NULL,
        readme TEXT,
        sampled_files_json TEXT NOT NULL,
        poc_confidence REAL NOT NULL,
        poc_reasons_json TEXT NOT NULL,
        is_poc INTEGER NOT NULL,
        score_json TEXT NOT NULL,
        analysis_status TEXT NOT NULL DEFAULT 'idle',
        analysis_error TEXT,
        analysis_json TEXT,
        analyzed_at TEXT,
        synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, github_id)
      );

      CREATE TABLE IF NOT EXISTS recommendation_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        learning_goals TEXT NOT NULL,
        target_audience TEXT,
        preferred_stack TEXT,
        difficulty TEXT,
        time_budget TEXT,
        status TEXT NOT NULL DEFAULT 'completed',
        error TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        resume TEXT NOT NULL,
        why_this_fits TEXT NOT NULL,
        suggested_stack_json TEXT NOT NULL,
        mvp_scope_json TEXT NOT NULL,
        portfolio_value TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        estimated_time TEXT NOT NULL,
        next_steps_json TEXT NOT NULL,
        related_gaps_json TEXT NOT NULL,
        related_repo_ids_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(request_id) REFERENCES recommendation_requests(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  return db;
}

type UserRow = {
  id: number;
  github_id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  access_token: string;
};

type RepoRow = {
  id: number;
  github_id: number;
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  primary_language: string | null;
  topics_json: string;
  stars: number;
  forks: number;
  pushed_at: string | null;
  updated_at: string;
  readme: string | null;
  sampled_files_json: string;
  poc_confidence: number;
  poc_reasons_json: string;
  is_poc: number;
  score_json: string;
  analysis_status: AnalysisStatus;
  analysis_error: string | null;
  analysis_json: string | null;
  analyzed_at: string | null;
};

type RecommendationRow = {
  id: number;
  title: string;
  resume: string;
  why_this_fits: string;
  suggested_stack_json: string;
  mvp_scope_json: string;
  portfolio_value: string;
  difficulty: string;
  estimated_time: string;
  next_steps_json: string;
  related_gaps_json: string;
  related_repo_ids_json: string;
  created_at: string;
};

export function upsertUser(profile: {
  githubId: number;
  login: string;
  name: string | null;
  avatarUrl: string;
  htmlUrl: string;
  accessToken: string;
}) {
  const database = getDb();
  database
    .prepare(`
      INSERT INTO users (github_id, login, name, avatar_url, html_url, access_token)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(github_id) DO UPDATE SET
        login = excluded.login,
        name = excluded.name,
        avatar_url = excluded.avatar_url,
        html_url = excluded.html_url,
        access_token = excluded.access_token,
        updated_at = CURRENT_TIMESTAMP
    `)
    .run(profile.githubId, profile.login, profile.name, profile.avatarUrl, profile.htmlUrl, profile.accessToken);

  return database.prepare("SELECT * FROM users WHERE github_id = ?").get(profile.githubId) as UserRow;
}

export function createSession(userId: number) {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  getDb().prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(id, userId, expiresAt);
  return { id, expiresAt };
}

export function deleteSession(sessionId: string) {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export function getUserBySession(sessionId: string | undefined) {
  if (!sessionId) return null;
  return getDb()
    .prepare(`
      SELECT users.*
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.id = ? AND sessions.expires_at > ?
    `)
    .get(sessionId, new Date().toISOString()) as UserRow | undefined | null;
}

export function upsertRepo(userId: number, repo: RepoSnapshot) {
  getDb()
    .prepare(`
      INSERT INTO repos (
        user_id, github_id, owner, name, full_name, description, html_url, homepage,
        primary_language, topics_json, stars, forks, pushed_at, updated_at, readme,
        sampled_files_json, poc_confidence, poc_reasons_json, is_poc, score_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, github_id) DO UPDATE SET
        owner = excluded.owner,
        name = excluded.name,
        full_name = excluded.full_name,
        description = excluded.description,
        html_url = excluded.html_url,
        homepage = excluded.homepage,
        primary_language = excluded.primary_language,
        topics_json = excluded.topics_json,
        stars = excluded.stars,
        forks = excluded.forks,
        pushed_at = excluded.pushed_at,
        updated_at = excluded.updated_at,
        readme = excluded.readme,
        sampled_files_json = excluded.sampled_files_json,
        poc_confidence = excluded.poc_confidence,
        poc_reasons_json = excluded.poc_reasons_json,
        is_poc = excluded.is_poc,
        score_json = excluded.score_json,
        synced_at = CURRENT_TIMESTAMP
    `)
    .run(
      userId,
      repo.githubId,
      repo.owner,
      repo.name,
      repo.fullName,
      repo.description,
      repo.htmlUrl,
      repo.homepage,
      repo.primaryLanguage,
      JSON.stringify(repo.topics),
      repo.stars,
      repo.forks,
      repo.pushedAt,
      repo.updatedAt,
      repo.readme,
      JSON.stringify(repo.sampledFiles),
      repo.pocConfidence,
      JSON.stringify(repo.pocReasons),
      repo.isPoc ? 1 : 0,
      JSON.stringify(repo.score)
    );
}

export function listPocRepos(userId: number) {
  const rows = getDb()
    .prepare("SELECT * FROM repos WHERE user_id = ? AND is_poc = 1 ORDER BY poc_confidence DESC, updated_at DESC")
    .all(userId) as RepoRow[];
  return rows.map(mapRepoRow);
}

export function listUserRepos(userId: number) {
  const rows = getDb()
    .prepare("SELECT * FROM repos WHERE user_id = ? ORDER BY is_poc DESC, updated_at DESC")
    .all(userId) as RepoRow[];
  return rows.map(mapRepoRow);
}

export function getRepo(userId: number, repoId: number) {
  const row = getDb().prepare("SELECT * FROM repos WHERE user_id = ? AND id = ?").get(userId, repoId) as RepoRow | undefined;
  return row ? mapRepoRow(row) : null;
}

export function markAnalysisRunning(repoId: number) {
  getDb()
    .prepare("UPDATE repos SET analysis_status = 'running', analysis_error = NULL WHERE id = ?")
    .run(repoId);
}

export function saveAnalysis(repoId: number, analysis: AnalysisReport) {
  getDb()
    .prepare(`
      UPDATE repos
      SET analysis_status = 'completed',
          analysis_json = ?,
          analysis_error = NULL,
          analyzed_at = ?
      WHERE id = ?
    `)
    .run(JSON.stringify(analysis), new Date().toISOString(), repoId);
}

export function saveAnalysisError(repoId: number, message: string) {
  getDb()
    .prepare("UPDATE repos SET analysis_status = 'failed', analysis_error = ? WHERE id = ?")
    .run(message, repoId);
}

export function saveRecommendations(userId: number, request: RecommendationRequest, recommendations: PocRecommendation[]) {
  const database = getDb();
  database.exec("BEGIN");
  try {
    const result = database
      .prepare(`
        INSERT INTO recommendation_requests (
          user_id, learning_goals, target_audience, preferred_stack, difficulty, time_budget
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        userId,
        request.learningGoals,
        request.targetAudience,
        request.preferredStack,
        request.difficulty,
        request.timeBudget
      );

    const requestId = Number(result.lastInsertRowid);
    const insert = database.prepare(`
      INSERT INTO recommendations (
        request_id, user_id, title, resume, why_this_fits, suggested_stack_json,
        mvp_scope_json, portfolio_value, difficulty, estimated_time, next_steps_json,
        related_gaps_json, related_repo_ids_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const recommendation of recommendations) {
      insert.run(
        requestId,
        userId,
        recommendation.title,
        recommendation.resume,
        recommendation.whyThisFits,
        JSON.stringify(recommendation.suggestedStack),
        JSON.stringify(recommendation.mvpScope),
        recommendation.portfolioValue,
        recommendation.difficulty,
        recommendation.estimatedTime,
        JSON.stringify(recommendation.nextSteps),
        JSON.stringify(recommendation.relatedGaps),
        JSON.stringify(recommendation.relatedRepoIds)
      );
    }

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function listRecommendations(userId: number) {
  const rows = getDb()
    .prepare("SELECT * FROM recommendations WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 12")
    .all(userId) as RecommendationRow[];
  return rows.map(mapRecommendationRow);
}

function mapRepoRow(row: RepoRow): RepoRecord {
  return {
    dbId: row.id,
    id: row.github_id,
    githubId: row.github_id,
    owner: row.owner,
    name: row.name,
    fullName: row.full_name,
    description: row.description,
    htmlUrl: row.html_url,
    homepage: row.homepage,
    primaryLanguage: row.primary_language,
    topics: JSON.parse(row.topics_json),
    stars: row.stars,
    forks: row.forks,
    pushedAt: row.pushed_at,
    updatedAt: row.updated_at,
    readme: row.readme,
    sampledFiles: JSON.parse(row.sampled_files_json),
    pocConfidence: row.poc_confidence,
    pocReasons: JSON.parse(row.poc_reasons_json),
    isPoc: row.is_poc === 1,
    score: JSON.parse(row.score_json),
    analysisStatus: row.analysis_status,
    analysisError: row.analysis_error,
    analysis: row.analysis_json ? JSON.parse(row.analysis_json) : null,
    analyzedAt: row.analyzed_at
  };
}

function mapRecommendationRow(row: RecommendationRow): PocRecommendation {
  return {
    id: row.id,
    title: row.title,
    resume: row.resume,
    whyThisFits: row.why_this_fits,
    suggestedStack: JSON.parse(row.suggested_stack_json),
    mvpScope: JSON.parse(row.mvp_scope_json),
    portfolioValue: row.portfolio_value,
    difficulty: row.difficulty,
    estimatedTime: row.estimated_time,
    nextSteps: JSON.parse(row.next_steps_json),
    relatedGaps: JSON.parse(row.related_gaps_json),
    relatedRepoIds: JSON.parse(row.related_repo_ids_json),
    createdAt: row.created_at
  };
}
