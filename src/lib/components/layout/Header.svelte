<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
	import { sidebarStore } from '$lib/stores/sidebar.svelte';
	import { icloudStore } from '$lib/stores/icloud.svelte';
	import { syncStore } from '$lib/stores/sync.svelte';
	import { Sun, Moon, RefreshCw, Settings, KeyRound } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';

	let syncing = $state(false);

	const hasSyncEnabled = $derived(icloudStore.enabled || syncStore.config.enabled);

	async function forceSync() {
		if (syncing) return;
		syncing = true;

		try {
			// Trigger sync for both iCloud and PostgreSQL if enabled
			if (icloudStore.enabled) {
				await icloudStore.syncAll();
			}
			// PostgreSQL sync is handled by the syncStore automatically
		} catch (e) {
			console.error('Force sync failed:', e);
		} finally {
			syncing = false;
		}
	}
</script>

<header class="flex h-12 items-center justify-between border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" data-tauri-drag-region>
	<!-- Left: App Title -->
	<div class="flex items-center gap-2 px-4" data-tauri-drag-region>
		<a href="/" class="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent-600 to-accent-500 transition-all hover:from-accent-500 hover:to-accent-400" title="Home">
			<svg width="18" height="18" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M8.5 4 Q6 4 6 6.5 L6 9.5 Q6 11 4 11 Q6 11 6 12.5 L6 15.5 Q6 18 8.5 18" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
				<path d="M13.5 4 Q16 4 16 6.5 L16 9.5 Q16 11 18 11 Q16 11 16 12.5 L16 15.5 Q16 18 13.5 18" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
				<circle cx="11" cy="11" r="1.2" fill="white" />
			</svg>
		</a>
		<h1 class={cn('font-semibold text-slate-800 transition-all duration-200 dark:text-slate-200', sidebarStore.collapsed ? 'text-sm' : 'text-base')} data-tauri-drag-region>Dev Tools Suite</h1>
	</div>

	<!-- Right: Actions -->
	<div class="flex items-center gap-1 px-2">
		<!-- Password Required Warning -->
		{#if icloudStore.needsPassword}
			<a
				href="/tools/settings"
				class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
				title="Enter encryption password to enable iCloud sync"
			>
				<KeyRound class="h-3.5 w-3.5" />
				<span class="hidden sm:inline">Password required</span>
			</a>
		{/if}

		<!-- Force Sync Button (only if any sync is enabled and can sync) -->
		{#if hasSyncEnabled && !icloudStore.needsPassword}
			<button
				onclick={forceSync}
				disabled={syncing}
				class="rounded-lg p-2.5 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:hover:bg-slate-800"
				title="Force sync"
				aria-label="Force sync"
			>
				<RefreshCw class={cn('h-4 w-4 text-slate-500 dark:text-slate-400', syncing && 'animate-spin')} />
			</button>
		{/if}

		<!-- Settings Button -->
		<a href="/tools/settings" class="rounded-lg p-2.5 transition-colors hover:bg-slate-200 dark:hover:bg-slate-800" title="Settings" aria-label="Settings">
			<Settings class="h-4 w-4 text-slate-500 dark:text-slate-400" />
		</a>

		<!-- Theme Toggle -->
		<button
			onclick={() => themeStore.toggle()}
			class="rounded-lg p-2.5 transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
			title={themeStore.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
			aria-label={themeStore.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
		>
			{#if themeStore.value === 'dark'}
				<Sun class="h-4 w-4 text-slate-500 dark:text-slate-400" />
			{:else}
				<Moon class="h-4 w-4 text-slate-500 dark:text-slate-400" />
			{/if}
		</button>
	</div>
</header>
