import { createLogHandle, handleError } from 'sveltekit-inspect/server';

export const handle = createLogHandle({"skipPaths":["/__log-inspector"]});
export { handleError };
