<script lang="ts">
	import { onMount } from 'svelte';
	import { Settings, Power, Monitor, Database, CheckCircle, XCircle, Loader2, CloudOff, Cloud, Lock, LockOpen, KeyRound, Eye, EyeOff } from 'lucide-svelte';
	import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
	import { syncStore } from '$lib/stores/sync.svelte';
	import { icloudStore } from '$lib/stores/icloud.svelte';
	import { cn } from '$lib/utils/cn';

	let autoStartEnabled = $state(false);
	let loading = $state(true);
	let togglingICloud = $state(false);

	// Encryption state
	let encryptionPassword = $state('');
	let settingPassword = $state(false);
	let passwordError = $state('');
	let showPassword = $state(false);

	// Sync form state
	let syncConnectionString = $state('');
	let testingConnection = $state(false);
	let testResult = $state<{ success: boolean; message: string } | null>(null);
	let savingSync = $state(false);

	onMount(async () => {
		try {
			autoStartEnabled = await isEnabled();
		} catch (e) {
			console.error('Failed to check autostart status:', e);
		}
		loading = false;

		// Initialize sync stores
		await syncStore.init();
		await icloudStore.init();

		if (syncStore.config.connectionString) {
			syncConnectionString = syncStore.config.connectionString;
		}
	});

	async function toggleICloudSync() {
		togglingICloud = true;
		try {
			await icloudStore.setEnabled(!icloudStore.config.enabled);
		} catch (e) {
			console.error('Failed to toggle iCloud sync:', e);
		}
		togglingICloud = false;
	}

	async function setEncryptionPassword() {
		if (!encryptionPassword.trim()) {
			passwordError = 'Password cannot be empty';
			return;
		}

		settingPassword = true;
		passwordError = '';

		const success = await icloudStore.setEncryptionPassword(encryptionPassword);

		if (success) {
			// Enable encryption and re-encrypt files
			await icloudStore.setEncryptionEnabled(true);
			encryptionPassword = '';
		} else {
			passwordError = 'Failed to set encryption password';
		}

		settingPassword = false;
	}

	async function disableEncryption() {
		await icloudStore.setEncryptionEnabled(false);
		await icloudStore.clearEncryptionKey();
	}

	async function toggleAutoStart() {
		try {
			if (autoStartEnabled) {
				await disable();
				autoStartEnabled = false;
			} else {
				await enable();
				autoStartEnabled = true;
			}
		} catch (e) {
			console.error('Failed to toggle autostart:', e);
		}
	}

	async function testSyncConnection() {
		if (!syncConnectionString.trim()) return;

		testingConnection = true;
		testResult = null;

		testResult = await syncStore.testConnection(syncConnectionString);
		testingConnection = false;
	}

	async function enableSync() {
		if (!syncConnectionString.trim()) return;

		savingSync = true;
		const result = await syncStore.enable(syncConnectionString);
		savingSync = false;

		if (result.success) {
			testResult = { success: true, message: 'Sync enabled! Notes will sync automatically.' };
		} else {
			testResult = result;
		}
	}

	async function disableSync() {
		await syncStore.disable();
		syncConnectionString = '';
		testResult = null;
	}

	function formatLastSync(timestamp: number): string {
		if (!timestamp) return 'Never';
		const date = new Date(timestamp);
		return date.toLocaleString('pt-BR');
	}
</script>

