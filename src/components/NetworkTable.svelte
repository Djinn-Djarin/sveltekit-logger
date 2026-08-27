<script lang="ts">
	import Icon from '@iconify/svelte';
	import { chevronUp, chevronDown, chevronRight, copy, alertCircle, alertTriangle } from './icons.js';
	import { getMethodBadgeClass, getReqSizeColorClass, getResSizeColorClass, getPendingElapsedMs, type LogColumn, type ParsedLog, type SortDir, type SortKey } from './logUtils.js';

	interface Props {
		logs: ParsedLog[];
		columns: LogColumn[];
		colWidths: Record<string, number>;
		sortColumn: SortKey;
		sortDir: SortDir;
		selectedIndex: number | null;
		onSort: (col: LogColumn) => void;
		onSelect: (log: ParsedLog) => void;
		onCopy: (text: string, e?: MouseEvent) => void;
		onToggleExpand: (index: number) => void;
		onResizeWidths: (widths: Record<string, number>) => void;
	}

	let {
		logs,
		columns,
		colWidths,
		sortColumn,
		sortDir,
		selectedIndex,
		onSort,
		onSelect,
		onCopy,
		onToggleExpand,
		onResizeWidths
	}: Props = $props();

	let draggingCol = $state<string | null>(null);
	let dragNextCol = $state<string | null>(null);
	let dragStartX = 0;
	let dragStartWidth = 0;
	let dragStartNextWidth = 0;

	// Need a dummy nowMs for pending elapsed time. Or just read from Date.now() / pass as prop.
	// We'll just pass nowMs via effect or use Date.now() since it's just for display.
	let nowMs = $state(typeof performance !== 'undefined' ? performance.now() : Date.now());

	$effect(() => {
		let animId: number;
		function tick() {
			nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
			animId = requestAnimationFrame(tick);
		}
		animId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(animId);
	});

	function startColResize(e: MouseEvent, col: string) {
		e.preventDefault();
		e.stopPropagation();

		const colIndex = columns.findIndex((c) => c.key === col);
		if (colIndex === -1 || colIndex >= columns.length - 1) return;

		const nextCol = columns[colIndex + 1].key;

		draggingCol = col;
		dragNextCol = nextCol;
		dragStartX = e.clientX;
		dragStartWidth = colWidths[col] ?? 120;
		dragStartNextWidth = colWidths[nextCol] ?? 120;

		window.addEventListener('mousemove', onColResizeMove);
		window.addEventListener('mouseup', endColResize);
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	}

	function onColResizeMove(e: MouseEvent) {
		if (!draggingCol || !dragNextCol) return;
		const rawDelta = e.clientX - dragStartX;

		const minWidthCurrent = 48;
		const minWidthNext = 48;
		const totalPairWidth = dragStartWidth + dragStartNextWidth;

		let newCurrentWidth = Math.min(
			Math.max(dragStartWidth + rawDelta, minWidthCurrent),
			totalPairWidth - minWidthNext
		);
		let newNextWidth = totalPairWidth - newCurrentWidth;

		onResizeWidths({
			...colWidths,
			[draggingCol]: newCurrentWidth,
			[dragNextCol]: newNextWidth
		});
	}

	function endColResize() {
		draggingCol = null;
		dragNextCol = null;
		window.removeEventListener('mousemove', onColResizeMove);
		window.removeEventListener('mouseup', endColResize);
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
	}
</script>

