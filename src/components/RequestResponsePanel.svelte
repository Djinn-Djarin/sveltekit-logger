<script lang="ts">
	import Icon from '@iconify/svelte';
	import {
		x,
		copy,
		arrowUpRight,
		arrowDownLeft,
		database,
		terminal,
		fileText,
		info,
		alertCircle,
		alertTriangle,
		loader2
	} from './icons.js';
	import {
		generateCurlCommand,
		getDisplayResponseBody,
		getMethodBadgeClass,
		getPendingElapsedMs,
		getReqSizeColorClass,
		getResSizeColorClass,
		getStatusBadgeClass,
		prettyJson,
		type ParsedLog
	} from './logUtils.js';

	interface Props {
		log: ParsedLog;
		onClose: () => void;
		onCopy: (text: string, e?: MouseEvent) => void;
	}

	let { log: selectedLog, onClose, onCopy }: Props = $props();

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

	let hasReq = $derived(selectedLog.requestBody !== undefined && selectedLog.requestBody !== null);
	let displayRes = $derived(getDisplayResponseBody(selectedLog));
	let hasRes = $derived(displayRes !== undefined && displayRes !== null);

	let activeTab = $state<'request' | 'response'>('request');

	function copyAll() {
		const reqBody = hasReq ? prettyJson(selectedLog.requestBody) : '';
		const resBody = hasRes ? (typeof displayRes === 'string' ? displayRes : prettyJson(displayRes)) : '';

		const parts: string[] = ['===== REQUEST ====='];
		parts.push(`${selectedLog.method} ${selectedLog.url}`);
		parts.push('Content-Type: application/json');
		parts.push(`Initiator: ${selectedLog.initiator}`);
		if (reqBody) parts.push(`\n${reqBody}`);

		parts.push(`\n===== RESPONSE =====`);
		parts.push(`Status: ${selectedLog.statusText}${selectedLog.cached ? ' (Cached)' : ''}`);
		if (selectedLog.durationMs !== null) parts.push(`Duration: ${selectedLog.durationText}`);
		if (resBody) parts.push(`\n${resBody}`);

		onCopy(parts.join('\n'));
	}

	function copyActiveTab() {
		if (activeTab === 'request') {
			if (hasReq) {
				onCopy(prettyJson(selectedLog.requestBody));
			} else {
				onCopy(`${selectedLog.method} ${selectedLog.url}\nInitiator: ${selectedLog.initiator}`);
			}
		} else {
			if (hasRes) {
				const resStr = typeof displayRes === 'string' ? displayRes : prettyJson(displayRes);
				onCopy(resStr);
			} else {
				onCopy(`Status: ${selectedLog.statusText}\nDuration: ${selectedLog.durationText}`);
			}
		}
	}
</script>

