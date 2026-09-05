import type { WebSocket } from "ws";
import { WebSocket as WS } from "ws";

// Shared WS fan-out so HTTP routes and queue workers can push the same
// real-time events without importing the giant routes module.
const wsClients = new Set<WebSocket>();

export function addWsClient(client: WebSocket) {
  wsClients.add(client);
}

export function removeWsClient(client: WebSocket) {
  wsClients.delete(client);
}

export function broadcast(event: string, data: unknown) {
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  Array.from(wsClients).forEach((client) => {
    if (client.readyState === WS.OPEN) {
      client.send(message);
    }
  });
}
