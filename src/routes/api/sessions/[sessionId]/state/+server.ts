import { error, json } from '@sveltejs/kit';

import { getScoreboardState } from '$lib/server/db';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
  const state = getScoreboardState(params.sessionId);

  if (!state) {
    throw error(404, 'Sessie niet gevonden.');
  }

  return json(state);
};