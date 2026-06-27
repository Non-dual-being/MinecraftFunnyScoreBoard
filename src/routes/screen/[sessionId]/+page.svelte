<script lang="ts">
  import { onMount } from 'svelte';
  import { flip } from 'svelte/animate';

  import { gameLabel, gameWinText } from '$lib/scoring';
  import type { ScoreboardState } from '$lib/types';

  type ScreenPageProps = {
    data: {
      state: ScoreboardState;
    };
  };

  let { data }: ScreenPageProps = $props();

  let scoreboardState = $state<ScoreboardState>(data.state);
  let championFlash = $state(false);
  let latestFlash = $state(false);
  let winSplashText = $state<string | null>(null);

  let splashTimer: ReturnType<typeof setTimeout> | null = null;

  function parseScoreboardState(event: Event): ScoreboardState {
    return JSON.parse((event as MessageEvent<string>).data) as ScoreboardState;
  }

  function messageForState(state: ScoreboardState): string {
    const latestMatch = state.matches[0];

    if (!latestMatch) {
      return 'Nog geen potjes gespeeld. Druk in het adminpaneel op de eerste win.';
    }

    const foundTeam = state.leaderboard.find(
      (team) => team.id === latestMatch.winningTeamId
    );

    return `${foundTeam?.emoji ?? '🎮'} ${foundTeam?.name ?? 'Een team'} won ${gameLabel(
      latestMatch.gameType
    )} — ${gameWinText(latestMatch.gameType)}`;
  }

  function latestMessage(): string {
    return messageForState(scoreboardState);
  }

  function triggerWinSplash(text: string): void {
    winSplashText = text;

    if (splashTimer) {
      clearTimeout(splashTimer);
    }

    splashTimer = setTimeout(() => {
      winSplashText = null;
    }, 1400);
  }

  onMount(() => {
    const events = new EventSource(
      `/api/sessions/${scoreboardState.session.id}/events`
    );

    let receivedInitialEvent = false;

    function handleStateUpdate(event: Event): void {
      const previousLeaderId = scoreboardState.leaderboard[0]?.id;
      const previousLatestMatchId = scoreboardState.matches[0]?.id;

      const nextScoreboardState = parseScoreboardState(event);

      const nextLeaderId = nextScoreboardState.leaderboard[0]?.id;
      const nextLatestMatchId = nextScoreboardState.matches[0]?.id;

      scoreboardState = nextScoreboardState;

      if (!receivedInitialEvent) {
        receivedInitialEvent = true;
        return;
      }

      const hasNewMatch =
        Boolean(nextLatestMatchId) && nextLatestMatchId !== previousLatestMatchId;

      if (hasNewMatch) {
        latestFlash = true;
        triggerWinSplash(messageForState(nextScoreboardState));

        window.setTimeout(() => {
          latestFlash = false;
        }, 650);
      }

      if (
        previousLeaderId &&
        nextLeaderId &&
        previousLeaderId !== nextLeaderId
      ) {
        championFlash = true;

        window.setTimeout(() => {
          championFlash = false;
        }, 1800);
      }
    }

    events.addEventListener('state', handleStateUpdate);

    return () => {
      events.removeEventListener('state', handleStateUpdate);
      events.close();

      if (splashTimer) {
        clearTimeout(splashTimer);
      }
    };
  });
</script>

<svelte:head>
  <title>Scorebord | {scoreboardState.session.name}</title>
</svelte:head>

<main class="screen">
  <header class="screen-header">
    <div>
      <p class="eyebrow">Live scorebord</p>
      <h1 class="screen-title">{scoreboardState.session.name}</h1>
    </div>

    <div class="live-pill">
      <span class="live-dot"></span>
      LIVE
    </div>
  </header>

  <aside class="latest" class:latest-flash={latestFlash}>
    {latestMessage()}
  </aside>

  <section class="leaderboard">
    {#each scoreboardState.leaderboard as team (team.id)}
      <article
        class:leader={team.rank === 1}
        class="score-card"
        animate:flip={{ duration: 600 }}
      >
        <div class="rank">
          #{team.rank}
        </div>

        <div class="team-main">
          <h2>{team.emoji} {team.name}</h2>

          <div class="players">
            {#each team.players as player}
              <span class="player-chip">{player.name}</span>
            {/each}
          </div>

          <div class="breakdown">
            <span class="badge">Jungle: {team.jungleWins}</span>
            <span class="badge">Unreal: {team.unrealWins}</span>

            {#if team.breakdown.jungleComboBonus > 0}
              <span class="badge">
                Jungle combo +{team.breakdown.jungleComboBonus}
              </span>
            {/if}

            {#if team.breakdown.unrealRampageBonus > 0}
              <span class="badge">
                Rampage +{team.breakdown.unrealRampageBonus}
              </span>
            {/if}

            {#if team.breakdown.allroundBonus > 0}
              <span class="badge">
                Allround +{team.breakdown.allroundBonus}
              </span>
            {/if}
          </div>
        </div>

        <div class="score-side">
          <div class="points">{team.score}</div>
          <p class="meta">punten</p>
        </div>
      </article>
    {/each}
  </section>
</main>

{#if championFlash}
  <div class="splash">👑 NEW CHAMPION!</div>
{/if}

{#if winSplashText}
  <div class="win-splash">{winSplashText}</div>
{/if}