import { error } from '@sveltejs/kit';

import { getScoreboardState } from '$lib/server/db';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
  const state = getScoreboardState(params.sessionId);

  if (!state) {
    throw error(404, 'Sessie niet gevonden.');
  }

  return {
    state
  };
};