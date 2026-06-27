import type { ScoreboardState } from '$lib/types';

const encoder = new TextEncoder();

type Client = ReadableStreamDefaultController<Uint8Array>;

const clientsBySession = new Map<string, Set<Client>>();

export function sendSse(
  controller: Client,
  eventName: string,
  data: unknown
): void {
  controller.enqueue(
    encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`)
  );
}

export function subscribeToSession(
  sessionId: string,
  controller: Client
): () => void {
  let clients = clientsBySession.get(sessionId);

  if (!clients) {
    clients = new Set<Client>();
    clientsBySession.set(sessionId, clients);
  }

  clients.add(controller);

  return () => {
    clients?.delete(controller);

    if (clients?.size === 0) {
      clientsBySession.delete(sessionId);
    }
  };
}

export function publishScoreboardState(
  sessionId: string,
  state: ScoreboardState
): void {
  const clients = clientsBySession.get(sessionId);

  if (!clients) {
    return;
  }

  for (const client of clients) {
    try {
      sendSse(client, 'state', state);
    } catch {
      clients.delete(client);
    }
  }
}