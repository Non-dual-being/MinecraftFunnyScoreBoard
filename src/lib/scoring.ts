import type {
  GameType,
  LeaderboardTeam,
  Match,
  Player,
  ScoreBreakdown,
  ScoreboardState,
  Session,
  Team
} from '$lib/types';

type TeamStats = {
  jungleWins: number;
  unrealWins: number;
};

export function calculateScore(stats: TeamStats): ScoreBreakdown {
  const jungleBase = stats.jungleWins * 10;
  const unrealBase = stats.unrealWins * 25;

  // Elke 3 Jungle Speed wins geeft één extra combo-bonus.
  const jungleComboBonus = Math.floor(stats.jungleWins / 3) * 10;

  // Elke 3 Unreal Tournament wins geeft een zwaardere rampage-bonus.
  const unrealRampageBonus = Math.floor(stats.unrealWins / 3) * 25;

  // Teams die beide spellen winnen, krijgen een allround-bonus.
  const allroundBonus = stats.jungleWins > 0 && stats.unrealWins > 0 ? 15 : 0;

  const total =
    jungleBase +
    unrealBase +
    jungleComboBonus +
    unrealRampageBonus +
    allroundBonus;

  return {
    jungleBase,
    unrealBase,
    jungleComboBonus,
    unrealRampageBonus,
    allroundBonus,
    total
  };
}

export function gameLabel(gameType: GameType): string {
  if (gameType === 'jungle_speed') return 'Jungle Speed';
  return 'Unreal Tournament';
}

export function gameWinText(gameType: GameType): string {
  if (gameType === 'jungle_speed') return 'JUNGLE GRAB! +10';
  return 'UNREAL DOMINATION! +25';
}

export function buildScoreboardState(
  session: Session,
  teams: Team[],
  players: Player[],
  matches: Match[]
): ScoreboardState {
  const playersByTeam = new Map<string, Player[]>();
  const statsByTeam = new Map<string, TeamStats>();
  const lastWinByTeam = new Map<string, string>();

  for (const team of teams) {
    playersByTeam.set(team.id, []);
    statsByTeam.set(team.id, {
      jungleWins: 0,
      unrealWins: 0
    });
  }

  for (const player of players) {
    playersByTeam.get(player.teamId)?.push(player);
  }

  for (const match of matches) {
    const stats = statsByTeam.get(match.winningTeamId);

    if (!stats) continue;

    if (match.gameType === 'jungle_speed') {
      stats.jungleWins += 1;
    }

    if (match.gameType === 'unreal_tournament') {
      stats.unrealWins += 1;
    }

    const currentLastWin = lastWinByTeam.get(match.winningTeamId);

    if (!currentLastWin || match.createdAt > currentLastWin) {
      lastWinByTeam.set(match.winningTeamId, match.createdAt);
    }
  }

  const leaderboardWithoutRank = teams.map((team) => {
    const stats = statsByTeam.get(team.id) ?? {
      jungleWins: 0,
      unrealWins: 0
    };

    const breakdown = calculateScore(stats);

    return {
      ...team,
      rank: 0,
      players: playersByTeam.get(team.id) ?? [],
      jungleWins: stats.jungleWins,
      unrealWins: stats.unrealWins,
      lastWinAt: lastWinByTeam.get(team.id) ?? null,
      breakdown,
      score: breakdown.total
    } satisfies LeaderboardTeam;
  });

  const leaderboard = leaderboardWithoutRank
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      // Tie-breaker: Unreal wins tellen zwaarder.
      if (b.unrealWins !== a.unrealWins) return b.unrealWins - a.unrealWins;

      // Daarna Jungle wins.
      if (b.jungleWins !== a.jungleWins) return b.jungleWins - a.jungleWins;

      // Daarna vaste volgorde zodat ranking niet random springt.
      return a.sortOrder - b.sortOrder;
    })
    .map((team, index) => ({
      ...team,
      rank: index + 1
    }));

  return {
    session,
    leaderboard,
    matches
  };
}