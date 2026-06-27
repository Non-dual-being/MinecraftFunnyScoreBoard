import { fail, redirect } from '@sveltejs/kit';

import { createSession, type CreateTeamInput } from '$lib/server/db';

import type { Actions } from './$types';

const MAX_TEAMS = 8;
const MIN_TEAMS = 2;

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function parsePlayers(rawPlayers: string): string[] {
  return rawPlayers
    .split(/\r?\n|,/)
    .map((player) => player.trim())
    .filter(Boolean);
}

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();

    const sessionName =
      getString(formData, 'session_name') || 'Vrijdagavond Chaos Cup';

    const rawTeamCount = Number(getString(formData, 'team_count') || '4');
    const teamCount = Math.min(Math.max(rawTeamCount, MIN_TEAMS), MAX_TEAMS);

    const teams: CreateTeamInput[] = [];

    for (let index = 0; index < teamCount; index += 1) {
      const name = getString(formData, `team_name_${index}`);
      const emoji = getString(formData, `team_emoji_${index}`) || '🎮';
      const players = parsePlayers(getString(formData, `team_players_${index}`));

      if (!name) {
        continue;
      }

      teams.push({
        name,
        emoji,
        players
      });
    }

    if (teams.length < MIN_TEAMS) {
      return fail(400, {
        message: 'Maak minimaal twee teams aan.'
      });
    }

    const sessionId = createSession(sessionName, teams);

    throw redirect(303, `/admin/${sessionId}`);
  }
};