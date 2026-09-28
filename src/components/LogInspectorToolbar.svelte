<script lang="ts">
	import Icon from '@iconify/svelte';
	import {
		search,
		x,
		copy,
		sun,
		moon,
		trash2,
		settings,
		chevronDown,
		chevronUp,
		maximize,
		minimize
	} from './icons.js';
	import SettingsPopover from './SettingsPopover.svelte';

	interface Props {
		searchQuery: string;
		filterMethod: string;
		filterStatus: string;
		filterTag: string;
		filterInitiator: string;
		tagOptions: string[];
		initiatorOptions: string[];
		showSettings: boolean;
		isDark: boolean;
		persistEnabled: boolean;
		openOnStartup: boolean;
		autoPopOnError: boolean;
		savedRecordsLimit: number;
		pingThreshold: number;
		sizeThreshold: number;
		logExternal: boolean;
		showLayoutControls: boolean;
		showActionButtons: boolean;
		fullscreen: boolean;
		collapsed: boolean;
		onSearchChange: (q: string) => void;
		onMethodChange: (m: string) => void;
		onStatusChange: (s: string) => void;
		onTagChange: (t: string) => void;
		onInitiatorChange: (i: string) => void;
		onResetFilters: () => void;
		onToggleSettings: () => void;
		onToggleTheme: () => void;
		onTogglePersist: () => void;
		onToggleOpenOnStartup: () => void;
		onToggleAutoPop: () => void;
		onLimitChange: (limit: number) => void;
		onClearSavedRecords: () => void;
		onPingThresholdChange: (v: number) => void;
		onSizeThresholdChange: (v: number) => void;
		onToggleLogExternal: () => void;
		onCopyAll: (e?: MouseEvent) => void;
		onClearAll: () => void;
		onToggleFullscreen: () => void;
	}

	let props: Props = $props();
</script>

