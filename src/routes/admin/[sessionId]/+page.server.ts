import { error, fail, redirect } from '@sveltejs/kit';

import {
  addMatch,
  finishSession,
  getScoreboardState,
  undoLastMatch
} from '$lib/server/db';
import { publishScoreboardState } from '$lib/server/events';
import type { GameType } from '$lib/types';

import type { Actions, PageServerLoad } from './$types';

function isGameType(value: unknown): value is GameType {
  return value === 'jungle_speed' || value === 'unreal_tournament';
}

export const load: PageServerLoad = ({ params }) => {
  const state = getScoreboardState(params.sessionId);

  if (!state) {
    throw error(404, 'Sessie niet gevonden.');
  }

  return {
    state
  };
};

export const actions: Actions = {
  win: async ({ request, params }) => {
    const formData = await request.formData();

    const teamId = formData.get('team_id');
    const gameType = formData.get('game_type');

    if (typeof teamId !== 'string' || !teamId) {
      return fail(400, {
        message: 'Geen geldig team gekozen.'
      });
    }

    if (!isGameType(gameType)) {
      return fail(400, {
        message: 'Geen geldig spel gekozen.'
      });
    }

    try {
      addMatch(params.sessionId, teamId, gameType);

      const state = getScoreboardState(params.sessionId);

      if (state) {
        publishScoreboardState(params.sessionId, state);
      }

      return {
        message: 'Win geregistreerd.'
      };
    } catch (caughtError) {
      return fail(400, {
        message:
          caughtError instanceof Error
            ? caughtError.message
            : 'Win kon niet worden geregistreerd.'
      });
    }
  },

  undo: async ({ params }) => {
    const undone = undoLastMatch(params.sessionId);
    const state = getScoreboardState(params.sessionId);

    if (state) {
      publishScoreboardState(params.sessionId, state);
    }

    return {
      message: undone
        ? 'Laatste actie is ongedaan gemaakt.'
        : 'Er was nog geen actie om ongedaan te maken.'
    };
  },

  finish: async ({ params }) => {
    finishSession(params.sessionId);

    const state = getScoreboardState(params.sessionId);

    if (state) {
      publishScoreboardState(params.sessionId, state);
    }

    throw redirect(303, `/final/${params.sessionId}`);
  }
};