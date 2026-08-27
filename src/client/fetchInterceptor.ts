import { captureInitiator } from './captureInitiator.js';

export interface ClientFetchInterceptorOptions {
	/** Only add the initiator header to same-origin requests (avoids CORS preflights). */
	sameOriginOnly?: boolean;
	/**
	 * Also log calls made by the browser directly to external servers
	 * (e.g. your backend API). The SvelteKit handle already logs same-origin
	 * `/api/*` calls, so those are never double-logged here.
	 */
	logExternal?: boolean;
}

/**
 * Wrap the browser `fetch` so the calling file:line is captured automatically
 * and sent to the server via the `X-Initiator` header. The SvelteKit handle
 * picks it up and records it with the request — no custom client needed.
 *
 * Optionally logs direct-to-external-server calls into the client store.
 */
export function installClientFetchInterceptor(options: ClientFetchInterceptorOptions = {}): () => void {
	if (typeof window === 'undefined' || typeof globalThis.fetch !== 'function') return () => {};
	const g = globalThis as unknown as { __logInspectorClientFetchInstalled?: boolean };
	if (g.__logInspectorClientFetchInstalled) return () => {};
	g.__logInspectorClientFetchInstalled = true;

	const sameOriginOnly = options.sameOriginOnly !== false;
	const logExternal = options.logExternal === true;
	const originalFetch = globalThis.fetch.bind(globalThis);

	const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		let requestInit = init;

		try {
			let isSameOrigin = true;
			if (sameOriginOnly) {
				try {
					isSameOrigin = new URL(url).origin === window.location.origin;
				} catch {
					isSameOrigin = false;
				}
			}

			if (isSameOrigin) {
				const initiator = captureInitiator();
				const headers = new Headers(init?.headers);
				if (!headers.has('X-Initiator')) headers.set('X-Initiator', initiator);
				requestInit = { ...init, headers };
			} else if (logExternal) {
				const initiator = captureInitiator();
				const { terminalStore } = await import('./store.js');
				const method = (requestInit?.method || (typeof input === 'string' ? 'GET' : 'GET')).toUpperCase();
				const t0 = performance.now();
				try {
					const res = await originalFetch(input, requestInit);
					const duration_ms = Math.round(performance.now() - t0);
					terminalStore.addLog(`[API] ${method} ${url} — ${res.ok ? 'success' : 'failed'} (HTTP ${res.status} · ${duration_ms}ms)`, res.ok ? 'success' : 'error', undefined, {
						tag: 'api client',
						method,
						url,
						status: res.status,
						duration_ms,
						initiator
					});
					return res;
				} catch (err) {
					const duration_ms = Math.round(performance.now() - t0);
					terminalStore.addLog(`[API] ${method} ${url} — failed (${(err as Error)?.message || 'network error'})`, 'error', undefined, {
						tag: 'api client',
						method,
						url,
						status: 0,
						duration_ms,
						initiator
					});
					throw err;
				}
			}
		} catch {
			/* if header injection fails, fall through to plain fetch */
		}

		return originalFetch(input, requestInit);
	};

	globalThis.fetch = wrapped as typeof fetch;
	return () => {
		if (globalThis.fetch === (wrapped as unknown)) {
			globalThis.fetch = originalFetch;
		}
	};
}