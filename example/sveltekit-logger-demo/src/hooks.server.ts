import { createLogHandle, handleError } from 'sveltekit-logger/server';

export const handle = createLogHandle({"skipPaths":["/__log-inspector"]});
export { handleError };
