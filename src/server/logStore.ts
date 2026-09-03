import { AsyncLocalStorage } from 'node:async_hooks';

/** A single captured request/fetch log entry. */
export interface ServerLogEntry {
	id: number;
	timestamp: string; // ISO timestamp
	method: string;
	url: string;
	success: boolean;
	status: number | null;
	duration_ms: number | null;
	error?: string;
	details?: string;
	/** Which file:line / function initiated the call. */
	initiator?: string;
	/** True when the response was served from a cache (0ms). */
	cached?: boolean;
	/** Parsed request body (JSON) sent to the target. */
	request_body?: unknown;
	/** Parsed response body (JSON) returned by the target. */
	response_body?: unknown;
}

/** Max serialized size (chars) for request/response bodies kept in a log entry. */
export const MAX_BODY_CHARS = 100_000;

/** Truncate a body so oversized payloads don't bloat memory/SSE. */
export function capBody(body: unknown, maxChars = MAX_BODY_CHARS): unknown {
	if (body === undefined || body === null) return body;
	if (typeof body === 'string') return body.length > maxChars ? body.slice(0, maxChars) + '\n… [truncated]' : body;
	try {
		const str = JSON.stringify(body);
		if (str.length <= maxChars) return body;
		return str.slice(0, maxChars) + '\n… [truncated]';
	} catch {
		return String(body);
	}
}

/** Detect binary/compressed content by checking magic bytes in the raw text. */
export function isBinaryContent(text: string): boolean {
	if (!text || text.length < 2) return false;
	const first4 = text.charCodeAt(0) * 256 + text.charCodeAt(1);
	if (first4 === 0x1f8b) return true; // gzip
	if (first4 === 0x7801 || first4 === 0x789c || first4 === 0x78da) return true; // zlib/deflate
	if (text.length > 10 && /[\x00-\x08\x0e-\x1f]/.test(text.slice(0, 20))) return true; // brotli / other
	return false;
}

const MAX_LOGS = 500;

/** AsyncLocalStorage carrying the initiating file/function (X-Initiator header). */
const initiatorAls = new AsyncLocalStorage<string>();

export function runWithInitiator(initiator: string | null | undefined, fn: () => unknown): unknown {
	return initiatorAls.run(initiator || '', fn);
}

export function getRequestInitiator(): string {
	return initiatorAls.getStore() || '';
}

/**
 * Best-effort name of the calling server module/function, e.g. `engine.call (engine.ts:45)`.
 * Walks the stack, skipping internal frames.
 */
export function captureServerInitiator(): string {
	try {
		const stack = new Error().stack || '';
		for (const line of stack.split('\n').slice(1)) {
			const raw = line.trim().replace(/^at\s+/, '');
			if (!raw) continue;
			const paren = raw.match(/\(([^)]+)\)/);
			const loc = paren ? paren[1] : raw;
			const clean = loc.replace(/^file:\/\//, '');
			const m = clean.match(/([^/:]+):(\d+):\d+$/);
			if (!m) continue;
			if (
				m[1].includes('logStore') ||
				m[1].includes('fetchInterceptor') ||
				m[1].includes('node_modules') ||
				m[1].startsWith('node:')
			) {
				continue;
			}
			const fn = paren ? (raw.split(' ')[0] ?? '') : '';
			return fn && fn !== '<anonymous>' ? `${fn} (${m[1]}:${m[2]})` : `${m[1]}:${m[2]}`;
		}
	} catch {
		/* ignore */
	}
	return '';
}

const logs: ServerLogEntry[] = [];
let seq = 0;
type Listener = (log: ServerLogEntry) => void;
const listeners = new Set<Listener>();

// --- Infinite render-loop / burst detection -------------------------------
// A runaway loop on the server (e.g. a fetch inside a reactive loop or a
// recursively re-queued job) floods pushLog within a short window. Emit a
// single warning entry per window pointing at the hottest URL.
const BURST_WINDOW_MS = 1000;
const BURST_THRESHOLD = 30;
let burstTimestamps: number[] = [];
let burstWarnedAt = 0;
let emittingBurstWarning = false;

function detectServerBurst(url: string, initiator?: string) {
	if (emittingBurstWarning) return;
	const now = Date.now();
	const cutoff = now - BURST_WINDOW_MS;

	burstTimestamps.push(now);
	let i = 0;
	while (i < burstTimestamps.length && burstTimestamps[i] < cutoff) i++;
	if (i > 0) burstTimestamps = burstTimestamps.slice(i);

	if (burstTimestamps.length >= BURST_THRESHOLD && now - burstWarnedAt >= BURST_WINDOW_MS) {
		burstWarnedAt = now;
		burstTimestamps = []; // reset window so the flood itself doesn't re-trigger

		emittingBurstWarning = true;
		try {
			const entry: ServerLogEntry = {
				id: ++seq,
				timestamp: new Date().toISOString(),
				method: '-',
				url,
				success: false,
				status: null,
				duration_ms: null,
				initiator: initiator || 'server',
				error: 'Possible infinite render loop detected',
				details:
					`Detected ${BURST_THRESHOLD}+ server log entries within ${BURST_WINDOW_MS}ms.\n` +
					`Hottest endpoint: ${url}\n` +
					`Initiator: ${initiator || 'unknown'}\n\n` +
					`A runaway loop is hammering the server — check for fetches inside ` +
					`$effect / $derived blocks, reactive subscriptions, or recursively ` +
					`re-queued jobs.`
			};
			logs.push(entry);
			if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);
			for (const listener of listeners) {
				try {
					listener(entry);
				} catch {
					/* ignore listener errors */
				}
			}
		} finally {
			emittingBurstWarning = false;
		}
	}
}

/** Record an API/fetch call outcome and notify live SSE subscribers. */
export function pushLog(entry: Omit<ServerLogEntry, 'id' | 'timestamp'>): ServerLogEntry {
	detectServerBurst(entry.url || '', entry.initiator);
	const log: ServerLogEntry = { id: ++seq, timestamp: new Date().toISOString(), ...entry };
	log.initiator = log.initiator || getRequestInitiator() || captureServerInitiator() || 'Server';
	logs.push(log);
	if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);
	for (const listener of listeners) {
		try {
			listener(log);
		} catch {
			/* ignore listener errors */
		}
	}
	return log;
}

/** Clear all buffered logs. */
export function clearLogs() {
	logs.length = 0;
}

/** Number of buffered entries (for UI badges). */
export function getLogCount(): number {
	return logs.length;
}

/** Entries with id > startId (replay on client reconnect). */
export function getLogsSince(startId = 0): ServerLogEntry[] {
	return logs.filter((l) => l.id > startId);
}

/** Subscribe to live log entries; returns an unsubscribe function. */
export function subscribeLogs(listener: Listener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}