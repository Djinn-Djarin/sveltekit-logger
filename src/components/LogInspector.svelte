<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import './theme.css';
	import {
		terminalStore,
		clientConfig,
		getSavedRecordsLimit,
		setSavedRecordsLimit
	} from '../client/index.js';
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
	import {
		columns,
		comparators,
		parseLogEntry,
		DEFAULT_COL_WIDTHS,
		COMPACT_COL_WIDTHS,
		type LogColumn,
		type ParsedLog,
		type SortDir,
		type SortKey
	} from './logUtils.js';
	import NetworkTable from './NetworkTable.svelte';
	import RequestResponsePanel from './RequestResponsePanel.svelte';

	interface Props {
		class?: string;
		showLayoutControls?: boolean;
		showActionButtons?: boolean;
	}
	let { class: className = '', showLayoutControls = true, showActionButtons = true }: Props = $props();

	let searchQuery = $state('');
	let filterTag = $state('ALL');
	let filterMethod = $state('ALL');
	let filterStatus = $state('ALL');
	let filterInitiator = $state('ALL');

	// Theme & UI settings
	const THEME_KEY = 'li-theme';
	let isDark = $state(true);
	let collapsed = $state(false);
	let fullscreen = $state(false);

	// Settings modal / popover state
	let showSettings = $state(false);
	let persistEnabled = $state(true);
	let savedRecordsLimit = $state(10);

	onMount(() => {
		if (typeof window !== 'undefined') {
			if (localStorage.getItem(THEME_KEY) === 'light') isDark = false;
			savedRecordsLimit = getSavedRecordsLimit();
			persistEnabled = clientConfig.persist;
		}
	});

	function toggleTheme() {
		isDark = !isDark;
		if (typeof window !== 'undefined') {
			localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
		}
	}

	function handleLimitChange(newLimit: number) {
		savedRecordsLimit = newLimit;
		setSavedRecordsLimit(newLimit);
		terminalStore.rePersist();
		showToast(`Saved records limit set to ${newLimit}`);
	}

	function handleTogglePersist() {
		persistEnabled = !persistEnabled;
		clientConfig.persist = persistEnabled;
		if (!persistEnabled) {
			if (typeof window !== 'undefined') {
				localStorage.removeItem(clientConfig.storageKey);
			}
			showToast('Log persistence disabled');
		} else {
			terminalStore.rePersist();
			showToast('Log persistence enabled');
		}
	}

	function handleClearSavedRecords() {
		if (typeof window !== 'undefined') {
			localStorage.removeItem(clientConfig.storageKey);
		}
		showToast('Saved storage cleared');
	}

	function handleClear() {
		terminalStore.clear();
		selectedLog = null;
		showToast('All records cleared');
	}

	function toggleFullscreen() {
		fullscreen = !fullscreen;
		if (typeof window !== 'undefined') {
			document.body.style.overflow = fullscreen ? 'hidden' : '';
		}
	}

	let sortColumn = $state<SortKey>('timestamp');
	let sortDir = $state<SortDir>('desc');

	// Resizable table column widths (px)
	let colWidths = $state<Record<string, number>>({ ...DEFAULT_COL_WIDTHS });

	let selectedLog = $state<ParsedLog | null>(null);

	$effect(() => {
		if (selectedLog) {
			colWidths = { ...COMPACT_COL_WIDTHS };
		} else {
			colWidths = { ...DEFAULT_COL_WIDTHS };
		}
	});

	$effect(() => {
		if (showSettings) {
			const handleOutsideClick = () => {
				showSettings = false;
			};
			window.addEventListener('click', handleOutsideClick);
			return () => window.removeEventListener('click', handleOutsideClick);
		}
	});

	let logsContainerEl = $state<HTMLDivElement | null>(null);

	let inspectWidth = $state(420);
	let isResizingInspect = $state(false);

	function handleInspectResizeStart(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		isResizingInspect = true;
		const startX = e.clientX;
		const startWidth = inspectWidth;
		const containerWidth = logsContainerEl?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1000);

		// Boundaries:
		// Left Table Panel min-width: 320px
		// Right Inspect Panel min-width: 320px, max-width: 60% of container (leaving at least 320px for table)
		const minInspectWidth = 320;
		const maxInspectWidth = Math.max(minInspectWidth, Math.min(Math.floor(containerWidth * 0.6), containerWidth - 320));

		function onMouseMove(moveEvent: MouseEvent) {
			const delta = startX - moveEvent.clientX;
			inspectWidth = Math.min(Math.max(startWidth + delta, minInspectWidth), maxInspectWidth);
		}

		function onMouseUp() {
			isResizingInspect = false;
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
			document.body.style.userSelect = '';
			document.body.style.cursor = '';
		}

		document.body.style.userSelect = 'none';
		document.body.style.cursor = 'col-resize';
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	}

	let toastMsg = $state('');
	let toastTimer: ReturnType<typeof setTimeout> | undefined;
	function showToast(msg: string) {
		toastMsg = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMsg = ''), 1600);
	}

	function copyText(text: string, e?: MouseEvent) {
		if (e) e.stopPropagation();
		navigator.clipboard
			.writeText(text)
			.then(() => showToast('Copied to clipboard'))
			.catch(() => showToast('Copy failed'));
	}

	let parsedLogs = $derived($terminalStore.map((l, idx) => parseLogEntry(l, idx)));

	let initiatorOptions = $derived(
		[...new Set(parsedLogs.map((l) => l.initiator).filter((i) => !!i))].sort((a, b) =>
			a.toLowerCase().localeCompare(b.toLowerCase())
		)
	);

	let tagOptions = $derived([...new Set(parsedLogs.map((l) => l.tag))].sort());

	let filteredLogs = $derived.by(() => {
		let result = parsedLogs;

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(l) =>
					l.message.toLowerCase().includes(q) ||
					l.url.toLowerCase().includes(q) ||
					l.tag.toLowerCase().includes(q) ||
					l.method.toLowerCase().includes(q) ||
					l.initiator.toLowerCase().includes(q) ||
					l.statusText.toLowerCase().includes(q) ||
					(l.raw.details && l.raw.details.toLowerCase().includes(q))
			);
		}

		if (filterTag !== 'ALL') {
			result = result.filter((l) => l.tag === filterTag);
		}

		if (filterMethod !== 'ALL') {
			result = result.filter((l) => l.method === filterMethod);
		}

		if (filterStatus === 'SUCCESS') {
			result = result.filter((l) => l.isSuccess);
		} else if (filterStatus === 'ERROR') {
			result = result.filter((l) => l.isError);
		}

		if (filterInitiator !== 'ALL') {
			result = result.filter((l) => l.initiator === filterInitiator);
		}

		return [...result].sort((a, b) => {
			const cmp = comparators[sortColumn](a, b);
			return sortDir === 'asc' ? cmp : -cmp;
		});
	});

	function handleSort(col: LogColumn) {
		if (!col.sortable) return;
		toggleSort(col.key as SortKey);
	}

	function toggleSort(col: typeof sortColumn) {
		if (sortColumn === col) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = col;
			sortDir = 'desc';
		}
	}

	function openTrace(log: ParsedLog) {
		selectedLog = log;
	}

	function toggleLogExpanded(index: number) {
		terminalStore.update((logs) => {
			const l = logs[index];
			if (l) l.expanded = !l.expanded;
			return logs;
		});
	}

	let hasAutoSelected = $state(false);

	$effect(() => {
		if (filteredLogs.length > 0) {
			if (!selectedLog && !hasAutoSelected) {
				selectedLog = filteredLogs[0];
				hasAutoSelected = true;
			} else if (selectedLog && !filteredLogs.some((l) => l.index === selectedLog?.index)) {
				selectedLog = filteredLogs[0] || null;
			}
		} else if (filteredLogs.length === 0) {
			selectedLog = null;
		}
	});
