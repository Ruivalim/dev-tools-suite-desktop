<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { Search } from 'lucide-svelte';
	import * as icons from 'lucide-svelte';
	import { tools } from '$lib/stores/tools';
	import { cn } from '$lib/utils/cn';

	let isOpen = $state(false);
	let searchQuery = $state('');
	let selectedIndex = $state(0);
	let inputRef: HTMLInputElement;

	const filteredTools = $derived.by(() => {
		if (!searchQuery.trim()) return tools;
		const query = searchQuery.toLowerCase();
		return tools.filter((t) => t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query));
	});

	function open() {
		isOpen = true;
		searchQuery = '';
		selectedIndex = 0;
		setTimeout(() => inputRef?.focus(), 10);
	}

	function close() {
		isOpen = false;
		searchQuery = '';
		selectedIndex = 0;
	}

	function handleKeydown(e: KeyboardEvent) {
		// Open with Cmd+K or Ctrl+K
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			if (isOpen) {
				close();
			} else {
				open();
			}
			return;
		}

		if (!isOpen) return;

		switch (e.key) {
			case 'Escape':
				e.preventDefault();
				close();
				break;
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, filteredTools.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				break;
			case 'Enter':
				e.preventDefault();
				if (filteredTools[selectedIndex]) {
					navigateTo(filteredTools[selectedIndex].route);
				}
				break;
		}
	}

	function navigateTo(route: string) {
		close();
		goto(route);
	}

	// Reset selected index when filtered tools change
	$effect(() => {
		if (filteredTools.length > 0 && selectedIndex >= filteredTools.length) {
			selectedIndex = 0;
		}
	});

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
	});

	function getIcon(iconName: string) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (icons as Record<string, any>)[iconName] || icons.Wrench;
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[20vh]"
		tabindex="-1"
		role="dialog"
		aria-modal="true"
		onclick={(e) => e.target === e.currentTarget && close()}
		onkeydown={(e) => {
			if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
				e.preventDefault();
				close();
			}
		}}
	>
		<div class="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
			<!-- Search Input -->
			<div class="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
				<Search class="h-5 w-5 text-slate-400" />
				<input
					bind:this={inputRef}
					type="text"
					bind:value={searchQuery}
					placeholder="Search tools..."
					class="flex-1 bg-transparent text-lg text-slate-900 placeholder-slate-400 outline-none dark:text-slate-100"
				/>
				<div class="flex items-center gap-1">
					<kbd class="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800">esc</kbd>
				</div>
			</div>

			<!-- Results -->
			<div class="max-h-80 overflow-auto py-2">
				{#if filteredTools.length === 0}
					<div class="px-4 py-8 text-center text-slate-500">
						No tools found for "{searchQuery}"
					</div>
				{:else}
					{#each filteredTools as tool, index (tool.id)}
						{@const Icon = getIcon(tool.icon)}
						<button
							onclick={() => navigateTo(tool.route)}
							onmouseenter={() => (selectedIndex = index)}
							class={cn(
								'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
								index === selectedIndex ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
							)}
						>
							<div class={cn('rounded-lg p-2', index === selectedIndex ? 'bg-accent-500/20' : 'bg-slate-100 dark:bg-slate-800')}>
								<Icon class="h-4 w-4" />
							</div>
							<div class="min-w-0 flex-1">
								<div class="font-medium">{tool.name}</div>
								<div class="truncate text-sm text-slate-500 dark:text-slate-400">{tool.description}</div>
							</div>
							{#if index === selectedIndex}
								<kbd class="rounded bg-accent-500/20 px-1.5 py-0.5 text-xs font-medium text-accent-600 dark:text-accent-400">enter</kbd>
							{/if}
						</button>
					{/each}
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">
				<div class="flex items-center gap-4">
					<span class="flex items-center gap-1">
						<kbd class="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">↑</kbd>
						<kbd class="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">↓</kbd>
						to navigate
					</span>
					<span class="flex items-center gap-1">
						<kbd class="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">enter</kbd>
						to select
					</span>
				</div>
				<span class="flex items-center gap-1">
					<kbd class="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">⌘</kbd>
					<kbd class="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">K</kbd>
					to toggle
				</span>
			</div>
		</div>
	</div>
{/if}