<div class="flex-1 overflow-auto scrollbar-thin shrink-0">
	<table class="w-full table-fixed border-collapse text-left font-mono text-[11px] leading-snug">
		<thead class="sticky top-0 z-10 text-[10px] uppercase text-theme-text-muted select-none bg-theme-surface">
			<tr>
				{#each columns as col}
					{#if col.sortable}
						<th
							onclick={() => onSort(col)}
							style="width: {colWidths[col.key]}px"
							class="relative {col.grow ? '' : 'whitespace-nowrap'} py-1.5 px-4 cursor-pointer hover:text-theme-text-primary transition-colors"
						>
							<div class="flex items-center gap-1">
								<span>{col.label}</span>
								<span class="w-3 shrink-0 inline-flex">
									{#if sortColumn === col.key}
										<Icon icon={sortDir === 'asc' ? chevronUp : chevronDown} class="h-3 w-3 text-indigo-400" />
									{/if}
								</span>
							</div>
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								onmousedown={(e) => startColResize(e, col.key)}
								onclick={(e) => e.stopPropagation()}
								class="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-theme-accent/60 transition-colors"
							></div>
						</th>
					{:else}
						<th
							style="width: {colWidths[col.key]}px"
							class="relative py-1.5 px-4 text-center whitespace-nowrap"
						>
							{col.label}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								onmousedown={(e) => startColResize(e, col.key)}
								onclick={(e) => e.stopPropagation()}
								class="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-theme-accent/60 transition-colors"
							></div>
						</th>
					{/if}
				{/each}
			</tr>
		</thead>
		<tbody class="divide-y divide-theme-border/30">
			{#each logs as log}
				<tr
					onclick={() => onSelect(log)}
					class="cursor-pointer transition-colors {selectedIndex === log.index ? 'bg-theme-surface' : 'hover:bg-theme-surface/50'} group"
				>
					{#each columns as col}
						{#if col.key === 'timestamp'}
							<td style="width: {colWidths[col.key]}px" class="py-1 px-4 overflow-hidden max-w-0 text-ellipsis whitespace-nowrap text-theme-text-muted text-[10px]">
								[{log.timestamp}]
							</td>
						{:else if col.key === 'tag'}
							<td style="width: {colWidths[col.key]}px" class="py-1 px-4 overflow-hidden max-w-0 text-ellipsis whitespace-nowrap">
								<span class="text-[10px] text-theme-text-secondary">{log.tag}</span>
							</td>
						{:else if col.key === 'initiator'}
							<td style="width: {colWidths[col.key]}px" class="py-1 px-4 overflow-hidden max-w-0 text-ellipsis whitespace-nowrap">
								<span class="text-[10px] text-theme-text-secondary truncate block" title={log.initiator}>{log.initiator}</span>
							</td>
						{:else if col.key === 'method'}
							<td style="width: {colWidths[col.key]}px" class="py-1 px-4 overflow-hidden max-w-0 text-ellipsis whitespace-nowrap">
								{#if log.method !== '-'}
									<span class="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide {getMethodBadgeClass(log.method)}">
										{log.method}
									</span>
								{:else}
									<span class="text-theme-text-muted text-[10px]">-</span>
								{/if}
							</td>
						{:else if col.key === 'status'}
							<td style="width: {colWidths[col.key]}px" class="py-1 px-4 overflow-hidden max-w-0 text-ellipsis whitespace-nowrap">
								{#if log.isPending}
									<span class="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
										PENDING
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 text-[10px] font-semibold {log.isError ? 'text-rose-400' : log.isSuccess ? 'text-emerald-400' : 'text-theme-text-secondary'}">
										<span>{log.statusText}</span>
									</span>
								{/if}
							</td>
						{:else if col.key === 'duration'}
							<td style="width: {colWidths[col.key]}px" class="py-1 px-4 overflow-hidden max-w-0 text-ellipsis whitespace-nowrap font-mono text-[11px]">
								{#if log.isPending}
									<span class="text-amber-400 font-mono text-[11px] font-semibold">
										{getPendingElapsedMs(log.raw, nowMs)}ms
									</span>
								{:else if log.durationMs !== null}
									<span class={log.cached ? 'text-indigo-400 font-semibold' : log.durationMs < 100 ? 'text-emerald-400 font-semibold' : log.durationMs < 500 ? 'text-amber-400' : 'text-rose-400 font-bold'}>
										{log.durationText}
									</span>
								{:else}
									<span class="text-theme-text-muted">-</span>
								{/if}
							</td>
						{:else if col.key === 'size'}
							<td style="width: {colWidths[col.key]}px" class="py-1 px-4 overflow-hidden max-w-0 whitespace-nowrap font-mono text-[10px]">
								{#if log.isApiCall}
									<div class="flex items-center gap-1 w-full overflow-hidden" title="Request: {log.reqSizeText} | Response: {log.resSizeText}">
										<span class="{getReqSizeColorClass(log.reqSizeBytes)} shrink-0">{log.reqSizeText}</span>
										<span class="text-theme-text-muted shrink-0">/</span>
										<span class="{getResSizeColorClass(log.resSizeBytes)} truncate">{log.resSizeText}</span>
										{#if log.reqSizeBytes >= 50 * 1024 || log.resSizeBytes >= 50 * 1024}
											<span title="Heavy payload (>50KB)" class="shrink-0">
												<Icon icon={alertCircle} class="h-3 w-3 text-rose-500 inline" />
											</span>
										{:else if log.reqSizeBytes >= 10 * 1024 || log.resSizeBytes >= 10 * 1024}
											<span title="Large payload (>10KB)" class="shrink-0">
												<Icon icon={alertTriangle} class="h-3 w-3 text-amber-500 inline" />
											</span>
										{/if}
									</div>
								{:else}
									<span class="text-theme-text-muted text-[10px]">-</span>
								{/if}
							</td>
						{:else if col.key === 'url'}
							<td style="width: {colWidths[col.key]}px" class="py-1 px-4 overflow-hidden max-w-0 text-ellipsis font-mono text-theme-text-primary break-all whitespace-normal" title={log.url}>
								<span class={log.isError ? 'text-rose-300' : log.isPending ? 'text-amber-200 font-medium' : log.cached ? 'text-indigo-400/80' : 'text-theme-text-primary'}>
									{log.url}
								</span>
								{#if log.cached}
									<span class="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-indigo-500/15 text-indigo-300 border-indigo-500/30 uppercase tracking-wide inline-block">cached</span>
								{/if}
							</td>
						{:else}
							<td style="width: {colWidths[col.key]}px" class="py-1 px-4 overflow-hidden max-w-0 text-ellipsis text-center whitespace-nowrap">
								<div class="flex items-center justify-center gap-1">
									<button
										onclick={(e) => onCopy(log.raw.message + (log.raw.details ? '\n' + log.raw.details : ''), e)}
										class="p-1 text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-panel rounded cursor-pointer transition-colors"
										title="Copy log entry"
									>
										<Icon icon={copy} class="h-3 w-3" />
									</button>

									{#if log.raw.details}
										<button
											onclick={(e) => {
												e.stopPropagation();
												onToggleExpand(log.index);
											}}
											class="p-1 text-theme-text-muted hover:text-theme-accent hover:bg-theme-panel rounded cursor-pointer transition-colors"
											title={log.raw.expanded ? 'Hide Details' : 'Show Details'}
										>
											<Icon icon={log.raw.expanded ? chevronDown : chevronRight} class="h-3.5 w-3.5" />
										</button>
									{/if}
								</div>
							</td>
						{/if}
					{/each}
				</tr>

				{#if log.raw.details && log.raw.expanded}
					<tr class="bg-black/20 dark:bg-white/5 border-b border-theme-border">
						<td colspan="9" class="p-3">
							<div class="text-theme-text-secondary text-[11px] font-mono whitespace-pre-wrap bg-theme-bg/80 p-3 rounded border border-theme-border/50 max-h-60 overflow-y-auto">
								{log.raw.details}
							</div>
						</td>
					</tr>
				{/if}
			{:else}
				<tr>
					<td colspan="9" class="py-8 text-center text-theme-text-muted italic text-[11px]">
						No logs found matching filter criteria.
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
