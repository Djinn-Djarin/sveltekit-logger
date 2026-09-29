import { createLogHandle, handleError } from '@djarin/sveltekit-inspect/server';

export const handle = createLogHandle({"skipPaths":["/__log-inspector"]});
export { handleError };
