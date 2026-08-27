<script lang="ts">
	// Minimal inline-icon component (Lucide-style paths). Keeps the package
	// dependency-free so it works in any Svelte project without icon packages.
	const ICONS: Record<string, string> = {
		search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
		x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
		'chevron-up': '<path d="m18 15-6-6-6 6"/>',
		'chevron-down': '<path d="m6 9 6 6 6-6"/>',
		'chevron-right': '<path d="m9 18 6-6-6-6"/>',
		copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
		'arrow-up-right': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
		'arrow-down-left': '<path d="M17 7 7 17"/><path d="M17 17H7V7"/>',
		database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
		terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
		'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
		info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
		'trash-2': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
		logs: '<path d="M13 12h8"/><path d="M13 18h8"/><path d="M13 6h8"/><path d="M17 12h.01"/><path d="M17 18h.01"/><path d="M17 6h.01"/><path d="M3 12h1"/><path d="M3 18h1"/><path d="M3 6h1"/>',
		maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
		minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
		'square-chevron-right': '<path d="m9 18 6-6-6-6"/><path d="M5 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/>',
		circle: '<circle cx="12" cy="12" r="10"/>'
	};

	let { name = 'search', size = 16, class: className = '' }: { name?: string; size?: number; class?: string } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
	aria-hidden="true"
>
	{@html ICONS[name] ?? ICONS.search}
</svg>