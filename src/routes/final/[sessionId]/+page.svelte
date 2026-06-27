<script lang="ts">
  import { gameLabel } from '$lib/scoring';
  import type { LeaderboardTeam, ScoreboardState } from '$lib/types';

  type FinalPageProps = {
    data: {
      state: ScoreboardState;
    };
  };

  let { data }: FinalPageProps = $props();

  const confettiItems = [
    '🍜',
    '🧱',
    '🗝️',
    '😡',
    '🌴',
    '🎯',
    '💥',
    '👑',
    '⚡',
    '🎮',
    '🏆',
    '🔥',
    '🚀',
    '🍌',
    '🕹️',
    '✨'
  ];

  let scoreboardState = $derived(data.state);
  let winner = $derived(scoreboardState.leaderboard[0]);

  function teamName(teamId: string): string {
    const foundTeam = scoreboardState.leaderboard.find(
      (team) => team.id === teamId
    );

    return foundTeam?.name ?? 'Onbekend team';
  }

  function bonusSummary(team: LeaderboardTeam): string[] {
    const bonuses: string[] = [];

    if (team.breakdown.jungleComboBonus > 0) {
      bonuses.push(`Jungle combo +${team.breakdown.jungleComboBonus}`);
    }

    if (team.breakdown.unrealRampageBonus > 0) {
      bonuses.push(`Rampage +${team.breakdown.unrealRampageBonus}`);
    }

    if (team.breakdown.allroundBonus > 0) {
      bonuses.push(`Allround +${team.breakdown.allroundBonus}`);
    }

    return bonuses;
  }
</script>

<svelte:head>
  <title>Eindstand | {scoreboardState.session.name}</title>
</svelte:head>

<main class="final-screen">
  <div class="final-confetti" aria-hidden="true">
    {#each confettiItems as item, index}
      <span
        class="confetti-piece"
        style={`--x: ${(index * 7) % 100}%; --delay: ${index * 0.16}s; --spin: ${
          index % 2 === 0 ? 1 : -1
        };`}
      >
        {item}
      </span>
    {/each}
  </div>

  <section class="final-hero">
    <p class="eyebrow">Definitieve eindstand</p>

    {#if winner}
      <h1>🏆 {winner.emoji} {winner.name} wint!</h1>

      <p class="lead">
        Met <strong>{winner.score}</strong> punten, {winner.jungleWins} Jungle
        Speed wins en {winner.unrealWins} Unreal Tournament wins.
      </p>
    {:else}
      <h1>Geen winnaar</h1>
      <p class="lead">Er zijn nog geen teams aangemaakt.</p>
    {/if}

    <div class="actions">
      <a class="primary" href="/setup">Begin opnieuw</a>
      <a class="ghost" href={`/admin/${scoreboardState.session.id}`}>
        Terug naar admin
      </a>
      <a class="ghost" href={`/screen/${scoreboardState.session.id}`}>
        Live scorebord bekijken
      </a>
    </div>
  </section>

  <section class="final-podium">
    {#each scoreboardState.leaderboard.slice(0, 3) as team}
      <article class:podium-winner={team.rank === 1} class="podium-card">
        <div class="podium-rank">#{team.rank}</div>
        <h2>{team.emoji} {team.name}</h2>
        <div class="podium-score">{team.score}</div>
        <p class="meta">punten</p>
      </article>
    {/each}
  </section>

  <section class="final-table">
    <h2>Alle scores</h2>

    <div class="final-list">
      {#each scoreboardState.leaderboard as team}
        <article class="final-row">
          <div class="final-row-main">
            <div class="final-row-rank">#{team.rank}</div>

            <div>
              <h3>{team.emoji} {team.name}</h3>
              <p class="meta">
                {team.players.map((player) => player.name).join(', ') ||
                  'Geen spelers ingevuld'}
              </p>

              <div class="breakdown">
                <span class="badge">Jungle: {team.jungleWins}</span>
                <span class="badge">Unreal: {team.unrealWins}</span>

                {#each bonusSummary(team) as bonus}
                  <span class="badge">{bonus}</span>
                {/each}
              </div>
            </div>
          </div>

          <div class="final-row-score">{team.score}</div>
        </article>
      {/each}
    </div>
  </section>

  <section class="history final-history">
    <h2>Laatste acties</h2>

    {#if scoreboardState.matches.length === 0}
      <p class="meta">Geen gespeelde potjes.</p>
    {:else}
      <ul class="history-list">
        {#each scoreboardState.matches.slice(0, 10) as match}
          <li>
            <strong>{teamName(match.winningTeamId)}</strong>
            won {gameLabel(match.gameType)}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</main>