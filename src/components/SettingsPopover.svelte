<script lang="ts">
	import Icon from '@iconify/svelte';
	import { sun, moon, x, trash2, settings as settingsIcon } from './icons.js';

	interface Props {
		showSettings: boolean;
		isDark: boolean;
		toggleTheme: () => void;
		persistEnabled: boolean;
		handleTogglePersist: () => void;
		openOnStartup: boolean;
		handleToggleOpenOnStartup: () => void;
		autoPopOnError: boolean;
		handleToggleAutoPop: () => void;
		savedRecordsLimit: number;
		handleLimitChange: (limit: number) => void;
		handleClearSavedRecords: () => void;
		pingThreshold: number;
		setPingThreshold: (v: number) => void;
		sizeThreshold: number;
		setSizeThreshold: (v: number) => void;
		logExternal: boolean;
		handleToggleLogExternal: () => void;
		close: () => void;
	}
	let {
		showSettings,
		isDark,
		toggleTheme,
		persistEnabled,
		handleTogglePersist,
		openOnStartup,
		handleToggleOpenOnStartup,
		autoPopOnError,
		handleToggleAutoPop,
		savedRecordsLimit,
		handleLimitChange,
		handleClearSavedRecords,
		pingThreshold,
		setPingThreshold,
		sizeThreshold,
		setSizeThreshold,
		logExternal,
		handleToggleLogExternal,
		close
	}: Props = $props();

	$effect(() => {
		if (showSettings) {
			const handleOutsideClick = () => { close(); };
			window.addEventListener('click', handleOutsideClick);
			return () => {
				window.removeEventListener('click', handleOutsideClick);
			};
		}
	});
</script>

