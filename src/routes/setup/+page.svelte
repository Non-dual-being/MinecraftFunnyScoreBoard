<script lang="ts">
  let { form } = $props();

  let teamCount = $state(4);

  const defaultTeams = [
    {
      name: 'team Noedel',
      emoji: '🍜',
      players: 'Speler 1\nSpeler 2'
    },
    {
      name: 'team Roblox',
      emoji: '🧱',
      players: 'Speler 1\nSpeler 2'
    },
    {
      name: 'team verloren sleutel',
      emoji: '🗝️',
      players: 'Speler 1\nSpeler 2'
    },
    {
      name: 'team boze ouders',
      emoji: '😡',
      players: 'Speler 1\nSpeler 2\nSpeler 3'
    },
    {
      name: 'team bananenlaser',
      emoji: '🍌',
      players: ''
    },
    {
      name: 'team ragequit',
      emoji: '💥',
      players: ''
    },
    {
      name: 'team jungle paniek',
      emoji: '🐒',
      players: ''
    },
    {
      name: 'team headshot',
      emoji: '🎯',
      players: ''
    }
  ];
</script>

<svelte:head>
  <title>Setup | Team Battle Score Arena</title>
</svelte:head>

<main class="page">
  <div class="topbar">
    <div>
      <p class="eyebrow">Setup</p>
      <h1>Teams maken</h1>
      <p class="lead">
        Vul de teamnamen en spelers in. Eén speler per regel. Daarna kom je in
        het adminpaneel.
      </p>
    </div>

    <a class="ghost" href="/">Terug</a>
  </div>

  {#if form?.message}
    <p class="error">{form.message}</p>
  {/if}

  <form method="POST" class="panel form-grid">
    <label>
      Naam van de avond
      <input
        name="session_name"
        value="Vrijdagavond Chaos Cup"
        autocomplete="off"
      />
    </label>

    <input type="hidden" name="team_count" value={teamCount} />

    <div class="row">
      <button
        class="secondary"
        type="button"
        onclick={() => (teamCount = Math.max(2, teamCount - 1))}
      >
        Team minder
      </button>

      <button
        class="secondary"
        type="button"
        onclick={() => (teamCount = Math.min(8, teamCount + 1))}
      >
        Team erbij
      </button>
    </div>

    <section class="team-form-grid">
      {#each Array.from({ length: teamCount }) as _, index}
        <article class="team-form-card">
          <h3>Team {index + 1}</h3>

          <div class="form-grid">
            <label>
              Teamnaam
              <input
                name={`team_name_${index}`}
                value={defaultTeams[index]?.name ?? ''}
                autocomplete="off"
              />
            </label>

            <label>
              Emoji
              <input
                name={`team_emoji_${index}`}
                value={defaultTeams[index]?.emoji ?? '🎮'}
                autocomplete="off"
              />
            </label>

            <label>
              Spelers
              <textarea name={`team_players_${index}`}>{defaultTeams[index]?.players ?? ''}</textarea>
            </label>
          </div>
        </article>
      {/each}
    </section>

    <button class="primary" type="submit">Start de chaos</button>
  </form>
</main>