<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { sidebarStore } from '$lib/stores/sidebar.svelte';
	import { tools } from '$lib/stores/tools';
	import { favoritesStore } from '$lib/stores/favorites.svelte';
	import { cn } from '$lib/utils/cn';
	import * as Icons from 'lucide-svelte';
	import { PanelLeftClose, PanelLeft, Wrench, Cpu, HardDrive, MemoryStick, Search, Star } from 'lucide-svelte';

	interface Props {
		cpuUsage?: number;
		ramUsage?: string;
		diskUsage?: string;
	}

	let { cpuUsage = 0, ramUsage = '0 GB', diskUsage = '0%' }: Props = $props();

	let searchQuery = $state('');

	onMount(() => {
		favoritesStore.init();
	});

	const favoriteTools = $derived(tools.filter((tool) => favoritesStore.favorites.includes(tool.id)));

	const nonFavoriteTools = $derived(tools.filter((tool) => !favoritesStore.favorites.includes(tool.id)));

	const filteredFavorites = $derived(favoriteTools.filter((tool) => tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || tool.description.toLowerCase().includes(searchQuery.toLowerCase())));

	const filteredNonFavorites = $derived(
		nonFavoriteTools.filter((tool) => tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || tool.description.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	function getToolIcon(iconName: string) {
		// Using any here because lucide-svelte does not have proper types for dynamic access
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (Icons as Record<string, any>)[iconName] || Wrench;
	}

	function toggleFavorite(e: Event, toolId: string) {
		e.preventDefault();
		e.stopPropagation();
		favoritesStore.toggle(toolId);
	}
</script>

<aside class={cn('flex h-full flex-col border-r border-slate-200 bg-slate-50 transition-all duration-200 ease-out dark:border-slate-800 dark:bg-slate-900', sidebarStore.collapsed ? 'w-16' : 'w-60')}>
	<!-- Toggle Button -->
	<div class="border-b border-slate-200 p-3 dark:border-slate-800">
		<button
			onclick={() => sidebarStore.toggle()}
			class="flex w-full items-center justify-center rounded-lg p-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
			title={sidebarStore.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
		>
			{#if sidebarStore.collapsed}
				<PanelLeft class="h-5 w-5 text-slate-600 dark:text-slate-400" />
			{:else}
				<PanelLeftClose class="h-5 w-5 text-slate-600 dark:text-slate-400" />
			{/if}
		</button>
	</div>

	<!-- Search Input -->
	{#if !sidebarStore.collapsed}
		<div class="p-2">
			<div class="relative">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
				<input
					type="text"
					placeholder="Search tools..."
					bind:value={searchQuery}
					class="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
				/>
			</div>
		</div>
	{/if}

	<!-- Tools Navigation -->
	<nav class="flex-1 space-y-1 overflow-y-auto p-2">
		<!-- Favorites Section -->
		{#if filteredFavorites.length > 0}
			{#if !sidebarStore.collapsed}
				<div class="flex items-center gap-1 px-3 py-1 text-xs font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
					<Star class="h-3 w-3 fill-current" />
					Favorites
				</div>
			{/if}
			{#each filteredFavorites as tool (tool.id)}
				{@const isActive = $page.url.pathname === tool.route}
				{@const Icon = getToolIcon(tool.icon)}
				<a
					href={tool.route}
					class={cn(
						'group flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-150',
						'hover:scale-[1.02] hover:bg-slate-200 dark:hover:bg-slate-800',
						isActive && 'bg-accent-500/10 font-medium text-accent-600 dark:text-accent-400',
						!isActive && 'text-slate-700 dark:text-slate-300',
						sidebarStore.collapsed && 'justify-center px-2'
					)}
					title={sidebarStore.collapsed ? tool.name : undefined}
				>
					<Icon class="h-5 w-5 flex-shrink-0" />
					{#if !sidebarStore.collapsed}
						<span class="flex-1 truncate">{tool.name}</span>
						<button
							onclick={(e) => toggleFavorite(e, tool.id)}
							class="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-300 dark:hover:bg-slate-700"
							title="Remove from favorites"
						>
							<Star class="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
						</button>
					{/if}
				</a>
			{/each}
			{#if !sidebarStore.collapsed && filteredNonFavorites.length > 0}
				<div class="my-2 border-t border-slate-200 dark:border-slate-800"></div>
			{/if}
		{/if}

		<!-- All Tools -->
		{#each filteredNonFavorites as tool (tool.id)}
			{@const isActive = $page.url.pathname === tool.route}
			{@const Icon = getToolIcon(tool.icon)}
			<a
				href={tool.route}
				class={cn(
					'group flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-150',
					'hover:scale-[1.02] hover:bg-slate-200 dark:hover:bg-slate-800',
					isActive && 'bg-accent-500/10 font-medium text-accent-600 dark:text-accent-400',
					!isActive && 'text-slate-700 dark:text-slate-300',
					sidebarStore.collapsed && 'justify-center px-2'
				)}
				title={sidebarStore.collapsed ? tool.name : undefined}
			>
				<Icon class="h-5 w-5 flex-shrink-0" />
				{#if !sidebarStore.collapsed}
					<span class="flex-1 truncate">{tool.name}</span>
					<button
						onclick={(e) => toggleFavorite(e, tool.id)}
						class="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-300 dark:hover:bg-slate-700"
						title="Add to favorites"
					>
						<Star class="h-3.5 w-3.5 text-slate-400 hover:text-yellow-500" />
					</button>
				{/if}
			</a>
		{/each}

		{#if filteredFavorites.length === 0 && filteredNonFavorites.length === 0 && !sidebarStore.collapsed}
			<div class="px-3 py-4 text-center text-sm text-slate-400 dark:text-slate-500">No tools found</div>
		{/if}
	</nav>

	<!-- System Stats Footer -->
	<div class="flex-shrink-0 space-y-2 border-t border-slate-200 p-3 dark:border-slate-800">
		<div class={cn('flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400', sidebarStore.collapsed && 'flex-col gap-1')} title="CPU Usage">
			<Cpu class="h-4 w-4 flex-shrink-0" />
			{#if !sidebarStore.collapsed}
				<span>CPU:</span>
				<span class="ml-auto font-mono">{cpuUsage.toFixed(0)}%</span>
			{:else}
				<span class="font-mono text-[10px]">{cpuUsage.toFixed(0)}%</span>
			{/if}
		</div>

		<div class={cn('flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400', sidebarStore.collapsed && 'flex-col gap-1')} title="RAM Usage">
			<MemoryStick class="h-4 w-4 flex-shrink-0" />
			{#if !sidebarStore.collapsed}
				<span>RAM:</span>
				<span class="ml-auto font-mono">{ramUsage}</span>
			{:else}
				<span class="font-mono text-[10px]">{ramUsage}</span>
			{/if}
		</div>

		<div class={cn('flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400', sidebarStore.collapsed && 'flex-col gap-1')} title="Disk Usage">
			<HardDrive class="h-4 w-4 flex-shrink-0" />
			{#if !sidebarStore.collapsed}
				<span>Disk:</span>
				<span class="ml-auto font-mono">{diskUsage}</span>
			{:else}
				<span class="font-mono text-[10px]">{diskUsage}</span>
			{/if}
		</div>
	</div>
</aside>
