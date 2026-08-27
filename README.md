# sveltekit-logger

A unified, zero-code live log inspector for SvelteKit. Drop in the plugin, and every API call, server-side fetch, console log, and database operation is captured with its method, payload, status, duration, and a `file:line` initiator. 

Everything is seamlessly streamed to an always-on, rich inspector panel in the corner of your app.

## Features

- **Browser Console Capture**: Captures and displays all browser console output (`log`, `warn`, `error`, `info`), alongside uncaught errors and unhandled promise rejections.
- **Client & Server Network Tracing**: Intercepts client-side and server-side `fetch` requests to visualize API calls, duration, HTTP status, and full request/response JSON payloads. Server logs are streamed via Server-Sent Events (SSE).
- **Server Console Streaming**: Captures server-side Node.js console logs and streams them directly into the browser inspector, eliminating the need to check your backend terminal.
- **IndexedDB Monitoring**: Monitors browser IndexedDB operations, logging database connections and record mutations (`add`, `put`, `delete`, `clear`).
- **Stealth Debugging**: Provides a dedicated `inspectLog()` function (for both client and server) to send debug messages exclusively to the inspector UI without printing to native consoles.
- **Initiator Tracking**: Automatically traces and displays the exact initiator (source file name and line number) that triggered a log, network request, or DB action.
- **Runaway Loop Detection**: Detects and warns you about potential infinite render loops or rapid network request bursts (e.g. from runaway `$effect` blocks).
- **Rich Interactive UI**: Features a resizable split-pane interface with sortable columns, JSON syntax highlighting, Tabbed Request/Response views, heavy payload size warnings (e.g., >50KB alerts), pending animation states, and one-click cURL command generation.
- **SSR Cache Detection**: Identifies and highlights network responses that are served directly from SvelteKit's SSR cache.
- **Persistent State**: Persists captured logs across page reloads using local storage with customizable retention limits.

## Installation

```bash
npm i -D sveltekit-logger
```

## Setup

### 1. Vite Configuration
In `vite.config.ts`, the plugin **must** be listed **before** `sveltekit()`:

```ts
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { logInspector } from 'sveltekit-logger/plugin';

export default defineConfig({
	plugins: [logInspector(), sveltekit()]
});
```

*(On your first `npm run dev` or build, the plugin will automatically generate the required SSE endpoint routes and wire up `src/hooks.server.ts` for you).*

### 2. Client Initialization & UI Component
In your root `src/routes/+layout.svelte`, initialize the client logger inside an `$effect` and mount the panel:

```svelte
<script lang="ts">
	import { initClientLogging } from 'sveltekit-logger/client';
	import LogInspector from 'sveltekit-logger';

	let { children } = $props();

	$effect(() => {
		// Hijacks console, fetch, IDB, and connects to the Server SSE stream
		const cleanup = initClientLogging();
		return cleanup;
	});
</script>

{@render children()}

<LogInspector />
```

## Stealth Logging: `inspectLog`

Sometimes you want to log data to the inspector UI to debug complex objects, but you don't want to clutter your actual browser or server terminal output. You can use `inspectLog`:

**Client-side:**
```ts
import { inspectLog } from 'sveltekit-logger/client';

inspectLog('User authenticated', 'success', { userId: 123 });
```

**Server-side:**
```ts
import { inspectLog } from 'sveltekit-logger/server';

export async function load() {
    inspectLog('Loaded sensitive DB query', 'info', { rows: 400 });
    // Streams directly to the browser UI, bypassing the backend terminal!
}
```

## Manual Composition (hooks.server.ts)

If your app already has an existing `src/hooks.server.ts`, the auto-generator will leave it untouched and emit a warning. You must compose the handlers manually:

```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { handle as logHandle, handleError } from 'sveltekit-logger/server';
import { yourExistingHandle } from './my-handles';

export const handle = sequence(yourExistingHandle, logHandle);
export { handleError };
```

## Theming

The `LogInspector` theme is precompiled using Tailwind CSS. You don't need Tailwind installed in your project, but you can override the UI colors globally by defining these CSS variables in your `app.css`:

```css
:root {
	--color-theme-bg: #0b0f14;
	--color-theme-surface: #12181f;
	--color-theme-panel: #16202a;
	--color-theme-border: #22303d;
	--color-theme-text-primary: #e6edf3;
	--color-theme-text-secondary: #9fb0c1;
	--color-theme-text-muted: #6a7a8b;
	--color-theme-accent: #4ea1ff;
	--color-theme-danger: #ff5f56;
	--color-theme-success: #3ecf8e;
	--color-theme-warning: #f5a623;
}
```

## Requirements

- SvelteKit 2.x
- Vite 5+
- Svelte 5

## License

MIT