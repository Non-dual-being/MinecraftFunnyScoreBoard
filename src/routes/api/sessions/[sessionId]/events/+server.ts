import { error } from '@sveltejs/kit';

import { getScoreboardState } from '$lib/server/db';
import { sendSse, subscribeToSession } from '$lib/server/events';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
  const sessionId = params.sessionId;
  const initialState = getScoreboardState(sessionId);

  if (!initialState) {
    throw error(404, 'Sessie niet gevonden.');
  }

  let cleanup: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      cleanup = subscribeToSession(sessionId, controller);

      sendSse(controller, 'state', initialState);

      // Houd de verbinding levend achter proxies zoals Nginx.
      heartbeat = setInterval(() => {
        sendSse(controller, 'ping', {
          at: new Date().toISOString()
        });
      }, 25_000);
    },

    cancel() {
      if (heartbeat) {
        clearInterval(heartbeat);
      }

      cleanup?.();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
};