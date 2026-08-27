export interface ClientConfig {
	/** Base path of the generated inspector routes (default `/__log-inspector`). */
	basePath: string;
	/** localStorage key used to persist the last few logs. */
	storageKey: string;
	/** Keep client logs in localStorage across reloads. */
	persist: boolean;
}

const defaults: ClientConfig = {
	basePath: '/__log-inspector',
	storageKey: 'sveltekit_log_inspector_logs',
	persist: true
};

export const clientConfig: ClientConfig = { ...defaults };

export function configureClient(cfg: Partial<ClientConfig>): void {
	Object.assign(clientConfig, cfg);
}

export function resetClientConfig(): void {
	Object.assign(clientConfig, defaults);
}