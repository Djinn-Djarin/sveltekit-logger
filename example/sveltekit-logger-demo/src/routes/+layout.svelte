<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { initClientLogging } from 'sveltekit-logger/client';
	import LogInspector from 'sveltekit-logger';

	let { children } = $props();

	$effect(() => {
		const cleanup = initClientLogging();
		return cleanup;
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

<LogInspector />
