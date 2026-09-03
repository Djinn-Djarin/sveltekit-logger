import type { Handle } from '@sveltejs/kit';
import { pushLog, capBody, isBinaryContent } from './logStore.js';

export interface LogHandleOptions {
	/** URL prefixes that must NOT be logged (the inspector's own endpoints). */
	skipPaths?: string[];
	/** Only requests under this prefix are logged. */
	apiPrefix?: string;
	/** Also log non-API (page) requests. */
	logPages?: boolean;
	/** Rewrite 4xx/5xx API responses to structured JSON (never HTML). */
	errorToJson?: boolean;
}

function extractJsonText(text: string): unknown {
	if (!text) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

function sanitizeErrorMsg(text: string, fallback: string): string {
	if (/<!doctype|<html/i.test(text)) return fallback;
	return text;
}

/** `pathname + search`, tolerating prerender where `url.search` is disabled. */
function requestUrl(url: URL): string {
	const { pathname } = url;
	let search = '';
	try {
		search = url.search;
	} catch {
		/* url.search throws on prerendered pages */
	}
	return pathname + search;
}

/**
 * Create a composable SvelteKit `handle` that auto-logs every matching request
 * with method, url, status, duration, initiator and bodies. Use with
 * `sequence()` from `@sveltejs/kit/hooks` to keep an app's existing handle:
 *
 *   import { sequence } from '@sveltejs/kit/hooks';
 *   import { createLogHandle } from 'sveltekit-logger/server';
 *   export const handle = sequence(myHandle, createLogHandle());
 */
export function createLogHandle(options: LogHandleOptions = {}): Handle {
	const skipPaths = options.skipPaths ?? ['/__log-inspector'];
	const apiPrefix = options.apiPrefix ?? '/api/';
	const errorToJson = options.errorToJson !== false;

	return async ({ event, resolve }) => {
		const url = requestUrl(event.url);
		if (skipPaths.some((p) => url.startsWith(p))) {
			return resolve(event);
		}

		const isApi = url.startsWith(apiPrefix);
		if (!isApi && !options.logPages) {
			return resolve(event);
		}

		const t0 = performance.now();
		const method = event.request.method;
		const headerInitiator = event.request.headers.get('X-Initiator') || '';
		const initiator = headerInitiator || (event.route?.id ? `src/routes/${event.route.id.replace(/^\//, '')}/+server.ts` : 'Server');

		// Capture request body for POST/PUT/PATCH/DELETE
		let requestBody: unknown = undefined;
		if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
			try {
				const reqClone = event.request.clone();
				requestBody = extractJsonText(await reqClone.text());
			} catch {
				/* ignore clone/read error */
			}
		}

		const response = await resolve(event);
		const duration_ms = Math.round(performance.now() - t0);

		// Capture response body (skip streaming or compressed responses to avoid hanging/gibberish)
		let responseBody: unknown = undefined;
		const responseContentType = response.headers.get('content-type') || '';
		const contentEncoding = response.headers.get('content-encoding') || '';
		const isStream = responseContentType.includes('text/event-stream');
		const isCompressed = /\b(gzip|br|deflate|zstd|compress)\b/i.test(contentEncoding);
		if (!isStream && !isCompressed) {
			try {
				const resClone = response.clone();
				const text = await resClone.text();
				if (isBinaryContent(text)) {
					responseBody = `[Compressed: ${contentEncoding || 'binary'}]`;
				} else {
					responseBody = extractJsonText(text);
				}
			} catch {
				/* ignore clone/read error */
			}
		} else if (isCompressed) {
			responseBody = `[Compressed: ${contentEncoding}]`;
		}

		// Force all error responses to detailed JSON (never HTML)
		let finalResponse = response;
		if (errorToJson && (response.status >= 400 || !response.ok)) {
			let errorMsg = response.status === 404 ? `Endpoint not found: ${event.url.pathname}` : 'Internal Server Error';
			let detailMsg: string | undefined = undefined;

			if (typeof responseBody === 'object' && responseBody !== null) {
				const rb = responseBody as any;
				errorMsg = rb.error || rb.message || rb.detail || errorMsg;
				detailMsg = rb.detail || rb.message;
			} else if (typeof responseBody === 'string' && responseBody.trim()) {
				errorMsg = sanitizeErrorMsg(responseBody.trim(), response.status === 404 ? `Endpoint not found: ${event.url.pathname}` : `Server error (${response.status}) on ${event.url.pathname}`);
			}

			if (typeof errorMsg === 'string' && /<!doctype|<html/i.test(errorMsg)) {
				errorMsg = response.status === 404 ? `Endpoint not found: ${event.url.pathname}` : `Server error (${response.status}) on ${event.url.pathname}`;
			}

			const detailedJson = {
				success: false,
				status: response.status,
				error: errorMsg,
				path: event.url.pathname,
				method,
				detail: detailMsg || undefined
			};

			responseBody = detailedJson;
			finalResponse = new Response(JSON.stringify(detailedJson, null, 2), {
				status: response.status,
				headers: { 'Content-Type': 'application/json; charset=utf-8' }
			});
		}

		pushLog({
			method,
			url,
			success: finalResponse.ok,
			status: finalResponse.status,
			duration_ms,
			initiator,
			request_body: capBody(requestBody),
			response_body: capBody(responseBody),
			cached: duration_ms === 0
		});

		return finalResponse;
	};
}

/** Ready-to-use default handle (logs `/api/*`, rewrites errors to JSON). */
export const handle: Handle = createLogHandle();

/** Formats errors into a clean message and surfaces them to the console. */
export const handleError = ({
	error,
	event,
	status,
	message
}: {
	error: any;
	event: any;
	status: number;
	message: string;
}) => {
	const err = error as any;
	const errorMessage = err?.message || err?.body?.message || message || 'An unexpected error occurred.';
	if (status !== 404) {
		console.error(`[LogInspector ${status || ''}] ${event.url.pathname}:`, errorMessage);
	}
	return { message: errorMessage };
};