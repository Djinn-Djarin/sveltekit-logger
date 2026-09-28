<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Icon from '@iconify/svelte';
	import './theme.css';
	import {
		terminalStore,
		clientConfig,
		getSavedRecordsLimit,
		setSavedRecordsLimit,
		unreadErrorCount,
		markErrorsRead,
		initClientLogging
	} from '../client/index.js';
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
	import LogInspectorToolbar from './LogInspectorToolbar.svelte';
	import FloatingDockButton from './FloatingDockButton.svelte';

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
	const COLLAPSE_KEY = 'li-collapsed';
	let isDark = $state(true);
	let collapsed = $state(true);
	let fullscreen = $state(false);
	let enabled = $state(true);

	// Settings modal / popover state
	let showSettings = $state(false);
	let persistEnabled = $state(true);
	let savedRecordsLimit = $state(50);
	
	let pingThreshold = $state(1000);
	let sizeThreshold = $state(100);

	const AUTO_POP_KEY = 'li-auto-pop';
	const OPEN_ON_START_KEY = 'li-open-on-start';
	const LOG_EXTERNAL_KEY = 'li-log-external';
	let autoPopOnError = $state(false);
	let openOnStartup = $state(false);
	let logExternal = $state(false);

	let mounted = $state(false);

	onMount(() => {
		if (typeof window !== 'undefined') {
			if (localStorage.getItem(THEME_KEY) === 'light') isDark = false;

			const savedSearch = localStorage.getItem('li-search');
			if (savedSearch) searchQuery = savedSearch;
			const savedTag = localStorage.getItem('li-filter-tag');
			if (savedTag) filterTag = savedTag;
			const savedMethod = localStorage.getItem('li-filter-method');
			if (savedMethod) filterMethod = savedMethod;
			const savedStatus = localStorage.getItem('li-filter-status');
			if (savedStatus) filterStatus = savedStatus;
			const savedInit = localStorage.getItem('li-filter-init');
			if (savedInit) filterInitiator = savedInit;
			
			const savedPing = localStorage.getItem('li-ping-thresh');
			if (savedPing && !isNaN(Number(savedPing))) pingThreshold = Number(savedPing);
			const savedSize = localStorage.getItem('li-size-thresh');
			if (savedSize && !isNaN(Number(savedSize))) sizeThreshold = Number(savedSize);

			const autoOpen = localStorage.getItem(OPEN_ON_START_KEY) === 'true';
			if (autoOpen) {
				openOnStartup = true;
				collapsed = false;
			} else if (localStorage.getItem(COLLAPSE_KEY) === 'false') {
				collapsed = false;
			}

			if (localStorage.getItem(AUTO_POP_KEY) === 'true') autoPopOnError = true;
			const savedLogExternal = localStorage.getItem(LOG_EXTERNAL_KEY);
			if (savedLogExternal !== null) logExternal = savedLogExternal === 'true';

			savedRecordsLimit = getSavedRecordsLimit();
			persistEnabled = clientConfig.persist;
			
			initClientLogging({ logExternal });
			
			mounted = true;
		}
	});

	$effect(() => {
		if (!mounted || typeof window === 'undefined') return;
		localStorage.setItem('li-search', searchQuery);
		localStorage.setItem('li-filter-tag', filterTag);
		localStorage.setItem('li-filter-method', filterMethod);
		localStorage.setItem('li-filter-status', filterStatus);
		localStorage.setItem('li-filter-init', filterInitiator);
	});

	$effect(() => {
		if (!mounted || typeof window === 'undefined') return;
		localStorage.setItem('li-ping-thresh', String(pingThreshold));
		localStorage.setItem('li-size-thresh', String(sizeThreshold));
		localStorage.setItem(AUTO_POP_KEY, String(autoPopOnError));
		localStorage.setItem(OPEN_ON_START_KEY, String(openOnStartup));
		localStorage.setItem(LOG_EXTERNAL_KEY, String(logExternal));
		localStorage.setItem(COLLAPSE_KEY, String(collapsed));
	});

	$effect(() => {
		if (autoPopOnError && collapsed && $unreadErrorCount > 0) {
			collapsed = false;
			markErrorsRead();
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
			if (typeof window !== 'undefined') localStorage.removeItem(clientConfig.storageKey);
			showToast('Log persistence disabled');
		} else {
			terminalStore.rePersist();
			showToast('Log persistence enabled');
		}
	}

	function handleClearSavedRecords() {
		if (typeof window !== 'undefined') localStorage.removeItem(clientConfig.storageKey);
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

	let colWidths = $state<Record<string, number>>({ ...DEFAULT_COL_WIDTHS });
	let selectedLog = $state<ParsedLog | null>(null);

	$effect(() => {
		if (selectedLog) {
			colWidths = { ...COMPACT_COL_WIDTHS };
		} else {
			colWidths = { ...DEFAULT_COL_WIDTHS };
		}
	});

	let logsContainerEl = $state<HTMLDivElement | null>(null);
	let inspectWidth = $state(420);
	let isResizingInspect = $state(false);

	let panelHeight = $state(450);
	let isResizingHeight = $state(false);

	function handleHeightResizeStart(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (fullscreen) return;
		isResizingHeight = true;
		const startY = e.clientY;
		const startHeight = panelHeight;

		const minHeight = 150;
		const maxHeight = Math.max(minHeight, Math.floor(window.innerHeight * 0.95));

		function onMouseMove(moveEvent: MouseEvent) {
			const delta = startY - moveEvent.clientY;
			panelHeight = Math.min(Math.max(startHeight + delta, minHeight), maxHeight);
		}

		function onMouseUp() {
			isResizingHeight = false;
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
			document.body.style.userSelect = '';
			document.body.style.cursor = '';
		}

		document.body.style.userSelect = 'none';
		document.body.style.cursor = 'ns-resize';
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	}

	function handleInspectResizeStart(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		isResizingInspect = true;
		const startX = e.clientX;
		const startWidth = inspectWidth;
		const containerWidth = logsContainerEl?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1000);

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

		if (filterMethod === 'NETWORK_ONLY') {
			result = result.filter((l) => l.method !== '-');
		} else if (filterMethod === 'LOGS_ONLY') {
			result = result.filter((l) => l.method === '-');
		} else if (filterMethod !== 'ALL') {
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
		if (sortColumn === col.key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = col.key as SortKey;
			sortDir = 'desc';
		}
	}

	function toggleLogExpanded(idx: number) {
		if (selectedLog && selectedLog.index === idx) {
			selectedLog = null;
		} else {
			selectedLog = parsedLogs.find(l => l.index === idx) || null;
		}
	}

	function openTrace(log: ParsedLog) {
		selectedLog = log;
	}
</script>

{#if enabled}
	{#if !collapsed}
		<div
			class="fixed z-[2147483646] font-sans antialiased {className} {isDark ? 'dark' : 'li-light'} {fullscreen
				? 'inset-0 bg-theme-bg shadow-none rounded-none border-0'
				: 'bottom-0 left-0 right-0 border-t border-theme-border shadow-2xl bg-theme-bg'} flex flex-col overflow-hidden"
			style="color-scheme: {isDark ? 'dark' : 'light'}; {fullscreen ? '' : `height: ${panelHeight}px;`}"
		>
			<!-- Height resize handle -->
			{#if !fullscreen}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					onmousedown={handleHeightResizeStart}
					style="cursor: ns-resize;"
					class="h-1.5 shrink-0 bg-theme-border/40 hover:bg-indigo-500 active:bg-indigo-600 cursor-ns-resize cursor-row-resize transition-colors z-10 flex items-center justify-center group select-none"
					title="Drag to resize panel height"
				>
					<div class="w-8 h-0.5 bg-theme-text-muted/30 group-hover:bg-white rounded-full"></div>
				</div>
			{/if}

			<LogInspectorToolbar
				searchQuery={searchQuery}
				filterMethod={filterMethod}
				filterStatus={filterStatus}
				filterTag={filterTag}
				filterInitiator={filterInitiator}
				tagOptions={tagOptions}
				initiatorOptions={initiatorOptions}
				showSettings={showSettings}
				isDark={isDark}
				persistEnabled={persistEnabled}
				openOnStartup={openOnStartup}
				autoPopOnError={autoPopOnError}
				savedRecordsLimit={savedRecordsLimit}
				pingThreshold={pingThreshold}
				sizeThreshold={sizeThreshold}
				logExternal={logExternal}
				showLayoutControls={showLayoutControls}
				showActionButtons={showActionButtons}
				fullscreen={fullscreen}
				collapsed={collapsed}
				onSearchChange={(q) => (searchQuery = q)}
				onMethodChange={(m) => (filterMethod = m)}
				onStatusChange={(s) => (filterStatus = s)}
				onTagChange={(t) => (filterTag = t)}
				onInitiatorChange={(i) => (filterInitiator = i)}
				onResetFilters={() => {
					searchQuery = '';
					filterMethod = 'ALL';
					filterStatus = 'ALL';
					filterTag = 'ALL';
					filterInitiator = 'ALL';
				}}
				onToggleSettings={() => (showSettings = !showSettings)}
				onToggleTheme={toggleTheme}
				onTogglePersist={handleTogglePersist}
				onToggleOpenOnStartup={() => (openOnStartup = !openOnStartup)}
				onToggleAutoPop={() => (autoPopOnError = !autoPopOnError)}
				onLimitChange={handleLimitChange}
				onClearSavedRecords={handleClearSavedRecords}
				onPingThresholdChange={(v) => (pingThreshold = v)}
				onSizeThresholdChange={(v) => (sizeThreshold = v)}
				onToggleLogExternal={() => (logExternal = !logExternal)}
				onCopyAll={(e) => copyText($terminalStore.map((l) => `[${l.timestamp}] ${l.message}${l.details ? '\n' + l.details : ''}`).join('\n\n'), e)}
				onClearAll={handleClear}
				onToggleFullscreen={toggleFullscreen}
			/>

			<!-- LOG CONTENT AREA (TOP FLEX WRAPPER) -->
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
		</div>

		<!-- Toast container -->
		{#if toastMsg}
			<div class="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-indigo-500 text-white rounded shadow-lg text-sm z-[2147483647] pointer-events-none animate-fade-in {className}">
				{toastMsg}
			</div>
		{/if}
	{/if}

	<FloatingDockButton
		{collapsed}
		setCollapsed={(c) => (collapsed = c)}
		markErrorsRead={markErrorsRead}
		{isDark}
		{enabled}
		setEnabled={(e) => (enabled = e)}
		class={className}
	/>
{/if}
