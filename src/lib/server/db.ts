import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { buildScoreboardState } from '$lib/scoring';
import type {
  GameType,
  Match,
  Player,
  ScoreboardState,
  Session,
  Team
} from '$lib/types';

const dbFile = process.env.DB_FILE ?? 'data/scoreboard.sqlite';

mkdirSync(dirname(dbFile), {
  recursive: true
});

const db = new Database(dbFile);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    winning_team_id TEXT NOT NULL,
    game_type TEXT NOT NULL CHECK (game_type IN ('jungle_speed', 'unreal_tournament')),
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (winning_team_id) REFERENCES teams(id) ON DELETE CASCADE
  );
`);

type SessionRow = {
  id: string;
  name: string;
  status: 'active' | 'ended';
  created_at: string;
};

type TeamRow = {
  id: string;
  session_id: string;
  name: string;
  emoji: string;
  sort_order: number;
  created_at: string;
};

type PlayerRow = {
  id: string;
  team_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

type MatchRow = {
  id: string;
  session_id: string;
  winning_team_id: string;
  game_type: GameType;
  created_at: string;
};

export type CreateTeamInput = {
  name: string;
  emoji: string;
  players: string[];
};

function now(): string {
  return new Date().toISOString();
}

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at
  };
}

function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    emoji: row.emoji,
    sortOrder: row.sort_order,
    createdAt: row.created_at
  };
}

function toPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    teamId: row.team_id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at
  };
}

function toMatch(row: MatchRow): Match {
  return {
    id: row.id,
    sessionId: row.session_id,
    winningTeamId: row.winning_team_id,
    gameType: row.game_type,
    createdAt: row.created_at
  };
}

export function createSession(name: string, teams: CreateTeamInput[]): string {
  const sessionId = randomUUID();
  const createdAt = now();

  const insertSession = db.prepare(`
    INSERT INTO sessions (id, name, status, created_at)
    VALUES (?, ?, 'active', ?)
  `);

  const insertTeam = db.prepare(`
    INSERT INTO teams (id, session_id, name, emoji, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertPlayer = db.prepare(`
    INSERT INTO players (id, team_id, name, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    insertSession.run(sessionId, name, createdAt);

    teams.forEach((team, teamIndex) => {
      const teamId = randomUUID();

      insertTeam.run(
        teamId,
        sessionId,
        team.name,
        team.emoji || '🎮',
        teamIndex,
        createdAt
      );

      team.players.forEach((playerName, playerIndex) => {
        insertPlayer.run(
          randomUUID(),
          teamId,
          playerName,
          playerIndex,
          createdAt
        );
      });
    });
  });

  transaction();

  return sessionId;
}

export function getScoreboardState(sessionId: string): ScoreboardState | null {
  const sessionRow = db
    .prepare(
      `
      SELECT *
      FROM sessions
      WHERE id = ?
    `
    )
    .get(sessionId) as SessionRow | undefined;

  if (!sessionRow) {
    return null;
  }

  const teamRows = db
    .prepare(
      `
      SELECT *
      FROM teams
      WHERE session_id = ?
      ORDER BY sort_order ASC
    `
    )
    .all(sessionId) as TeamRow[];

  const playerRows = db
    .prepare(
      `
      SELECT players.*
      FROM players
      JOIN teams ON teams.id = players.team_id
      WHERE teams.session_id = ?
      ORDER BY players.sort_order ASC
    `
    )
    .all(sessionId) as PlayerRow[];

  const matchRows = db
    .prepare(
      `
      SELECT *
      FROM matches
      WHERE session_id = ?
      ORDER BY created_at DESC
    `
    )
    .all(sessionId) as MatchRow[];

  return buildScoreboardState(
    toSession(sessionRow),
    teamRows.map(toTeam),
    playerRows.map(toPlayer),
    matchRows.map(toMatch)
  );
}

export function addMatch(
  sessionId: string,
  winningTeamId: string,
  gameType: GameType
): void {
  const session = db
    .prepare(
      `
      SELECT status
      FROM sessions
      WHERE id = ?
    `
    )
    .get(sessionId) as { status: string } | undefined;

  if (!session) {
    throw new Error('Sessie bestaat niet.');
  }

  if (session.status !== 'active') {
    throw new Error('Deze sessie is al definitief afgesloten.');
  }

  const teamExists = db
    .prepare(
      `
      SELECT id
      FROM teams
      WHERE id = ?
      AND session_id = ?
    `
    )
    .get(winningTeamId, sessionId);

  if (!teamExists) {
    throw new Error('Team bestaat niet binnen deze sessie.');
  }

  db.prepare(
    `
    INSERT INTO matches (id, session_id, winning_team_id, game_type, created_at)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(randomUUID(), sessionId, winningTeamId, gameType, now());
}

export function finishSession(sessionId: string): void {
  const result = db
    .prepare(
      `
      UPDATE sessions
      SET status = 'ended'
      WHERE id = ?
    `
    )
    .run(sessionId);

  if (result.changes === 0) {
    throw new Error('Sessie bestaat niet.');
  }
}

export function undoLastMatch(sessionId: string): boolean {
  const lastMatch = db
    .prepare(
      `
      SELECT id
      FROM matches
      WHERE session_id = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT 1
    `
    )
    .get(sessionId) as { id: string } | undefined;

  if (!lastMatch) {
    return false;
  }

  db.prepare(
    `
    DELETE FROM matches
    WHERE id = ?
  `
  ).run(lastMatch.id);

  return true;
}