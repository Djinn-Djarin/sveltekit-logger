import type { Plugin } from 'vite';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface LogInspectorPluginOptions {
	/** Route prefix under `src/routes` (no leading/trailing slashes). Default `__log-inspector`. */
	basePath?: string;
	/** Path to the app's `routes` directory, relative to the project root. Default `src/routes`. */
	routesDir?: string;
	/** Generate `src/hooks.server.ts` when missing so logging is wired automatically. Default true. */
	autoCreateHooks?: boolean;
	/** Options forwarded to the generated composable handle. */
	handle?: {
		skipPaths?: string[];
		apiPrefix?: string;
		logPages?: boolean;
		errorToJson?: boolean;
	};
}

const PKG = 'sveltekit-logger';

function writeIfMissing(file: string, content: string, log: (msg: string) => void): void {
	if (existsSync(file)) return;
	writeFileSync(file, content, 'utf8');
	log(`generated ${file.replace(process.cwd(), '.')}`);
}

/**
 * Zero-code SvelteKit wiring for the log inspector:
 *  - generates the SSE stream + clear routes under `{routesDir}/{basePath}/`
 *  - creates `src/hooks.server.ts` (if missing) so `/api/*` calls are logged
 *
 * The `LogInspector` component is NOT auto-mounted — add it yourself to your
 * root `+layout.svelte`:
 *
 *   import LogInspector from 'sveltekit-logger/components';
 *
 *   <LogInspector />
 *
 * Add this plugin to `vite.config.ts` BEFORE `sveltekit()`:
 *
 *   import { logInspector } from 'sveltekit-logger/plugin';
 *   import { sveltekit } from '@sveltejs/kit/vite';
 *   export default defineConfig({ plugins: [logInspector(), sveltekit()] });
 */
export function logInspector(options: LogInspectorPluginOptions = {}): Plugin {
	const basePath = (options.basePath ?? '__log-inspector').replace(/^\/+|\/+$/g, '');
	let root = process.cwd();

	const handleOpts = options.handle ?? {};

	function ensureRoutes(log: (msg: string) => void) {
		const routesDir = join(root, options.routesDir ?? 'src/routes');
		const baseDir = join(routesDir, basePath);
		mkdirSync(join(baseDir, 'stream'), { recursive: true });
		mkdirSync(join(baseDir, 'clear'), { recursive: true });

		writeIfMissing(
			join(baseDir, 'stream', '+server.ts'),
			`import { streamHandler } from '${PKG}/server';\n\nexport const GET = streamHandler();\n`,
			log
		);
		writeIfMissing(
			join(baseDir, 'clear', '+server.ts'),
			`import { clearHandler } from '${PKG}/server';\n\nexport const POST = clearHandler;\n`,
			log
		);
	}

	function ensureHooks(log: (msg: string) => void, warn: (msg: string) => void) {
		const hooksFile = join(root, 'src', 'hooks.server.ts');
		if (existsSync(hooksFile)) {
			const existing = readFileSync(hooksFile, 'utf8');
			if (!existing.includes(PKG)) {
				warn(
					`[log-inspector] ${'src/hooks.server.ts'} already exists and is not composed with ${PKG}. ` +
						`Wrap it manually once:\n` +
						`  import { sequence } from '@sveltejs/kit/hooks';\n` +
						`  import { handle as logHandle } from '${PKG}/server';\n` +
						`  export const handle = sequence(yourHandle, logHandle);`
				);
			}
			return;
		}

		const skipPaths = handleOpts.skipPaths ?? [`/${basePath}`];
		const content = [
			`import { createLogHandle, handleError } from '${PKG}/server';`,
			'',
			`export const handle = createLogHandle(${JSON.stringify({ ...handleOpts, skipPaths })});`,
			'export { handleError };',
			''
		].join('\n');
		writeFileSync(hooksFile, content, 'utf8');
		log(`[log-inspector] generated src/hooks.server.ts`);
	}

	return {
		name: 'sveltekit-logger',
		// Runs before SvelteKit's `vite-plugin-sveltekit-setup`, whose config hook
		// is `config: { order: 'pre', ... }` and calls `sync.all()` — it captures
		// the route manifest the build compiles from. Hook-level `order: 'pre'`
		// matters (not plugin `enforce`), and among pre hooks plugin-array order
		// wins, so this must be listed before `sveltekit()` in vite.config.ts.
		config: {
			order: 'pre',
			handler(config) {
				if (config.mode === 'production') return;
				// Generate files here so they exist before kit's first sync.
				root = config.root ?? root;
				const log = (msg: string) => console.log(`[log-inspector] ${msg}`);
				const warn = (msg: string) => console.warn(msg);
				ensureRoutes(log);
				if (options.autoCreateHooks !== false) ensureHooks(log, warn);
			}
		},
		configResolved(config) {
			root = config.root ?? root;
		}
	};
}

export default logInspector;