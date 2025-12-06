<script lang="ts">
	import '../../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { invoke } from '@tauri-apps/api/core';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { stopwatch } from '$lib/stores/stopwatch.svelte';
	import { icloudStore } from '$lib/stores/icloud.svelte';
	import { bookmarksStore } from '$lib/stores/bookmarks.svelte';
	import { favoritesStore } from '$lib/stores/favorites.svelte';
	import { Lock, LockOpen, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';

	interface SystemStats {
		cpu_usage: number;
		ram_used_gb: string;
		disk_used_percent: number;
		disk_free_gb: string;
	}

	let { children } = $props();

	// System stats
	let cpuUsage = $state(0);
	let ramUsage = $state('0 GB');
	let diskUsage = $state('0%');

	// Unlock screen state
	let showUnlockScreen = $state(true);
	let unlockPassword = $state('');
	let showPassword = $state(false);
	let unlocking = $state(false);
	let unlockError = $state('');
	let initialized = $state(false);

	let statsInterval: ReturnType<typeof setInterval> | null = null;
	let syncInterval: ReturnType<typeof setInterval> | null = null;

	const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

	async function handleUnlock() {
		if (!unlockPassword.trim()) {
			unlockError = 'Password cannot be empty';
			return;
		}

		unlocking = true;
		unlockError = '';

		const success = await icloudStore.setEncryptionPassword(unlockPassword);

		if (success) {
			showUnlockScreen = false;
			unlockPassword = '';
			// Initialize stores now that we have the password
			await bookmarksStore.init();
			await favoritesStore.init();
		} else {
			unlockError = 'Failed to unlock. Please check your password.';
		}

		unlocking = false;
	}

	async function continueWithoutPassword() {
		showUnlockScreen = false;
		// Initialize stores (they will show limited data)
		await bookmarksStore.init();
		await favoritesStore.init();
	}

	async function syncAll() {
		if (!icloudStore.enabled) return;
		try {
			await Promise.all([bookmarksStore.sync(), favoritesStore.sync()]);
		} catch (e) {
			console.error('Failed to sync with iCloud:', e);
		}
	}

	function handleVisibilityChange() {
		if (document.visibilityState === 'visible') {
			syncAll();
		}
	}

	async function fetchStats() {
		try {
			const stats = await invoke<SystemStats>('get_system_stats');
			cpuUsage = stats.cpu_usage;
			ramUsage = stats.ram_used_gb;
			diskUsage = `${stats.disk_used_percent.toFixed(0)}%`;
		} catch (e) {
			console.error('Failed to fetch system stats:', e);
		}
	}

	onMount(async () => {
		// Initialize theme on mount
		document.documentElement.classList.add(themeStore.value);

		// Initialize stopwatch store (runs timer globally)
		stopwatch.init();

		// Fetch stats immediately and then every 2 seconds
		fetchStats();
		statsInterval = setInterval(fetchStats, 2000);

		// Initialize iCloud first to check encryption state
		await icloudStore.init();
		initialized = true;

		// If encryption needs password, don't initialize other stores yet
		// They will be initialized when user unlocks or continues without password
		if (!icloudStore.needsPassword) {
			showUnlockScreen = false;
			await bookmarksStore.init();
			await favoritesStore.init();
		}

		// Set up periodic sync (every 5 minutes)
		syncInterval = setInterval(syncAll, SYNC_INTERVAL_MS);

		// Sync when app regains focus
		document.addEventListener('visibilitychange', handleVisibilityChange);
	});

	onDestroy(() => {
		if (statsInterval) {
			clearInterval(statsInterval);
		}
		if (syncInterval) {
			clearInterval(syncInterval);
		}
		document.removeEventListener('visibilitychange', handleVisibilityChange);
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

{#if initialized && icloudStore.needsPassword && showUnlockScreen}
	<!-- Unlock Screen -->
	<div class="flex h-full min-h-screen flex-col items-center justify-center bg-white font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
		<div class="w-full max-w-md px-6">
			<div class="mb-8 flex flex-col items-center">
				<div class="mb-4 rounded-full bg-amber-100 p-4 dark:bg-amber-900/30">
					<Lock class="h-10 w-10 text-amber-600 dark:text-amber-400" />
				</div>
				<h1 class="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-100">Unlock Your Data</h1>
				<p class="text-center text-sm text-slate-500 dark:text-slate-400">Your iCloud data is encrypted. Enter your password to unlock and sync.</p>
			</div>

			<div class="space-y-4">
				<div>
					<label for="unlock-password" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"> Password </label>
					<div class="relative">
						<input
							id="unlock-password"
							type={showPassword ? 'text' : 'password'}
							bind:value={unlockPassword}
							placeholder="Enter your encryption password"
							onkeydown={(e) => e.key === 'Enter' && handleUnlock()}
							class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-10 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
							aria-label={showPassword ? 'Hide password' : 'Show password'}
						>
							{#if showPassword}
								<EyeOff class="h-4 w-4" />
							{:else}
								<Eye class="h-4 w-4" />
							{/if}
						</button>
					</div>
				</div>

				{#if unlockError}
					<div class="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
						<AlertTriangle class="h-4 w-4 flex-shrink-0 text-red-500" />
						<span class="text-sm text-red-700 dark:text-red-300">{unlockError}</span>
					</div>
				{/if}

				<button
					onclick={handleUnlock}
					disabled={!unlockPassword.trim() || unlocking}
					class={cn(
						'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium transition-all',
						unlockPassword.trim() && !unlocking ? 'bg-accent-500 text-white hover:bg-accent-600' : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800'
					)}
				>
					{#if unlocking}
						<Loader2 class="h-4 w-4 animate-spin" />
						Unlocking...
					{:else}
						<LockOpen class="h-4 w-4" />
						Unlock
					{/if}
				</button>

				<div class="relative">
					<div class="absolute inset-0 flex items-center">
						<div class="w-full border-t border-slate-200 dark:border-slate-700"></div>
					</div>
					<div class="relative flex justify-center text-xs">
						<span class="bg-white px-2 text-slate-400 dark:bg-slate-950">or</span>
					</div>
				</div>

				<button
					onclick={continueWithoutPassword}
					class="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 font-medium text-slate-600 transition-all hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50"
				>
					Continue without unlocking
				</button>

				<p class="text-center text-xs text-slate-400 dark:text-slate-500">Without unlocking, iCloud sync will be disabled and some features may not work.</p>
			</div>
		</div>
	</div>
{:else}
	<div class="flex h-full min-h-screen flex-col overflow-hidden bg-white font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
		<Header />

		<div class="flex flex-1 overflow-hidden">
			<Sidebar {cpuUsage} {ramUsage} {diskUsage} />

			<main class="flex-1 overflow-auto p-6">
				{@render children()}
			</main>
		</div>
	</div>

	<CommandPalette />
{/if}