<div class="mx-auto max-w-2xl">
	<!-- Header -->
	<div class="mb-8 flex items-center gap-3">
		<div class="rounded-lg bg-accent-500/10 p-2">
			<Settings class="h-6 w-6 text-accent-500" />
		</div>
		<div>
			<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
			<p class="text-sm text-slate-600 dark:text-slate-400">Configure your DevToolsSuite preferences</p>
		</div>
	</div>

	<!-- Settings Sections -->
	<div class="space-y-6">
		<!-- Startup Section -->
		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
				<h2 class="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
					<Power class="h-4 w-4" />
					Startup
				</h2>
			</div>
			<div class="p-5">
				<div class="flex items-center justify-between">
					<div>
						<p class="font-medium text-slate-900 dark:text-slate-100">Launch at startup</p>
						<p class="text-sm text-slate-500 dark:text-slate-400">Automatically start DevToolsSuite when you log in</p>
					</div>
					<button
						onclick={toggleAutoStart}
						disabled={loading}
						aria-label="Toggle launch at startup"
						class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 dark:focus:ring-offset-slate-900"
						class:bg-accent-500={autoStartEnabled}
						class:bg-slate-300={!autoStartEnabled}
						class:dark:bg-slate-600={!autoStartEnabled}
					>
						<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" class:translate-x-6={autoStartEnabled} class:translate-x-1={!autoStartEnabled}></span>
					</button>
				</div>
			</div>
		</div>

		<!-- Encryption Section -->
		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
				<h2 class="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
					<Lock class="h-4 w-4" />
					Data Encryption
					{#if icloudStore.config.encryptionEnabled && icloudStore.hasEncryptionKey}
						<span class="ml-auto flex items-center gap-1 text-xs font-normal text-green-600 dark:text-green-400">
							<CheckCircle class="h-3 w-3" />
							Active
						</span>
					{:else if icloudStore.config.encryptionEnabled && !icloudStore.hasEncryptionKey}
						<span class="ml-auto flex items-center gap-1 text-xs font-normal text-amber-600 dark:text-amber-400">
							<KeyRound class="h-3 w-3" />
							Password required
						</span>
					{/if}
				</h2>
			</div>
			<div class="space-y-4 p-5">
				{#if icloudStore.needsPassword}
					<div class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
						<div class="flex items-start gap-3">
							<KeyRound class="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
							<div>
								<p class="font-medium text-amber-800 dark:text-amber-200">Encryption is locked</p>
								<p class="mt-1 text-sm text-amber-600 dark:text-amber-400">Enter your password to unlock iCloud sync. Without unlocking, sync is paused to protect your encrypted data.</p>
							</div>
						</div>
					</div>
				{:else}
					<p class="text-sm text-slate-500 dark:text-slate-400">
						Encrypt your iCloud data with AES-256-GCM. The password is used to derive an encryption key that stays in memory while the app is running.
					</p>
				{/if}

				{#if icloudStore.config.encryptionEnabled && icloudStore.hasEncryptionKey}
					<!-- Encryption is active -->
					<div class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
						<div class="flex items-start gap-3">
							<CheckCircle class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
							<div>
								<p class="font-medium text-green-800 dark:text-green-200">Encryption is active</p>
								<p class="mt-1 text-sm text-green-600 dark:text-green-400">Your iCloud data is being encrypted. The key will be cleared when you quit the app.</p>
							</div>
						</div>
					</div>

					<button
						onclick={disableEncryption}
						class="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
					>
						Disable Encryption
					</button>
				{:else}
					<!-- Encryption not active or needs unlock - show password form -->
					<div>
						<label for="encryption-password" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
							{icloudStore.needsPassword ? 'Password' : 'Encryption Password'}
						</label>
						<div class="relative">
							<input
								id="encryption-password"
								type={showPassword ? 'text' : 'password'}
								bind:value={encryptionPassword}
								placeholder={icloudStore.needsPassword ? 'Enter your password' : 'Enter a strong password'}
								onkeydown={(e) => e.key === 'Enter' && setEncryptionPassword()}
								class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
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
						{#if !icloudStore.needsPassword}
							<p class="mt-1 text-xs text-slate-400">Use the same password on all devices. You'll need to enter it each time you open the app.</p>
						{/if}
					</div>

					{#if passwordError}
						<div class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
							<XCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
							<span class="text-sm text-red-700 dark:text-red-300">{passwordError}</span>
						</div>
					{/if}

					<button
						onclick={setEncryptionPassword}
						disabled={!encryptionPassword.trim() || settingPassword}
						class={cn(
							'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
							encryptionPassword.trim() && !settingPassword ? 'bg-accent-500 text-white hover:bg-accent-600' : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800'
						)}
					>
						{#if settingPassword}
							<Loader2 class="h-4 w-4 animate-spin" />
							{icloudStore.needsPassword ? 'Unlocking...' : 'Enabling...'}
						{:else if icloudStore.needsPassword}
							<LockOpen class="h-4 w-4" />
							Unlock
						{:else}
							<Lock class="h-4 w-4" />
							Enable Encryption
						{/if}
					</button>
				{/if}
			</div>
		</div>

		<!-- iCloud Sync Section -->
		{#if icloudStore.available}
			<div class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
				<div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
					<h2 class="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
						<Cloud class="h-4 w-4" />
						iCloud Sync
						{#if icloudStore.config.enabled}
							<span class="ml-auto flex items-center gap-1 text-xs font-normal text-green-600 dark:text-green-400">
								<CheckCircle class="h-3 w-3" />
								Enabled
							</span>
						{/if}
					</h2>
				</div>
				<div class="p-5">
					<div class="flex items-center justify-between">
						<div>
							<p class="font-medium text-slate-900 dark:text-slate-100">Sync to iCloud Drive</p>
							<p class="text-sm text-slate-500 dark:text-slate-400">Automatically sync notes, bookmarks, and favorites across your Apple devices</p>
							{#if icloudStore.config.enabled && icloudStore.config.lastSync}
								<p class="mt-1 text-xs text-slate-400">
									Last sync: {formatLastSync(icloudStore.config.lastSync)}
								</p>
							{/if}
						</div>
						<button
							onclick={toggleICloudSync}
							disabled={togglingICloud}
							aria-label="Toggle iCloud sync"
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 dark:focus:ring-offset-slate-900"
							class:bg-accent-500={icloudStore.config.enabled}
							class:bg-slate-300={!icloudStore.config.enabled}
							class:dark:bg-slate-600={!icloudStore.config.enabled}
						>
							<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" class:translate-x-6={icloudStore.config.enabled} class:translate-x-1={!icloudStore.config.enabled}
							></span>
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- PostgreSQL Sync Section -->
		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
				<h2 class="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
					<Database class="h-4 w-4" />
					PostgreSQL Sync
					{#if syncStore.config.enabled}
						<span class="ml-auto flex items-center gap-1 text-xs font-normal text-green-600 dark:text-green-400">
							<Cloud class="h-3 w-3" />
							Connected
						</span>
					{:else}
						<span class="ml-auto flex items-center gap-1 text-xs font-normal text-slate-400">
							<CloudOff class="h-3 w-3" />
							Local only
						</span>
					{/if}
				</h2>
			</div>
			<div class="space-y-4 p-5">
				<p class="text-sm text-slate-500 dark:text-slate-400">Sync your data (Notes, etc.) to a PostgreSQL database. This is optional - your data is always saved locally first.</p>

				{#if syncStore.config.enabled}
					<!-- Sync is enabled - show status -->
					<div class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
						<div class="flex items-start gap-3">
							<CheckCircle class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
							<div class="min-w-0 flex-1">
								<p class="font-medium text-green-800 dark:text-green-200">Sync enabled</p>
								<p class="mt-1 truncate text-sm text-green-600 dark:text-green-400">
									{syncStore.config.connectionString.replace(/:[^:@]+@/, ':***@')}
								</p>
								<p class="mt-2 text-xs text-green-600 dark:text-green-400">
									Last sync: {formatLastSync(syncStore.config.lastSync)}
								</p>
							</div>
						</div>
					</div>

					<button
						onclick={disableSync}
						class="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
					>
						Disable Sync
					</button>
				{:else}
					<!-- Sync not enabled - show setup form -->
					<div>
						<label for="sync-connection" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"> PostgreSQL Connection String </label>
						<input
							id="sync-connection"
							type="text"
							bind:value={syncConnectionString}
							placeholder="postgres://user:password@host:5432/database"
							class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
						/>
					</div>

					{#if testResult}
						<div
							class={cn(
								'flex items-start gap-2 rounded-lg p-3',
								testResult.success ? 'border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
							)}
						>
							{#if testResult.success}
								<CheckCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
								<span class="text-sm text-green-700 dark:text-green-300">{testResult.message}</span>
							{:else}
								<XCircle class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
								<span class="text-sm text-red-700 dark:text-red-300">{testResult.message}</span>
							{/if}
						</div>
					{/if}

					<div class="flex gap-2">
						<button
							onclick={testSyncConnection}
							disabled={!syncConnectionString.trim() || testingConnection}
							class={cn(
								'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all',
								syncConnectionString.trim() && !testingConnection
									? 'border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
									: 'cursor-not-allowed border-slate-200 text-slate-400 dark:border-slate-800'
							)}
						>
							{#if testingConnection}
								<Loader2 class="h-4 w-4 animate-spin" />
								Testing...
							{:else}
								Test Connection
							{/if}
						</button>

						<button
							onclick={enableSync}
							disabled={!syncConnectionString.trim() || savingSync}
							class={cn(
								'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
								syncConnectionString.trim() && !savingSync ? 'bg-accent-500 text-white hover:bg-accent-600' : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800'
							)}
						>
							{#if savingSync}
								<Loader2 class="h-4 w-4 animate-spin" />
								Enabling...
							{:else}
								Enable Sync
							{/if}
						</button>
					</div>
				{/if}
			</div>
		</div>

		<!-- Appearance Section -->
		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
				<h2 class="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
					<Monitor class="h-4 w-4" />
					Appearance
				</h2>
			</div>
			<div class="p-5">
				<p class="text-sm text-slate-500 dark:text-slate-400">Toggle between dark and light mode using the button in the header.</p>
			</div>
		</div>

		<!-- About Section -->
		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="p-5">
				<div class="text-center">
					<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600">
						<span class="text-xl font-bold text-white">D</span>
					</div>
					<h3 class="font-semibold text-slate-900 dark:text-slate-100">DevToolsSuite</h3>
					<p class="text-sm text-slate-500 dark:text-slate-400">Version 0.1.0</p>
				</div>
			</div>
		</div>
	</div>
</div>
