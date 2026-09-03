import { pushLog, capBody, captureServerInitiator, isBinaryContent } from './logStore.js';

export interface FetchInterceptorOptions {
	/** Decide whether a given fetch should be logged. Default: everything except the inspector's own endpoints. */
	shouldLog?: (input: RequestInfo | URL, init?: RequestInit) => boolean;
}

/**
 * Install a global `fetch` wrapper on the server so EVERY outbound call is
 * captured automatically with initiator (file:line), duration and bodies.
 * This removes the need for any manual per-call logging code.
 *
 * Returns an uninstall function. Safe to call multiple times (no-op on repeat).
 */
export function installServerFetchInterceptor(options: FetchInterceptorOptions = {}): () => void {
	if (typeof globalThis.fetch !== 'function') return () => {};
	const g = globalThis as unknown as { __logInspectorFetchInstalled?: boolean };
	if (g.__logInspectorFetchInstalled) return () => {};
	g.__logInspectorFetchInstalled = true;

	const originalFetch = globalThis.fetch.bind(globalThis);
	const shouldLog = options.shouldLog ?? ((input: RequestInfo | URL) => !String(input).includes('__log-inspector'));

	const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const isRequest = typeof Request !== 'undefined' && input instanceof Request;
		const url = isRequest ? input.url : String(input);
		const method = (isRequest ? input.method : init?.method || 'GET').toUpperCase();
		const logIt = shouldLog(input, init);

		let requestBody: unknown;
		if (logIt && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
			try {
				if (isRequest) {
					const text = await input.clone().text();
					try {
						requestBody = JSON.parse(text);
					} catch {
						requestBody = text;
					}
				} else if (typeof init?.body === 'string') {
					try {
						requestBody = JSON.parse(init.body);
					} catch {
						requestBody = init.body;
					}
				}
			} catch {
				/* body not readable */
			}
		}

		const initiator = captureServerInitiator();
		const t0 = performance.now();
		let res: Response;
		try {
			res = await originalFetch(input, init);
		} catch (err) {
			if (logIt) {
				pushLog({
					method,
					url,
					success: false,
					status: null,
					duration_ms: Math.round(performance.now() - t0),
					error: (err as Error)?.message || String(err),
					initiator,
					request_body: capBody(requestBody)
				});
			}
			throw err;
		}

		const duration_ms = Math.round(performance.now() - t0);
		let responseBody: unknown;
		if (logIt) {
			const contentType = res.headers.get('content-type') || '';
			const contentEncoding = res.headers.get('content-encoding') || '';
			const isCompressed = /\b(gzip|br|deflate|zstd|compress)\b/i.test(contentEncoding);
			if (!contentType.includes('text/event-stream') && !isCompressed) {
				try {
					const clone = res.clone();
					const text = await clone.text();
					if (text) {
						if (isBinaryContent(text)) {
							responseBody = `[Compressed: ${contentEncoding || 'binary'}]`;
						} else {
							try {
								responseBody = JSON.parse(text);
							} catch {
								responseBody = text;
							}
						}
					}
				} catch {
					/* body not readable */
				}
			} else if (isCompressed) {
				responseBody = `[Compressed: ${contentEncoding}]`;
			}
			pushLog({
				method,
				url,
				success: res.ok,
				status: res.status,
				duration_ms,
				initiator,
				request_body: capBody(requestBody),
				response_body: capBody(responseBody),
				cached: duration_ms === 0
			});
		}
		return res;
	};

	globalThis.fetch = wrapped as typeof fetch;
	return () => {
		if (globalThis.fetch === (wrapped as unknown)) {
			globalThis.fetch = originalFetch;
		}
	};
}