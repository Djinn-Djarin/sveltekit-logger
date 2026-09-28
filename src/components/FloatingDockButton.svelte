<script lang="ts">
	import Icon from '@iconify/svelte';
	import { eye, eyeclosed } from './icons.js';
	
	interface Props {
		collapsed: boolean;
		setCollapsed: (v: boolean) => void;
		markErrorsRead: () => void;
		isDark: boolean;
		enabled: boolean;
		setEnabled: (v: boolean) => void;
		class?: string;
	}

	let props: Props = $props();

	let translateX = $state(0);
	let translateY = $state(0);
	let contextMenu = $state<{ x: number, y: number } | null>(null);

	let isDragging = false;
	let hasDragged = false;
	let startPos = { x: 0, y: 0 };
	let dragOffset = { x: 0, y: 0 };

	$effect(() => {
		if (contextMenu) {
			const closeMenu = () => { contextMenu = null; };
			window.addEventListener('click', closeMenu);
			window.addEventListener('contextmenu', closeMenu);
			return () => {
				window.removeEventListener('click', closeMenu);
				window.removeEventListener('contextmenu', closeMenu);
			};
		}
	});

	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		isDragging = true;
		hasDragged = false;
		startPos = { x: e.clientX, y: e.clientY };
		dragOffset = { x: translateX, y: translateY };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!isDragging) return;
		const dx = e.clientX - startPos.x;
		const dy = e.clientY - startPos.y;
		
		if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
			hasDragged = true;
		}
		
		if (hasDragged) {
			translateX = dragOffset.x + dx;
			translateY = dragOffset.y + dy;
		}
	}

	function onPointerUp(e: PointerEvent) {
		if (!isDragging) return;
		isDragging = false;
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
	}

	function handleClick(e: MouseEvent) {
		if (hasDragged) return;
		props.setCollapsed(!props.collapsed);
		props.markErrorsRead();
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		contextMenu = { x: e.clientX, y: e.clientY };
	}
</script>

<button
	id="li-floating-dock-btn"
	onclick={handleClick}
	oncontextmenu={handleContextMenu}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	style="
		position: fixed;
		top: 35%;
		right: 18px;
		z-index: 2147483647;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 30px;
		width: 30px;
		border-radius: 9999px;
		border-width: 2px;
		cursor: grab;
		transform: translate3d({translateX}px, {translateY}px, 0);
		touch-action: none;
	"
	class="bg-theme-surface border-theme-border shadow-2xl {props.isDark ? '' : 'li-light'} {props.class || ''}"
	title={props.collapsed ? "Open Log Inspector (Right-click to toggle ON/OFF)" : "Hide Log Inspector (Right-click to toggle ON/OFF)"}
>
	<Icon icon={props.collapsed ? eye : eyeclosed} class="h-4 w-4 text-theme-text-primary pointer-events-none" />
</button>

{#if contextMenu}
	<div
		style="
			position: fixed;
			top: {contextMenu.y}px;
			left: {contextMenu.x - 160 > 0 ? contextMenu.x - 160 : contextMenu.x}px;
			z-index: 2147483647;
		"
		class="bg-theme-surface border border-theme-border rounded-lg shadow-2xl py-1 w-40 text-li-body {props.isDark ? '' : 'li-light'}"
	>
		<button
			class="w-full text-left px-3 py-1.5 hover:bg-theme-panel text-theme-text-primary transition-colors flex items-center gap-2 cursor-pointer border-0 bg-transparent"
			onclick={(e) => {
				e.stopPropagation();
				if (props.enabled && !props.collapsed) {
					props.setCollapsed(true);
				} else if (!props.enabled && props.collapsed) {
					props.setCollapsed(false);
				}
				props.setEnabled(!props.enabled);
				contextMenu = null;
			}}
		>
			{#if props.enabled}
				<Icon icon={eyeclosed} class="h-3.5 w-3.5 text-rose-500" />
			{:else}
				<Icon icon={eye} class="h-3.5 w-3.5 text-emerald-500" />
			{/if}
			{props.enabled ? 'Disable Inspector' : 'Enable Inspector'}
		</button>
	</div>
{/if}
