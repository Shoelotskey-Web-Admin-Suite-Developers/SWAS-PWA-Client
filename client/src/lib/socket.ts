// Centralized Socket.IO client singleton.
// Ensures only one connection is established across hooks/components.
// Hooks can import { getSocket } to access the shared instance.
import { io, Socket } from "socket.io-client";

// Resolve base URL with fallbacks for easier debugging
const RAW_URL: string | undefined = import.meta.env.VITE_API_BASE_URL;
const SOCKET_URL = (RAW_URL && RAW_URL.trim()) || (typeof window !== 'undefined' ? window.location.origin : "");

// Internal diagnostics state
let connectAttempts = 0;
let lastError: string | null = null;
let lastDisconnect: number | null = null;
let lastConnect: number | null = null;

let socket: Socket | null = null;
let initializing = false;
const pending: Array<(s: Socket) => void> = [];

function createSocket() {
	const s = io(SOCKET_URL, {
		transports: ["websocket", "polling"],
		withCredentials: true,
		reconnection: true,
		reconnectionAttempts: 10,
		reconnectionDelay: 1000,
	});

	s.on("connect", () => {
		lastConnect = Date.now();
		lastError = null;
		// eslint-disable-next-line no-console
		console.debug("[socket] connected", { id: s.id, url: SOCKET_URL });
	});
	s.on("disconnect", (reason) => {
		lastDisconnect = Date.now();
		// eslint-disable-next-line no-console
		console.debug("[socket] disconnected", { reason });
	});
	s.on("connect_error", (err: any) => {
		lastError = err?.message || String(err);
		connectAttempts += 1;
		// eslint-disable-next-line no-console
		console.warn("[socket] connect_error", { message: lastError, attempts: connectAttempts, url: SOCKET_URL });
	});
	s.io.on("reconnect_attempt", (n) => {
		connectAttempts = n;
		// eslint-disable-next-line no-console
		console.debug("[socket] reconnect_attempt", { attempt: n });
	});
	s.io.on("reconnect_failed", () => {
		// eslint-disable-next-line no-console
		console.error("[socket] reconnect_failed after", connectAttempts, "attempts");
	});
	s.on("error", (err: any) => {
		lastError = err?.message || String(err);
		// eslint-disable-next-line no-console
		console.error("[socket] error", lastError);
	});
	return s;
}

export function getSocket(): Socket {
	if (socket) return socket;
	if (!initializing) {
		initializing = true;
		socket = createSocket();
		// flush queued callbacks
		pending.splice(0).forEach((cb) => cb(socket!));
	}
	return socket!;
}

// Optional helper if some code wants async guarantee of connection.
export function onSocketReady(cb: (s: Socket) => void) {
	if (socket) return cb(socket);
	pending.push(cb);
	getSocket();
}

export function disconnectSocket() {
	if (socket) {
		socket.removeAllListeners();
		socket.disconnect();
		socket = null;
		initializing = false;
	}
}

export function getSocketDiagnostics() {
	return {
		url: SOCKET_URL,
		rawUrl: RAW_URL,
		connected: !!socket?.connected,
		id: socket?.id || null,
		attempts: connectAttempts,
		lastError,
		lastConnect,
		lastDisconnect,
	} as const;
}

export type { Socket };