{#if showSettings}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="absolute top-full right-0 origin-top-right mt-1.5 w-64 p-2.5 bg-theme-surface border border-theme-border rounded-lg shadow-2xl z-50 text-li-body space-y-2.5 font-sans max-h-[320px] overflow-y-auto"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
		tabindex="-1"
	>
		<div class="flex items-center justify-between border-b border-theme-border/60 pb-1.5">
			<span class="font-semibold text-theme-text-primary flex items-center gap-1.5 text-pill">
				<Icon icon={settingsIcon} class="h-3.5 w-3.5 text-indigo-400" />
				Preferences
			</span>
			<button onclick={close} class="text-theme-text-muted hover:text-theme-text-primary p-0.5 cursor-pointer border-0 bg-transparent">
				<Icon icon={x} class="h-3 w-3" />
			</button>
		</div>

		<!-- Theme Selector -->
		<div class="space-y-1">
			<span class="text-pill font-medium text-theme-text-muted uppercase tracking-wider block">Theme Mode</span>
			<div class="flex items-center gap-1 bg-theme-bg p-1 rounded border border-theme-border/60">
				<button
					onclick={() => {
						if (!isDark) toggleTheme();
					}}
					class="flex-1 flex items-center justify-center gap-1 py-1 rounded text-pill font-medium cursor-pointer transition-colors border-0 {isDark ? 'bg-indigo-600 text-white font-semibold' : 'bg-transparent text-theme-text-muted hover:text-theme-text-primary'}"
				>
					<Icon icon={moon} class="h-3 w-3" />
					<span>Dark</span>
				</button>
				<button
					onclick={() => {
						if (isDark) toggleTheme();
					}}
					class="flex-1 flex items-center justify-center gap-1 py-1 rounded text-pill font-medium cursor-pointer transition-colors border-0 {!isDark ? 'bg-indigo-600 text-white font-semibold' : 'bg-transparent text-theme-text-muted hover:text-theme-text-primary'}"
				>
					<Icon icon={sun} class="h-3 w-3" />
					<span>Light</span>
				</button>
			</div>
		</div>

		<!-- Behavior -->
		<div class="space-y-1.5 pt-1 border-t border-theme-border/40">
			<div class="flex items-center justify-between">
				<span class="text-[11px] text-theme-text-secondary">Popup at Start</span>
				<input
					type="checkbox"
					checked={openOnStartup}
					onchange={handleToggleOpenOnStartup}
					class="accent-indigo-500 rounded cursor-pointer h-3.5 w-3.5"
				/>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-[11px] text-theme-text-secondary">Log External APIs (Browser)</span>
				<input
					type="checkbox"
					checked={logExternal}
					onchange={handleToggleLogExternal}
					class="accent-indigo-500 rounded cursor-pointer h-3.5 w-3.5"
					title="If enabled, logs cross-origin browser fetches (requires reload)"
				/>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-[11px] text-theme-text-secondary">Auto-pop on Error</span>
				<input
					type="checkbox"
					checked={autoPopOnError}
					onchange={handleToggleAutoPop}
					class="accent-indigo-500 rounded cursor-pointer h-3.5 w-3.5"
				/>
			</div>
				<div class="flex items-center justify-between">
				<span class="text-[11px] text-theme-text-secondary">Persist Logs Across Reload</span>
				<input
					type="checkbox"
					checked={persistEnabled}
					onchange={handleTogglePersist}
					class="accent-indigo-500 rounded cursor-pointer h-3.5 w-3.5"
				/>
			</div>
		</div>

		<!-- Warning Thresholds -->
		<div class="space-y-1.5 pt-1 border-t border-theme-border/40">
			<span class="text-pill font-medium text-theme-text-muted uppercase tracking-wider block">Warning Thresholds</span>
			
			<div class="flex items-center justify-between">
				<span class="text-pill text-theme-text-secondary">Slow Request Ping</span>
				<div class="flex items-center gap-1 bg-theme-bg border border-theme-border/60 rounded px-1.5 py-0.5">
					<input 
						type="number" 
						value={pingThreshold}
						onchange={(e) => setPingThreshold(Number(e.currentTarget.value))}
						class="w-12 bg-transparent text-right text-pill text-theme-text-primary border-0 outline-none focus:ring-0 p-0"
						min="0"
						step="100"
					/>
					<span class="text-pill text-theme-text-muted font-medium">ms</span>
				</div>
			</div>

			<div class="flex items-center justify-between">
				<span class="text-pill text-theme-text-secondary">Heavy Payload Size</span>
				<div class="flex items-center gap-1 bg-theme-bg border border-theme-border/60 rounded px-1.5 py-0.5">
					<input 
						type="number" 
						value={sizeThreshold}
						onchange={(e) => setSizeThreshold(Number(e.currentTarget.value))}
						class="w-12 bg-transparent text-right text-pill text-theme-text-primary border-0 outline-none focus:ring-0 p-0"
						min="0"
						step="10"
					/>
					<span class="text-pill text-theme-text-muted font-medium">KB</span>
				</div>
			</div>
		</div>

		<!-- Persistence & Saved Records -->
		<div class="space-y-1.5 pt-1 border-t border-theme-border/40">
		

			{#if persistEnabled}
				<div class="flex items-center justify-between mt-1">
					<span class="text-pill text-theme-text-secondary">Saved Limit</span>
					<select
						value={savedRecordsLimit}
						onchange={(e) => handleLimitChange(Number(e.currentTarget.value))}
						class="bg-theme-bg border border-theme-border/60 text-theme-text-primary text-pill rounded py-0.5 px-1 outline-none focus:ring-1 focus:ring-indigo-500/50"
					>
						<option value="10">10 records</option>
						<option value="50">50 records</option>
						<option value="100">100 records</option>
						<option value="200">200 records</option>
						<option value="500">500 records</option>
					</select>
				</div>
				<button
					onclick={handleClearSavedRecords}
					class="mt-1.5 w-full flex items-center justify-center gap-1.5 py-1 text-pill font-medium text-theme-text-muted hover:text-theme-danger hover:bg-theme-danger/10 border border-theme-border/60 hover:border-theme-danger/30 rounded cursor-pointer transition-colors bg-transparent"
				>
					<Icon icon={trash2} class="h-3 w-3" />
					Clear Stored Logs
				</button>
			{/if}
		</div>
	</div>
{/if}
