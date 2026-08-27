import { installServerFetchInterceptor } from './fetchInterceptor.js';
import { installServerConsoleInterceptor } from './consoleInterceptor.js';

export * from './logStore.js';
export * from './fetchInterceptor.js';
export * from './consoleInterceptor.js';
export * from './handlers.js';
export { createLogHandle, handle, handleError } from './handle.js';

// Zero-code: wrapping the server-side global `fetch` means every outbound call
// is captured automatically the moment this module is loaded.
installServerFetchInterceptor();
installServerConsoleInterceptor();