{#if selectedLog.isApiCall}
	<!-- HTTP API CALL INSPECT PANEL -->
	<!-- ROW 1: Method, URL, Status, Duration + Copy Both & cURL buttons -->
	<div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-theme-border/60 bg-theme-surface shrink-0">
		<div class="flex items-center gap-2 min-w-0 flex-1">
			<span class="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide shrink-0 {getMethodBadgeClass(selectedLog.method)}">
				{selectedLog.method}
			</span>
			<span class="font-mono text-[11px] text-theme-text-primary truncate flex-1" title={selectedLog.url}>{selectedLog.url}</span>
			{#if selectedLog.cached}
				<span class="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-indigo-500/15 text-indigo-400 border-indigo-500/30 uppercase tracking-wide shrink-0">cached</span>
			{/if}
			{#if selectedLog.isPending}
				<span class="text-[10px] font-bold text-amber-400 uppercase tracking-wide shrink-0">
					PENDING
				</span>
			{:else}
				<span class="text-[10px] font-semibold shrink-0 {selectedLog.isError ? 'text-rose-400' : selectedLog.isSuccess ? 'text-emerald-400' : 'text-theme-text-secondary'}">
					{selectedLog.statusText}
				</span>
			{/if}
			<span class="text-[10px] text-theme-text-muted shrink-0">{selectedLog.durationText}</span>
		</div>

		<div class="flex items-center gap-1 shrink-0">
			<button
				onclick={() => onCopy(generateCurlCommand(selectedLog))}
				class="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/15 rounded px-2 py-1 border border-indigo-500/30 flex items-center gap-1 cursor-pointer transition-colors"
				title="Copy request as cURL command"
			>
				<Icon icon={terminal} class="h-3 w-3" />
				<span>cURL</span>
			</button>
			<button
				onclick={copyAll}
				class="text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-panel rounded cursor-pointer p-1.5 transition-colors"
				title="Copy both request & response"
			>
				<Icon icon={copy} class="h-3.5 w-3.5" />
			</button>
			<button
				onclick={onClose}
				class="text-theme-text-muted hover:text-theme-text-primary p-0.5 rounded transition-colors ml-1 cursor-pointer"
				title="Close panel"
			>
				<Icon icon={x} class="h-3.5 w-3.5" />
			</button>
		</div>
	</div>

	<!-- ROW 2: REQUEST & RESPONSE Tabs + Size + Single Copy Icon for Active Tab -->
	<div class="flex items-center justify-between px-3 h-8 border-b border-theme-border/60 bg-theme-surface shrink-0">
		<div class="flex items-center h-full">
			<button
				onclick={() => activeTab = 'request'}
				class="flex items-center gap-1.5 px-3 h-full border-b-2 transition-all cursor-pointer text-[10px] font-semibold tracking-wide {activeTab === 'request' ? 'border-emerald-400 text-theme-text-primary' : 'border-transparent text-theme-text-muted hover:text-theme-text-secondary'}"
			>
				<Icon icon={arrowUpRight} class="h-3 w-3 text-emerald-400" />
				Request
			</button>
			<button
				onclick={() => activeTab = 'response'}
				class="flex items-center gap-1.5 px-3 h-full border-b-2 transition-all cursor-pointer text-[10px] font-semibold tracking-wide {activeTab === 'response' ? 'border-emerald-400 text-theme-text-primary' : 'border-transparent text-theme-text-muted hover:text-theme-text-secondary'}"
			>
				<Icon icon={arrowDownLeft} class="h-3 w-3 {selectedLog.isPending ? 'text-amber-400' : 'text-emerald-400'}" />
				Response
				{#if selectedLog.cached}
					<span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 lowercase">cached</span>
				{/if}
			</button>
		</div>

		<div class="flex items-center gap-2">
			<span class="text-[10px] font-mono inline-flex items-center gap-1" title="Request: {selectedLog.reqSizeText} | Response: {selectedLog.resSizeText}">
				<span class={getReqSizeColorClass(selectedLog.reqSizeBytes)}>{selectedLog.reqSizeText}</span>
				<span class="text-theme-text-muted">/</span>
				<span class={getResSizeColorClass(selectedLog.resSizeBytes)}>{selectedLog.resSizeText}</span>
				{#if selectedLog.reqSizeBytes >= 50 * 1024 || selectedLog.resSizeBytes >= 50 * 1024}
					<span title="Heavy payload (>50KB)">
						<Icon icon={alertCircle} class="h-3 w-3 text-rose-500 inline shrink-0" />
					</span>
				{:else if selectedLog.reqSizeBytes >= 10 * 1024 || selectedLog.resSizeBytes >= 10 * 1024}
					<span title="Large payload (>10KB)">
						<Icon icon={alertTriangle} class="h-3 w-3 text-amber-500 inline shrink-0" />
					</span>
				{/if}
			</span>
			<button
				onclick={copyActiveTab}
				class="text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-panel rounded cursor-pointer p-1.5 transition-colors"
				title="Copy active tab ({activeTab === 'request' ? 'Request' : 'Response'})"
			>
				<Icon icon={copy} class="h-3.5 w-3.5" />
			</button>
		</div>
	</div>

	<div class="flex-1 min-h-0 overflow-y-auto scrollbar-thin divide-y divide-theme-border/40">
		{#if activeTab === 'request'}
			<!-- Request Section -->
			<div class="flex flex-col">
				<div class="px-3 py-2 text-[11px] font-mono text-theme-text-secondary border-b border-theme-border/20 space-y-1 bg-theme-surface/30">
					<div class="flex gap-2">
						<span class="text-theme-text-muted shrink-0 w-24">Accept:</span>
						<span class="text-theme-text-secondary">application/json</span>
					</div>
					<div class="flex gap-2">
						<span class="text-theme-text-muted shrink-0 w-24">Content-Type:</span>
						<span class="text-theme-text-secondary">application/json</span>
					</div>
					<div class="flex gap-2">
						<span class="text-theme-text-muted shrink-0 w-24">Initiator:</span>
						<span class="text-theme-text-secondary break-all font-mono">{selectedLog.initiator}</span>
					</div>
				</div>
				{#if hasReq}
					<div class="p-3 bg-theme-panel/30">
						<div class="text-[10px] uppercase font-bold text-theme-text-muted tracking-wider pb-1 mb-1 border-b border-theme-border/20">
							Request Body
						</div>
						<pre class="font-mono text-[11px] leading-relaxed text-theme-text-primary whitespace-pre-wrap break-words">{prettyJson(selectedLog.requestBody)}</pre>
					</div>
				{:else}
					<div class="p-3 text-[11px] font-mono text-theme-text-muted italic">
						{selectedLog.method === 'GET' ? 'No request body (GET request).' : 'No request body captured.'}
					</div>
				{/if}
			</div>
		{:else}
			<!-- Response Section -->
			<div class="flex flex-col h-full">
				{#if selectedLog.isPending}
					<div class="flex-1 bg-theme-panel/20 text-center flex flex-col items-center justify-center gap-2.5 p-6 h-full min-h-[200px]">
						<div class="p-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
							<Icon icon={loader2} class="h-6 w-6 animate-spin" />
						</div>
						<div class="space-y-0.5">
							<div class="text-xs font-semibold text-amber-400">Request Pending</div>
							<div class="text-[11px] text-theme-text-muted">
								Promise in-flight ({getPendingElapsedMs(selectedLog.raw, nowMs)}ms). Response body will populate once backend resolves.
							</div>
						</div>
					</div>
				{:else if hasRes}
					{@const resStr = typeof displayRes === 'string' ? displayRes : prettyJson(displayRes)}
					<div class="p-3 bg-theme-panel/30">
						{#if selectedLog.cached}
							<div class="mb-2 px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded text-[10px] text-indigo-400 flex items-center gap-1.5">
								<Icon icon={database} class="h-3 w-3 shrink-0" />
								<span>Served from SSR Cache</span>
							</div>
						{/if}
						<pre class="font-mono text-[11px] leading-relaxed text-theme-text-primary whitespace-pre-wrap break-words">{resStr}</pre>
					</div>
				{:else}
					<div class="p-4 text-[11px] font-mono text-theme-text-muted italic">
						No response body captured.
					</div>
				{/if}
			</div>
		{/if}
	</div>
{:else}
	<!-- CONSOLE LOG DETAIL VIEW -->
	<div class="flex items-center justify-between px-3 py-1.5 border-b border-theme-border/60 bg-theme-surface shrink-0">
		<div class="flex items-center gap-2">
			<span class="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide {getStatusBadgeClass(selectedLog)}">
				{selectedLog.tag}
			</span>
			<span class="text-[11px] font-semibold text-theme-text-primary">Console Log Detail</span>
			<span class="text-[10px] text-theme-text-muted font-mono">[{selectedLog.timestamp}]</span>
		</div>
		<button
			onclick={onClose}
			class="text-theme-text-muted hover:text-theme-text-primary p-0.5 rounded transition-colors cursor-pointer"
			title="Close panel"
		>
			<Icon icon={x} class="h-3.5 w-3.5" />
		</button>
	</div>

	<div class="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 space-y-4 font-mono text-[11px]">
		<!-- Log Message Card -->
		<div class="bg-theme-bg border border-theme-border rounded-lg p-3 space-y-2">
			<div class="flex items-center justify-between text-[10px] uppercase font-bold text-theme-text-muted tracking-wider border-b border-theme-border/40 pb-1.5">
				<span class="flex items-center gap-1.5">
					<Icon icon={terminal} class="h-3.5 w-3.5 text-indigo-400" />
					Log Message
				</span>
				<button
					onclick={(e) => onCopy(selectedLog.message, e)}
					class="text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-surface rounded p-1 transition-colors flex items-center gap-1 normal-case font-normal cursor-pointer"
					title="Copy Message"
				>
					<Icon icon={copy} class="h-3 w-3" />
					<span>Copy</span>
				</button>
			</div>
			<div class="text-theme-text-primary text-[12px] font-mono leading-relaxed whitespace-pre-wrap break-words bg-theme-surface/50 p-2.5 rounded border border-theme-border/30">
				{selectedLog.message}
			</div>
		</div>

		<!-- Log Details / Context / Stack Trace Card (if present) -->
		{#if selectedLog.raw.details}
			<div class="bg-theme-bg border border-theme-border rounded-lg p-3 space-y-2">
				<div class="flex items-center justify-between text-[10px] uppercase font-bold text-theme-text-muted tracking-wider border-b border-theme-border/40 pb-1.5">
					<span class="flex items-center gap-1.5">
						<Icon icon={fileText} class="h-3.5 w-3.5 text-amber-400" />
						Context / Stack Trace
					</span>
					<button
						onclick={(e) => onCopy(selectedLog.raw.details || '', e)}
						class="text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-surface rounded p-1 transition-colors flex items-center gap-1 normal-case font-normal cursor-pointer"
						title="Copy Details"
					>
						<Icon icon={copy} class="h-3 w-3" />
						<span>Copy</span>
					</button>
				</div>
				<pre class="text-theme-text-secondary text-[11px] leading-relaxed whitespace-pre-wrap break-words bg-theme-surface/50 p-2.5 rounded border border-theme-border/30 max-h-60 overflow-y-auto">{selectedLog.raw.details}</pre>
			</div>
		{/if}

		<!-- Metadata Summary -->
		<div class="bg-theme-bg border border-theme-border rounded-lg p-3 space-y-2">
			<div class="text-[10px] uppercase font-bold text-theme-text-muted tracking-wider border-b border-theme-border/40 pb-1.5 flex items-center gap-1.5">
				<Icon icon={info} class="h-3.5 w-3.5 text-sky-400" />
				Log Properties
			</div>
			<div class="grid grid-cols-2 gap-2 text-[11px]">
				<div class="bg-theme-surface/40 p-2 rounded border border-theme-border/20">
					<span class="text-[10px] text-theme-text-muted block">Timestamp</span>
					<span class="text-theme-text-primary font-semibold">{selectedLog.timestamp}</span>
				</div>
				<div class="bg-theme-surface/40 p-2 rounded border border-theme-border/20">
					<span class="text-[10px] text-theme-text-muted block">Tag / Level</span>
					<span class="text-theme-text-primary font-semibold">{selectedLog.tag}</span>
				</div>
				<div class="bg-theme-surface/40 p-2 rounded border border-theme-border/20">
					<span class="text-[10px] text-theme-text-muted block">Initiator</span>
					<span class="text-theme-text-primary font-semibold">{selectedLog.initiator}</span>
				</div>
				<div class="bg-theme-surface/40 p-2 rounded border border-theme-border/20">
					<span class="text-[10px] text-theme-text-muted block">Status</span>
					<span class="font-semibold {selectedLog.isError ? 'text-rose-400' : selectedLog.isSuccess ? 'text-emerald-400' : 'text-theme-text-primary'}">{selectedLog.statusText}</span>
				</div>
			</div>
		</div>
	</div>
{/if}