<div class="flex items-center gap-2 px-3 py-1.5 bg-theme-surface/70 border-b border-theme-border/70 shrink-0 text-[11px] flex-wrap">
	<!-- Search Input -->
	<div class="relative flex-1 min-w-[160px] max-w-xs">
		<Icon icon={search} class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-theme-text-muted pointer-events-none" />
		<input
			type="text"
			value={props.searchQuery}
			oninput={(e) => props.onSearchChange(e.currentTarget.value)}
			placeholder="Search logs, URLs, status..."
			class="w-full pl-8 pr-7 py-1 bg-theme-bg border border-theme-border rounded text-[11px] text-theme-text-primary placeholder:text-theme-text-muted outline-none focus:border-theme-accent transition-colors"
		/>
		{#if props.searchQuery}
			<button onclick={() => props.onSearchChange('')} class="absolute right-2 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text-primary cursor-pointer border-0 bg-transparent">
				<Icon icon={x} class="h-3 w-3" />
			</button>
		{/if}
	</div>

	<!-- Method Filter -->
	<div class="flex items-center gap-1">
		<span class="text-theme-text-muted text-[10px] font-medium">Method:</span>
		<select
			value={props.filterMethod}
			onchange={(e) => props.onMethodChange(e.currentTarget.value)}
			class="bg-theme-bg border border-theme-border rounded px-2 py-1 text-[11px] text-theme-text-primary outline-none focus:border-theme-accent cursor-pointer"
		>
			<option value="ALL">All Methods</option>
			<option value="NETWORK_ONLY">Network Only</option>
			<option value="LOGS_ONLY">Logs Only</option>
			<option value="GET">GET</option>
			<option value="POST">POST</option>
			<option value="PUT">PUT</option>
			<option value="DELETE">DELETE</option>
			<option value="PATCH">PATCH</option>
		</select>
	</div>

	<!-- Status Filter -->
	<div class="flex items-center gap-1">
		<span class="text-theme-text-muted text-[10px] font-medium">Status:</span>
		<select
			value={props.filterStatus}
			onchange={(e) => props.onStatusChange(e.currentTarget.value)}
			class="bg-theme-bg border border-theme-border rounded px-2 py-1 text-[11px] text-theme-text-primary outline-none focus:border-theme-accent cursor-pointer"
		>
			<option value="ALL">All Status</option>
			<option value="SUCCESS">Success (2xx)</option>
			<option value="ERROR">Errors (4xx / 5xx)</option>
		</select>
	</div>

	<!-- Tag Filter -->
	<div class="flex items-center gap-1">
		<span class="text-theme-text-muted text-[10px] font-medium">Tag:</span>
		<select
			value={props.filterTag}
			onchange={(e) => props.onTagChange(e.currentTarget.value)}
			class="bg-theme-bg border border-theme-border rounded px-2 py-1 text-[11px] text-theme-text-primary outline-none focus:border-theme-accent cursor-pointer"
		>
			<option value="ALL">All Tags</option>
			{#each props.tagOptions as opt}
				<option value={opt}>{opt}</option>
			{/each}
		</select>
	</div>

	<!-- Initiator Filter -->
	<div class="flex items-center gap-1">
		<span class="text-theme-text-muted text-[10px] font-medium">Initiator:</span>
		<select
			value={props.filterInitiator}
			onchange={(e) => props.onInitiatorChange(e.currentTarget.value)}
			class="bg-theme-bg border border-theme-border rounded px-2 py-1 text-[11px] text-theme-text-primary outline-none focus:border-theme-accent cursor-pointer max-w-[120px] truncate"
		>
			<option value="ALL">All Initiators</option>
			{#each props.initiatorOptions as opt}
				<option value={opt}>{opt}</option>
			{/each}
		</select>
	</div>

	<!-- Settings Button -->
	<div class="relative flex items-center">
		<button
			onclick={(e) => { e.stopPropagation(); props.onToggleSettings(); }}
			class="flex items-center gap-1.5 px-2 py-1 bg-theme-bg border border-theme-border rounded text-[11px] text-theme-text-primary hover:border-theme-accent transition-colors cursor-pointer border-0"
			title="Inspector Settings"
		>
			<Icon icon={settings} class="h-3.5 w-3.5 text-indigo-400" />
			<span>Settings</span>
		</button>
		
		<SettingsPopover 
			showSettings={props.showSettings}
			isDark={props.isDark}
			toggleTheme={props.onToggleTheme}
			persistEnabled={props.persistEnabled}
			handleTogglePersist={props.onTogglePersist}
			openOnStartup={props.openOnStartup}
			handleToggleOpenOnStartup={props.onToggleOpenOnStartup}
			autoPopOnError={props.autoPopOnError}
			handleToggleAutoPop={props.onToggleAutoPop}
			savedRecordsLimit={props.savedRecordsLimit}
			handleLimitChange={props.onLimitChange}
			handleClearSavedRecords={props.onClearSavedRecords}
			pingThreshold={props.pingThreshold}
			setPingThreshold={props.onPingThresholdChange}
			sizeThreshold={props.sizeThreshold}
			setSizeThreshold={props.onSizeThresholdChange}
			logExternal={props.logExternal}
			handleToggleLogExternal={props.onToggleLogExternal}
			close={() => { if (props.showSettings) props.onToggleSettings(); }}
		/>
	</div>

	<!-- Reset Filters -->
	{#if props.searchQuery || props.filterMethod !== 'ALL' || props.filterStatus !== 'ALL' || props.filterTag !== 'ALL' || props.filterInitiator !== 'ALL'}
		<button
			onclick={props.onResetFilters}
			class="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer border-0 bg-transparent"
		>
			Reset Filters
		</button>
	{/if}

	<!-- Action buttons -->
	{#if props.showActionButtons}
	<div class="relative flex items-center gap-1 ml-auto shrink-0">
		<button
			onclick={props.onCopyAll}
			class="p-1 text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-panel rounded cursor-pointer transition-colors border-0 bg-transparent"
			title="Copy all logs"
		>
			<Icon icon={copy} class="h-3.5 w-3.5" />
		</button>
		<button
			onclick={props.onClearAll}
			class="p-1 text-theme-text-muted hover:text-theme-danger hover:bg-theme-panel rounded cursor-pointer transition-colors border-0 bg-transparent"
			title="Clear all records"
		>
			<Icon icon={trash2} class="h-3.5 w-3.5" />
		</button>
	</div>
	{/if}

	{#if props.showLayoutControls}
		<div class="relative flex items-center gap-1 shrink-0 ml-1 border-l border-theme-border/60 pl-2">
			<button
				onclick={props.onToggleFullscreen}
				class="p-1 text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-panel rounded cursor-pointer transition-colors border-0 bg-transparent"
				title={props.fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
			>
				<Icon icon={props.fullscreen ? minimize : maximize} class="h-3.5 w-3.5" />
			</button>
		</div>
	{/if}
</div>
