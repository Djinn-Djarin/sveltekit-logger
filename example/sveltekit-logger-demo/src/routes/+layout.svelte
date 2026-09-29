<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { initClientLogging } from 'sveltekit-inspect/client';
	import LogInspector from 'sveltekit-inspect';

	let { children } = $props();

	$effect(() => {
		const cleanup = initClientLogging();
		return cleanup;
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

<LogInspector />
