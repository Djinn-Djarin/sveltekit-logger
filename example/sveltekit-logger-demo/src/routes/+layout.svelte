<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { initClientLogging } from '@djarin/sveltekit-inspect/client';
	import LogInspector from '@djarin/sveltekit-inspect';

	let { children } = $props();

	$effect(() => {
		const cleanup = initClientLogging();
		return cleanup;
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

<LogInspector />
