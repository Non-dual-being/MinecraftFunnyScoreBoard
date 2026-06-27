<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';

  import { gameLabel } from '$lib/scoring';
  import type { ScoreboardState } from '$lib/types';

  type AdminPageProps = {
    data: {
      state: ScoreboardState;
    };
    form?: {
      message?: string;
    } | null;
  };

  let { data, form }: AdminPageProps = $props();

  let scoreboardState = $state<ScoreboardState>(data.state);
  let adminSplashText = $state<string | null>(null);

  let adminSplashTimer: ReturnType<typeof setTimeout> | null = null;

  const isEnded = $derived(scoreboardState.session.status === 'ended');

  function parseScoreboardState(event: Event): ScoreboardState {
    return JSON.parse((event as MessageEvent<string>).data) as ScoreboardState;
  }

  function teamName(teamId: string): string {
    const foundTeam = scoreboardState.leaderboard.find(
      (team) => team.id === teamId
    );

    return foundTeam?.name ?? 'Onbekend team';
  }

  function triggerAdminSplash(teamName: string, text: string): void {
    adminSplashText = `${teamName}: ${text}`;

    if (adminSplashTimer) {
      clearTimeout(adminSplashTimer);
    }

    adminSplashTimer = setTimeout(() => {
      adminSplashText = null;
    }, 900);
  }

  onMount(() => {
    const events = new EventSource(
      `/api/sessions/${scoreboardState.session.id}/events`
    );

    function handleStateUpdate(event: Event): void {
      scoreboardState = parseScoreboardState(event);
    }

    events.addEventListener('state', handleStateUpdate);

    return () => {
      events.removeEventListener('state', handleStateUpdate);
      events.close();

      if (adminSplashTimer) {
        clearTimeout(adminSplashTimer);
      }
    };
  });
</script>

<svelte:head>
  <title>Admin | {scoreboardState.session.name}</title>
</svelte:head>

<main class="page">
  <div class="topbar">
    <div>
      <p class="eyebrow">Adminpaneel</p>
      <h1>{scoreboardState.session.name}</h1>

      {#if isEnded}
        <p class="lead">
          Deze sessie is definitief afgesloten. Je kunt geen nieuwe wins meer
          registreren.
        </p>
      {:else}
        <p class="lead">
          Registreer hier wie een potje heeft gewonnen. Dit scherm moet je niet
          open op de beamer zetten.
        </p>
      {/if}
    </div>

    <div class="actions">
      <a
        class="ghost"
        href={`/screen/${scoreboardState.session.id}`}
        target="_blank"
      >
        Open live scorebord
      </a>

      <a
        class="ghost"
        href={`/final/${scoreboardState.session.id}`}
        target="_blank"
      >
        Bekijk eindstand
      </a>

      {#if !isEnded}
        <form method="POST" action="?/finish">
          <button class="primary" type="submit">Definitieve eindstand</button>
        </form>

        <form method="POST" action="?/undo" use:enhance>
          <button class="danger" type="submit">Laatste actie ongedaan</button>
        </form>
      {/if}
    </div>
  </div>

  {#if form?.message}
    <p class="latest">{form.message}</p>
  {/if}

  {#if adminSplashText}
    <div class="admin-splash">{adminSplashText}</div>
  {/if}

  <section class="admin-grid">
    {#each scoreboardState.leaderboard as team (team.id)}
      <article class="admin-card">
        <header>
          <div>
            <h2>#{team.rank} {team.emoji} {team.name}</h2>
            <p class="meta">
              {team.players.map((player) => player.name).join(', ') ||
                'Geen spelers ingevuld'}
            </p>
          </div>

          <div class="big-score">{team.score}</div>
        </header>

        <p class="meta">
          Jungle Speed: <strong>{team.jungleWins}</strong> |
          Unreal: <strong>{team.unrealWins}</strong>
        </p>

        <form method="POST" action="?/win" class="win-buttons" use:enhance>
          <input type="hidden" name="team_id" value={team.id} />

          <button
            class="secondary"
            type="submit"
            name="game_type"
            value="jungle_speed"
            disabled={isEnded}
            onclick={() => triggerAdminSplash(team.name, '🌴 JUNGLE GRAB!')}
          >
            Jungle Speed gewonnen
          </button>

          <button
            class="primary"
            type="submit"
            name="game_type"
            value="unreal_tournament"
            disabled={isEnded}
            onclick={() => triggerAdminSplash(team.name, '💥 UNREAL DOMINATION!')}
          >
            Unreal Tournament gewonnen
          </button>
        </form>
      </article>
    {/each}
  </section>

  <section class="history">
    <h2>Laatste potjes</h2>

    {#if scoreboardState.matches.length === 0}
      <p class="meta">Nog geen potjes geregistreerd.</p>
    {:else}
      <ul class="history-list">
        {#each scoreboardState.matches.slice(0, 12) as match}
          <li>
            <strong>{teamName(match.winningTeamId)}</strong>
            won {gameLabel(match.gameType)}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</main>