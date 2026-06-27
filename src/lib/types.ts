export type GameType = 'jungle_speed' | 'unreal_tournament';

export type SessionStatus = 'active' | 'ended';

export type Session = {
  id: string;
  name: string;
  status: SessionStatus;
  createdAt: string;
};

export type Team = {
  id: string;
  sessionId: string;
  name: string;
  emoji: string;
  sortOrder: number;
  createdAt: string;
};

export type Player = {
  id: string;
  teamId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

export type Match = {
  id: string;
  sessionId: string;
  winningTeamId: string;
  gameType: GameType;
  createdAt: string;
};

export type ScoreBreakdown = {
  jungleBase: number;
  unrealBase: number;
  jungleComboBonus: number;
  unrealRampageBonus: number;
  allroundBonus: number;
  total: number;
};

export type LeaderboardTeam = Team & {
  rank: number;
  players: Player[];
  jungleWins: number;
  unrealWins: number;
  lastWinAt: string | null;
  breakdown: ScoreBreakdown;
  score: number;
};

export type ScoreboardState = {
  session: Session;
  leaderboard: LeaderboardTeam[];
  matches: Match[];
};