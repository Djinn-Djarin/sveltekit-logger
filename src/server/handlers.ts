import type { RequestHandler } from '@sveltejs/kit';
import { getLogsSince, subscribeLogs, clearLogs, type ServerLogEntry } from './logStore.js';

export interface StreamHandlerOptions {
	/** Query param carrying the "since" cursor, e.g. `?since=42`. */
	sinceParam?: string;
	/** Heartbeat interval in ms. */
	pingMs?: number;
}

/**
 * Server-Sent Events handler for live server logs.
 * Replays buffered entries, then streams every new call. Point your generated
 * route's `GET` at this, e.g.:
 *
 *   export const GET = streamHandler();
 */
export function streamHandler(options: StreamHandlerOptions = {}): RequestHandler {
	const sinceParam = options.sinceParam ?? 'since';
	const pingMs = options.pingMs ?? 15_000;
	const encoder = new TextEncoder();

	return ({ url, request }) => {
		const lastEventId = request.headers.get('Last-Event-ID');
		const sinceValue = url.searchParams.get(sinceParam);
		const startId = lastEventId ? parseInt(lastEventId, 10) : sinceValue !== null ? parseInt(sinceValue, 10) : -1;

		let cleanup: (() => void) | null = null;

		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				let ping: ReturnType<typeof setInterval> | null = null;
				let unsubscribe: (() => void) | null = null;

				const send = (event: string, data: unknown, id?: number) => {
					try {
						const idStr = id !== undefined ? `id: ${id}\n` : '';
						controller.enqueue(encoder.encode(`${idStr}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
					} catch {
						/* stream closed */
					}
				};

				unsubscribe = subscribeLogs((log: ServerLogEntry) => {
					send('api-log', log, log.id);
				});

				if (startId >= 0) {
					for (const log of getLogsSince(startId)) {
						send('api-log', log, log.id);
					}
				}
				send('ready', { ok: true });

				ping = setInterval(() => {
					send('ping', { t: Date.now() });
				}, pingMs);

				cleanup = () => {
					if (ping) clearInterval(ping);
					if (unsubscribe) unsubscribe();
					try {
						controller.close();
					} catch {
						/* already closed */
					}
				};
			},
			cancel() {
				if (cleanup) {
					cleanup();
					cleanup = null;
				}
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no',
				'Access-Control-Allow-Origin': '*'
			}
		});
	};
}

/** POST handler that clears all buffered logs. */
export const clearHandler: RequestHandler = async () => {
	clearLogs();
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};