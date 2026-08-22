/**
 * Socket.IO lifecycle. One connection for the whole app.
 *
 * Two things that are easy to get wrong here:
 *   1. The socket lives at the host ROOT, not the `/api` REST base. Socket.IO serves
 *      itself at `/socket.io/`. Pointing it at `/api` fails the handshake.
 *   2. Nothing is replayed after a reconnect. A message sent while the tab was
 *      disconnected is simply lost to this client, so `onReconnect` exists to let
 *      callers refetch and close the gap. See docs/api.md.
 */

import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "https://frontend-task-chatapp.onrender.com";

let socket: Socket | null = null;
let currentToken: string | null = null;

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export function getSocket(token: string): Socket {
  // A token change means a different user — never reuse the old connection.
  if (socket && currentToken !== token) closeSocket();

  if (!socket) {
    currentToken = token;
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
  }

  return socket;
}

export function closeSocket() {
  socket?.removeAllListeners();
  socket?.close();
  socket = null;
  currentToken = null;
}
