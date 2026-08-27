import { writable, derived } from 'svelte/store';
import { clientConfig } from './config.js';

export interface LogEntry {
	timestamp: string;
	message: string;
	details?: string;
	type: 'info' | 'success' | 'error' | 'user';
	expanded?: boolean; // UI state
	tag?: string;
	method?: string;
	url?: string;
	status?: number | string;
	duration_ms?: number;
	initiator?: string;
	request_body?: unknown;
	response_body?: unknown;
	cached?: boolean;
}

export interface LogMeta {
	tag?: string;
	method?: string;
	url?: string;
	status?: number | string;
	duration_ms?: number;
	initiator?: string;
	request_body?: unknown;
	response_body?: unknown;
	cached?: boolean;
}

const SAVED_LIMIT_KEY = 'li-saved-limit';

export function getSavedRecordsLimit(): number {
	if (typeof window !== 'undefined') {
		const val = localStorage.getItem(SAVED_LIMIT_KEY);
		if (val) {
			const parsed = parseInt(val, 10);
			if (!isNaN(parsed) && parsed > 0) return parsed;
		}
	}
	return 10;
}

export function setSavedRecordsLimit(limit: number): void {
	if (typeof window !== 'undefined') {
		localStorage.setItem(SAVED_LIMIT_KEY, String(limit));
	}
}

const createTerminalStore = () => {
	let initial: LogEntry[] = [];
	if (typeof window !== 'undefined' && clientConfig.persist) {
		try {
			const stored = localStorage.getItem(clientConfig.storageKey);
			if (stored) initial = JSON.parse(stored);
		} catch {
			/* ignore */
		}
	}

	const { subscribe, update, set } = writable<LogEntry[]>(initial);

	// --- Infinite render-loop / burst detection ---------------------------
	// An infinite render loop (e.g. a $effect or $derived that writes reactive
	// state every run, or a fetch inside a loop) floods the store with entries
	// within a short window. If we see more than BURST_THRESHOLD entries inside
	// BURST_WINDOW_MS, emit a single warning per window.
	const BURST_WINDOW_MS = 1000;
	const BURST_THRESHOLD = 60;
	let burstTimestamps: number[] = [];
	let burstWarnedAt = 0;

	function detectRenderLoop(message: string, initiator?: string) {
		const now = Date.now();
		const cutoff = now - BURST_WINDOW_MS;

		burstTimestamps.push(now);
		let i = 0;
		while (i < burstTimestamps.length && burstTimestamps[i] < cutoff) i++;
		if (i > 0) burstTimestamps = burstTimestamps.slice(i);

		if (burstTimestamps.length >= BURST_THRESHOLD && now - burstWarnedAt >= BURST_WINDOW_MS) {
			burstWarnedAt = now;
			burstTimestamps = []; // reset window so the flood itself doesn't re-trigger

			const details =
				`Detected ${BURST_THRESHOLD}+ log entries within ${BURST_WINDOW_MS}ms.\n` +
				`Most recent: ${message.slice(0, 200)}\n` +
				`Initiator: ${initiator || 'unknown'}\n\n` +
				`This usually indicates an infinite render loop — check for ` +
				`$effect / $derived blocks that write reactive state on every run, ` +
				`or an API/fetch call inside a reactive loop.`;

			addEntry({
				timestamp: new Date().toLocaleTimeString(),
				message: '[Render Loop] Possible infinite render loop detected',
				details,
				type: 'error',
				expanded: false,
				tag: 'render loop'
			});
		}
	}

	function persist(logs: LogEntry[]) {
		if (typeof window !== 'undefined' && clientConfig.persist) {
			try {
				const limit = getSavedRecordsLimit();
				const slim = logs.slice(-limit).map(({ request_body, response_body, ...rest }) => rest);
				localStorage.setItem(clientConfig.storageKey, JSON.stringify(slim));
			} catch {
				/* ignore */
			}
		}
	}

	function addEntry(entry: LogEntry) {
		update((logs) => {
			const next = [...logs.slice(-199), entry]; // keep last 200 logs
			persist(next);
			return next;
		});
		if (entry.type === 'error') {
			unreadErrorCount.update((n) => n + 1);
		}
	}

	return {
		subscribe,
		update: (fn: (logs: LogEntry[]) => LogEntry[]) => {
			update((logs) => {
				const next = fn(logs);
				persist(next);
				return next;
			});
		},
		rePersist: () => {
			update((logs) => {
				persist(logs);
				return logs;
			});
		},
		addLog: (message: string, type: 'info' | 'success' | 'error' | 'user' = 'info', details?: string, meta?: LogMeta) => {
			detectRenderLoop(message, meta?.initiator);
			addEntry({
				timestamp: new Date().toLocaleTimeString(),
				message,
				details,
				type,
				expanded: false,
				...meta
			});
		},
		clear: () => {
			set([]);
			persist([]);
			unreadErrorCount.set(0);
			if (typeof window !== 'undefined') {
				fetch(`${clientConfig.basePath}/clear`, { method: 'POST' }).catch(() => {});
			}
		}
	};
};

export const terminalStore = createTerminalStore();

/** Count of error logs that arrived since the terminal was last collapsed. */
export const unreadErrorCount = writable(0);

export function markErrorsRead() {
	unreadErrorCount.set(0);
}

/** Global store controlling the collapsed state of the inspector UI. */
export const isTerminalCollapsed = writable(true);

/**
 * Hijack console methods + window errors and unhandled rejections so they are
 * captured into the log store automatically — no per-call code needed.
 */
export function initGlobalErrorHandling() {
	if (typeof window === 'undefined') return;

	window.addEventListener('error', (event) => {
		const msg = event.message;
		const details = `File: ${event.filename}\nLine: ${event.lineno}\nColumn: ${event.colno}\n\nStack:\n${event.error?.stack || 'N/A'}`;
		terminalStore.addLog(`[Uncaught Error] ${msg}`, 'error', details);
	});

	window.addEventListener('unhandledrejection', (event) => {
		const reason = event.reason;
		const msg = reason instanceof Error ? reason.message : String(reason);
		const details = reason instanceof Error ? reason.stack || '' : '';
		terminalStore.addLog(`[Unhandled Promise] ${msg}`, 'error', details);
	});

	let isLogging = false;
	const methods: ('log' | 'warn' | 'error' | 'info')[] = ['log', 'warn', 'error', 'info'];
	methods.forEach((method) => {
		const original = console[method];
		console[method] = function (...args) {
			original.apply(console, args);

			if (isLogging) return;
			isLogging = true;

			try {
				const err = new Error();
				const stack = err.stack?.split('\n') || [];
				const caller = stack[2] || '';
				const location = caller.trim().replace(/^at\s+/, '');

				const msg = args
					.map((a) => {
						if (typeof a === 'object') {
							try {
								return JSON.stringify(a);
							} catch {
								return String(a);
							}
						}
						return String(a);
					})
					.join(' ');
				const type: 'info' | 'success' | 'error' | 'user' = method === 'error' ? 'error' : 'info';

				terminalStore.addLog(`[console.${method}] ${msg}`, type, location ? `Location: ${location}` : undefined);
			} catch {
				/* ignore errors in hijacking */
			} finally {
				isLogging = false;
			}
		};
	});
}

export const pendingCount = derived(terminalStore, $logs =>
	$logs.filter(l => {
		if (!(l as any).pending) return false;
		if (l.status !== undefined && l.status !== null && l.status !== 'Pending') {
			return false;
		}
		return true;
	}).length
);