<script lang="ts">
	let terminalLines: string[] = $state([
		'Welcome to SvelteKit Logger Demo.',
		'Waiting for events...'
	]);
	let terminalContainer: HTMLDivElement;

	function addTerminalLine(line: string, type: 'info' | 'success' | 'error' = 'info') {
		const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
		
		let colorClass = 'text-slate-700';
		if (type === 'success') colorClass = 'text-emerald-600';
		if (type === 'error') colorClass = 'text-rose-600';

		terminalLines = [...terminalLines, `<span class="text-slate-400">[${timestamp}]</span> <span class="${colorClass}">${line}</span>`];
		
		setTimeout(() => {
			if (terminalContainer) {
				terminalContainer.scrollTop = terminalContainer.scrollHeight;
			}
		}, 10);
	}

	async function makeFetch() {
		try {
			const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current_weather=true');
			const data = await res.json();
			addTerminalLine(`Weather: ${data.current_weather.temperature}°C, Wind: ${data.current_weather.windspeed}km/h`, 'info');
		} catch (e: any) {
			console.error("Fetch failed", e);
			addTerminalLine(`Error: ${e.message}`, 'error');
		}
	}

	function doLog() {
		const msg = "This is a test log from the client!";
		const data = { some: "data" };
		console.log(msg, data);
		addTerminalLine(`console.log("${msg}", ${JSON.stringify(data)})`, 'info');
	}

	function doError() {
		const msg = "Oops! Something went wrong on the client.";
		console.error(msg);
		addTerminalLine(`console.error("${msg}")`, 'error');
	}

	async function callApiRoute() {
		try {
			const res = await fetch('/api/hello', {
				method: 'POST',
				body: JSON.stringify({ message: "Hello server!" })
			});
			const data = await res.json();
			addTerminalLine(`Response: ${JSON.stringify(data)}`, 'info');
		} catch (e: any) {
			addTerminalLine(`Error: ${e.message}`, 'error');
		}
	}
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-800 font-['Inter',sans-serif] selection:bg-indigo-500/20 flex flex-col">
	
	<!-- Header -->
	<header class="w-full relative z-50 px-6 py-4 flex items-center justify-center  border-b border-slate-200/60 bg-white/70 backdrop-blur-md">

		<nav class="flex items-center gap-15">
			<!-- NPM Link -->
			<a href="https://www.npmjs.com/package/@djarin/sveltekit-inspect" target="_blank" class="text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1.5 text-sm font-medium" title="NPM">
				<svg viewBox="0 0 780 250" class="h-4 w-auto fill-current"><path d="M240,250h100v-50h100V0H240V250z M340,50h50v100h-50V50z M480,0v200h100V50h50v150h50V50h50v150h50V0H480z M0,200h100V50h50v150h50V0H0V200z"></path></svg>
				<span class="hidden sm:inline mt-0.5">NPM</span>
			</a>
			
			<!-- StackBlitz Link -->
			<a href="https://stackblitz.com/edit/@djarin/sveltekit-inspect-demo" target="_blank" class="text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1.5 text-sm font-medium" title="StackBlitz">
				<svg viewBox="0 0 28 28" class="h-5 w-auto fill-current"><path d="M12.747 16.273h-7.46L18.925 1.5l-3.671 10.227h7.46L9.075 26.5l3.671-10.227z"></path></svg>
				<span class="hidden sm:inline">StackBlitz</span>
			</a>
			
			<!-- GitHub Link -->
			<a href="https://github.com/Djinn-Djarin/@djarin/sveltekit-inspect" target="_blank" class="text-slate-500 hover:text-slate-900 transition-colors" title="GitHub">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
			</a>
		</nav>
	</header>

	<div class="flex-1 p-4 sm:p-8 md:p-12 lg:p-16 flex flex-col items-center justify-center relative">
		<!-- Background glow (Light Mode Variant) -->
	<div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
		<div class="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[100px]"></div>
		<div class="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/15 blur-[100px]"></div>
	</div>

	<div class="relative z-10 w-full max-w-6xl mx-auto">
		
		<div class="mb-12 text-center">
	
			<h1 class="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
				SvelteKit Logger
			</h1>
			<p class="text-slate-500 text-lg max-w-2xl mx-auto">
				Trigger actions on the left to see local output in the terminal, and watch the SvelteKit logger catch them globally.
			</p>
		</div>

		<!-- Two Panel Layout -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
			
			<!-- Left Panel: Actions (Tabs/Buttons) -->
			<div class="lg:col-span-5 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
				<div class="p-6 border-b border-slate-100 bg-slate-50/50">
					<h2 class="text-lg font-semibold text-slate-800">Event Triggers</h2>
					<p class="text-sm text-slate-500 mt-1">Fire network and console events</p>
				</div>
				
				<div class="p-6 flex-1 flex flex-col gap-3">
					<!-- Action: Log -->
					<button 
						onclick={doLog}
						class="group relative w-full flex items-center justify-between px-4 py-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all duration-200 cursor-pointer text-left shadow-sm hover:shadow"
					>
						<div class="flex items-center gap-4">
							<div class="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
							</div>
							<div>
								<div class="font-medium text-slate-800 group-hover:text-blue-700 transition-colors">Client Log</div>
								<div class="text-xs text-slate-400 mt-0.5 font-['JetBrains_Mono',monospace]">console.log()</div>
							</div>
						</div>
					</button>

					<!-- Action: Error -->
					<button 
						onclick={doError}
						class="group relative w-full flex items-center justify-between px-4 py-4 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-all duration-200 cursor-pointer text-left shadow-sm hover:shadow"
					>
						<div class="flex items-center gap-4">
							<div class="p-2.5 bg-rose-50 text-rose-600 rounded-lg group-hover:scale-110 transition-transform">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
							</div>
							<div>
								<div class="font-medium text-slate-800 group-hover:text-rose-700 transition-colors">Throw Error</div>
								<div class="text-xs text-slate-400 mt-0.5 font-['JetBrains_Mono',monospace]">console.error()</div>
							</div>
						</div>
					</button>

					<!-- Action: External Fetch -->
					<button 
						onclick={makeFetch}
						class="group relative w-full flex items-center justify-between px-4 py-4 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl transition-all duration-200 cursor-pointer text-left shadow-sm hover:shadow"
					>
						<div class="flex items-center gap-4">
							<div class="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3z"/></svg>
							</div>
							<div>
								<div class="font-medium text-slate-800 group-hover:text-emerald-700 transition-colors">External Fetch</div>
								<div class="text-xs text-slate-400 mt-0.5 font-['JetBrains_Mono',monospace] truncate max-w-[200px]" title="GET api.open-meteo.com/v1/forecast">GET open-meteo.com/v1/forecast</div>
							</div>
						</div>
					</button>

					<!-- Action: API Route -->
					<button 
						onclick={callApiRoute}
						class="group relative w-full flex items-center justify-between px-4 py-4 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-200 rounded-xl transition-all duration-200 cursor-pointer text-left shadow-sm hover:shadow"
					>
						<div class="flex items-center gap-4">
							<div class="p-2.5 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
							</div>
							<div>
								<div class="font-medium text-slate-800 group-hover:text-purple-700 transition-colors">Internal API Call</div>
								<div class="text-xs text-slate-400 mt-0.5 font-['JetBrains_Mono',monospace]">POST /api/hello</div>
							</div>
						</div>
					</button>
				</div>
			</div>

			<!-- Right Panel: Terminal Simulator (Light Mode) -->
			<div class="lg:col-span-7 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden h-full">
				<!-- Terminal Header -->
				<div class="flex items-center justify-right px-4 py-3 bg-slate-50/50 border-b border-slate-100">
			
					<button 
						onclick={() => terminalLines = []} 
						class="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer border-0 bg-transparent"
						title="Clear terminal"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
						Clear
					</button>
				</div>
				
				<!-- Terminal Output Body -->
				<div 
					bind:this={terminalContainer}
					class="flex-1 min-h-0 p-6 overflow-y-auto font-['JetBrains_Mono',monospace] text-[13px] leading-relaxed tracking-wide space-y-1.5 bg-[#fdfdfd]"
				>
					{#each terminalLines as line}
						<div class="break-words">
							{@html line}
						</div>
					{/each}
				</div>
			</div>
			
		</div>

		<!-- Features Section -->
		<div class="mt-24 mb-8">
			<h2 class="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-12">Why use SvelteKit Logger?</h2>
			<div class="grid grid-cols-3 gap-6 lg:gap-8">
				
				<div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-transform duration-300">
					<div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-5">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 16 20 6-6-20-20 6 6 20z"/><path d="M12 12v.01"/></svg>
					</div>
					<h3 class="text-xl font-semibold text-slate-800 mb-2.5">Zero Config Setup</h3>
					<p class="text-slate-500 leading-relaxed">No need to rewrite your existing fetches or console calls. Simply plug it into Vite and it instantly intercepts and formats everything.</p>
				</div>

				<div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-transform duration-300">
					<div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-5">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16v5" /><path d="M16 14.639V21" /><path d="M20 10.656V21" /><path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15" /><path d="M4 18.463V21" /><path d="M8 14.656V21" /></svg>
					</div>
					<h3 class="text-xl font-semibold text-slate-800 mb-2.5">Network Insights</h3>
					<p class="text-slate-500 leading-relaxed">Track every API route, external fetch, and server load request with complete headers, payloads, and response times in one sleek view.</p>
				</div>

				<div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-transform duration-300">
					<div class="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-5">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
					</div>
					<h3 class="text-xl font-semibold text-slate-800 mb-2.5">Smart Error Catching</h3>
					<p class="text-slate-500 leading-relaxed">Automatically pops open when critical errors occur. Trace errors directly to the exact file and line number that triggered them instantly.</p>
				</div>

			</div>
		</div>

	</div>
</div>
</div>