</script>

<div class="w-full h-full flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-theme-bg {className} {isDark ? '' : 'li-light'} {fullscreen ? '!fixed !inset-0 !z-[9999] !h-screen !w-screen' : ''}">
	<!-- Toast -->
	{#if toastMsg}
		<div class="fixed top-4 right-4 z-[999] bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-[11px] text-theme-text-primary shadow-2xl">
			{toastMsg}
		</div>
	{/if}

	<!-- Filtering & Search Control Toolbar -->
	<div class="flex items-center gap-2 px-3 py-1.5 bg-theme-surface/70 border-b border-theme-border/70 shrink-0 text-[11px] flex-wrap">
		<!-- Search Input -->
		<div class="relative flex-1 min-w-[160px] max-w-xs">
			<Icon icon={search} class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-theme-text-muted pointer-events-none" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search logs, URLs, status..."
				class="w-full pl-8 pr-7 py-1 bg-theme-bg border border-theme-border rounded text-[11px] text-theme-text-primary placeholder:text-theme-text-muted outline-none focus:border-theme-accent transition-colors"
			/>
			{#if searchQuery}
				<button onclick={() => (searchQuery = '')} class="absolute right-2 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text-primary cursor-pointer">
					<Icon icon={x} class="h-3 w-3" />
				</button>
			{/if}
		</div>

		<!-- Method Filter -->
		<div class="flex items-center gap-1">
			<span class="text-theme-text-muted text-[10px] font-medium">Method:</span>
			<select
				bind:value={filterMethod}
				class="bg-theme-bg border border-theme-border rounded px-2 py-1 text-[11px] text-theme-text-primary outline-none focus:border-theme-accent cursor-pointer"
			>
				<option value="ALL">All Methods</option>
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
				bind:value={filterStatus}
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
				bind:value={filterTag}
				class="bg-theme-bg border border-theme-border rounded px-2 py-1 text-[11px] text-theme-text-primary outline-none focus:border-theme-accent cursor-pointer"
			>
				<option value="ALL">All Tags</option>
				{#each tagOptions as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
		</div>

		<!-- Initiator Filter (Last Filter Option) -->
		<div class="flex items-center gap-1">
			<span class="text-theme-text-muted text-[10px] font-medium">Initiator:</span>
			<select
				bind:value={filterInitiator}
				class="bg-theme-bg border border-theme-border rounded px-2 py-1 text-[11px] text-theme-text-primary outline-none focus:border-theme-accent cursor-pointer"
			>
				<option value="ALL">All Initiators</option>
				{#each initiatorOptions as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
		</div>

		<!-- Settings Button (Sitting with last filter option) -->
		<div class="relative flex items-center">
			<button
				onclick={(e) => { e.stopPropagation(); showSettings = !showSettings; }}
				class="flex items-center gap-1.5 px-2 py-1 bg-theme-bg border border-theme-border rounded text-[11px] text-theme-text-primary hover:border-theme-accent transition-colors cursor-pointer"
				title="Inspector Settings"
			>
				<Icon icon={settings} class="h-3.5 w-3.5 text-indigo-400" />
				<span>Settings</span>
			</button>

			{#if showSettings}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="absolute top-full left-0 mt-1.5 w-64 p-3 bg-theme-surface border border-theme-border rounded-lg shadow-2xl z-50 text-[11px] space-y-3 font-sans"
					onclick={(e) => e.stopPropagation()}
				>
					<div class="flex items-center justify-between border-b border-theme-border/60 pb-1.5">
						<span class="font-semibold text-theme-text-primary flex items-center gap-1.5 text-xs">
							<Icon icon={settings} class="h-3.5 w-3.5 text-indigo-400" />
							Preferences
						</span>
						<button onclick={() => (showSettings = false)} class="text-theme-text-muted hover:text-theme-text-primary p-0.5 cursor-pointer">
							<Icon icon={x} class="h-3 w-3" />
						</button>
					</div>

					<!-- Theme Selector -->
					<div class="space-y-1">
						<span class="text-[10px] font-medium text-theme-text-muted uppercase tracking-wider block">Theme Mode</span>
						<div class="flex items-center gap-1 bg-theme-bg p-1 rounded border border-theme-border/60">
							<button
								onclick={() => { if (!isDark) toggleTheme(); }}
								class="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] font-medium cursor-pointer transition-colors {isDark ? 'bg-indigo-600 text-white font-semibold' : 'text-theme-text-muted hover:text-theme-text-primary'}"
							>
								<Icon icon={moon} class="h-3 w-3" />
								<span>Dark</span>
							</button>
							<button
								onclick={() => { if (isDark) toggleTheme(); }}
								class="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] font-medium cursor-pointer transition-colors {!isDark ? 'bg-indigo-600 text-white font-semibold' : 'text-theme-text-muted hover:text-theme-text-primary'}"
							>
								<Icon icon={sun} class="h-3 w-3" />
								<span>Light</span>
							</button>
						</div>
					</div>

					<!-- Persistence & Saved Records -->
					<div class="space-y-1.5 pt-1 border-t border-theme-border/40">
						<div class="flex items-center justify-between">
							<span class="text-[10px] font-medium text-theme-text-muted uppercase tracking-wider">Persist Logs Across Reload</span>
							<input
								type="checkbox"
								checked={persistEnabled}
								onchange={handleTogglePersist}
								class="accent-indigo-500 rounded cursor-pointer h-3.5 w-3.5"
							/>
						</div>

						<div class="flex items-center justify-between pt-1">
							<span class="text-theme-text-secondary text-[11px]">Saved Records Limit:</span>
							<select
								value={savedRecordsLimit}
								onchange={(e) => handleLimitChange(Number((e.target as HTMLSelectElement).value))}
								disabled={!persistEnabled}
								class="bg-theme-bg border border-theme-border rounded px-2 py-0.5 text-[11px] text-theme-text-primary outline-none focus:border-theme-accent cursor-pointer disabled:opacity-40"
							>
								<option value={5}>5 entries</option>
								<option value={10}>10 entries</option>
								<option value={25}>25 entries</option>
								<option value={50}>50 entries</option>
								<option value={100}>100 entries</option>
							</select>
						</div>

						<button
							onclick={handleClearSavedRecords}
							class="w-full mt-2 py-1 px-2 bg-theme-panel hover:bg-rose-500/10 border border-theme-border hover:border-rose-500/40 text-theme-text-secondary hover:text-rose-400 rounded text-[10px] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
						>
							<Icon icon={trash2} class="h-3 w-3" />
							<span>Clear Saved Storage</span>
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Reset Filters -->
		{#if searchQuery || filterMethod !== 'ALL' || filterStatus !== 'ALL' || filterTag !== 'ALL' || filterInitiator !== 'ALL'}
			<button
				onclick={() => { searchQuery = ''; filterMethod = 'ALL'; filterStatus = 'ALL'; filterTag = 'ALL'; filterInitiator = 'ALL'; }}
				class="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
			>
				Reset Filters
			</button>
		{/if}

		<!-- Action buttons (copy, clear, fullscreen, collapse) -->
		{#if showActionButtons}
		<div class="relative flex items-center gap-1 ml-auto shrink-0">
			<button
				onclick={(e) => copyText($terminalStore.map((l) => `[${l.timestamp}] ${l.message}${l.details ? '\n' + l.details : ''}`).join('\n\n'), e)}
				class="p-1 text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-panel rounded cursor-pointer transition-colors"
				title="Copy all logs"
			>
				<Icon icon={copy} class="h-3.5 w-3.5" />
			</button>
			<button
				onclick={handleClear}
				class="p-1 text-theme-text-muted hover:text-theme-danger hover:bg-theme-panel rounded cursor-pointer transition-colors"
				title="Clear all records"
			>
				<Icon icon={trash2} class="h-3.5 w-3.5" />
			</button>
			{#if showLayoutControls}
			<button
				onclick={toggleFullscreen}
				class="p-1 text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-panel rounded cursor-pointer transition-colors"
				title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
			>
				<Icon icon={fullscreen ? minimize : maximize} class="h-3.5 w-3.5" />
			</button>
			<button
				onclick={() => (collapsed = !collapsed)}
				class="p-1 text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-panel rounded cursor-pointer transition-colors"
				title={collapsed ? 'Expand inspector' : 'Collapse inspector'}
			>
				<Icon icon={collapsed ? chevronUp : chevronDown} class="h-3.5 w-3.5" />
			</button>
			{/if}
		</div>
		{/if}
	</div>

	<!-- LOG CONTENT AREA (TOP FLEX WRAPPER) -->
	{#if !collapsed}
	<div bind:this={logsContainerEl} class="flex-1 flex min-h-0 overflow-hidden">
		<!-- LEFT FLEX PANEL: Log Table -->
		<div class="flex-1 flex flex-col min-w-[320px] shrink-0 min-h-0 overflow-hidden">
			<NetworkTable
				logs={filteredLogs}
				{columns}
				{colWidths}
				{sortColumn}
				{sortDir}
				selectedIndex={selectedLog?.index ?? null}
				onSort={handleSort}
				onSelect={openTrace}
				onCopy={copyText}
				onToggleExpand={toggleLogExpanded}
				onResizeWidths={(w) => (colWidths = w)}
			/>
		</div>

		<!-- FLEX SPLITTER RESIZER (Middle Divider) -->
		{#if selectedLog}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				onmousedown={handleInspectResizeStart}
				class="w-1.5 shrink-0 bg-theme-border/60 hover:bg-indigo-500 active:bg-indigo-600 cursor-col-resize transition-colors z-10 flex items-center justify-center group select-none"
				title="Drag to resize panel"
			>
				<div class="w-0.5 h-6 bg-theme-text-muted/40 group-hover:bg-white rounded-full"></div>
			</div>

			<!-- RIGHT FLEX PANEL: Inspect Detail Panel -->
			<div
				class="shrink-0 flex flex-col min-h-0 min-w-[320px] max-w-[40%] bg-theme-surface border-l border-theme-border/60 overflow-hidden"
				style="width: {inspectWidth}px;"
			>
				<RequestResponsePanel log={selectedLog} onClose={() => (selectedLog = null)} onCopy={copyText} />
			</div>
		{/if}
	</div>
	{/if}
</div>
