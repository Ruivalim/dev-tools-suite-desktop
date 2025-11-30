<script lang="ts">
	import { Timer, Play, Pause, RotateCcw, Flag, Plus, X, Bell, BellOff, Volume2, VolumeX, AppWindow } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';
	import { stopwatch } from '$lib/stores/stopwatch.svelte';

	// Modal state (local only)
	let showAlertModal = $state(false);
	let newAlertMinutes = $state(25);
	let newAlertSeconds = $state(0);
	let newAlertLabel = $state('');

	// Presets
	const presets = [
		{ label: 'Pomodoro', minutes: 25 },
		{ label: 'Short Break', minutes: 5 },
		{ label: 'Long Break', minutes: 15 },
		{ label: '1 Hour', minutes: 60 }
	];

	function openAlertModal() {
		newAlertMinutes = 25;
		newAlertSeconds = 0;
		newAlertLabel = '';
		showAlertModal = true;
	}

	function closeAlertModal() {
		showAlertModal = false;
	}

	function handleAddAlert() {
		stopwatch.addAlert(newAlertMinutes, newAlertSeconds, newAlertLabel);
		closeAlertModal();
	}

	function formatTime(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		const centiseconds = Math.floor((ms % 1000) / 10);

		if (hours > 0) {
			return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
		}
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
	}

	function formatTimeShort(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		if (hours > 0) {
			return `${hours}h ${minutes}m ${seconds}s`;
		}
		if (minutes > 0) {
			return `${minutes}m ${seconds}s`;
		}
		return `${seconds}s`;
	}

	// Derived state for progress towards next alert
	let nextAlert = $derived.by(() => {
		const upcoming = stopwatch.alerts.filter((a) => a.enabled && !a.triggered && a.time > stopwatch.elapsed);
		return upcoming.length > 0 ? upcoming[0] : null;
	});

	let progress = $derived.by(() => {
		if (!nextAlert) return 0;
		return Math.min((stopwatch.elapsed / nextAlert.time) * 100, 100);
	});
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<Timer class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Stopwatch</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Track time with alerts and laps</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<button
				onclick={() => stopwatch.toggleSound()}
				class={cn('rounded-lg p-2 transition-colors', stopwatch.soundEnabled ? 'bg-accent-500/10 text-accent-500 hover:bg-accent-500/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800')}
				title={stopwatch.soundEnabled ? 'Sound on' : 'Sound off'}
			>
				{#if stopwatch.soundEnabled}
					<Volume2 class="h-5 w-5" />
				{:else}
					<VolumeX class="h-5 w-5" />
				{/if}
			</button>
			<button
				onclick={() => stopwatch.toggleNotifications()}
				class={cn(
					'rounded-lg p-2 transition-colors',
					stopwatch.notificationsEnabled ? 'bg-accent-500/10 text-accent-500 hover:bg-accent-500/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
				)}
				title={stopwatch.notificationsEnabled ? 'Notifications on' : 'Notifications off'}
			>
				{#if stopwatch.notificationsEnabled}
					<Bell class="h-5 w-5" />
				{:else}
					<BellOff class="h-5 w-5" />
				{/if}
			</button>
			<button
				onclick={() => stopwatch.toggleShowInTray()}
				class={cn('rounded-lg p-2 transition-colors', stopwatch.showInTray ? 'bg-accent-500/10 text-accent-500 hover:bg-accent-500/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800')}
				title={stopwatch.showInTray ? 'Show in system tray' : 'Hidden from system tray'}
			>
				<AppWindow class="h-5 w-5" />
			</button>
		</div>
	</div>

	<!-- Main Timer Display -->
	<div class="mb-4 flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
		<!-- Progress bar for next alert -->
		{#if nextAlert}
			<div class="mb-4">
				<div class="mb-1 flex items-center justify-between text-xs text-slate-500">
					<span>Next: {nextAlert.label}</span>
					<span>{formatTimeShort(nextAlert.time - stopwatch.elapsed)} remaining</span>
				</div>
				<div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
					<div class="h-full bg-accent-500 transition-all duration-100" style="width: {progress}%"></div>
				</div>
			</div>
		{/if}

		<!-- Time Display -->
		<div class="mb-8 text-center">
			<div class="font-mono text-6xl font-bold tracking-tight text-slate-900 md:text-8xl dark:text-slate-100">
				{formatTime(stopwatch.elapsed)}
			</div>
		</div>

		<!-- Controls -->
		<div class="flex items-center justify-center gap-4">
			{#if !stopwatch.isRunning}
				<button onclick={() => stopwatch.start()} class="flex items-center gap-2 rounded-xl bg-green-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-green-600">
					<Play class="h-5 w-5" />
					{stopwatch.elapsed > 0 ? 'Resume' : 'Start'}
				</button>
			{:else}
				<button onclick={() => stopwatch.pause()} class="flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-amber-600">
					<Pause class="h-5 w-5" />
					Pause
				</button>
			{/if}

			<button
				onclick={() => stopwatch.lap()}
				disabled={!stopwatch.isRunning}
				class={cn(
					'flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-colors',
					stopwatch.isRunning
						? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
						: 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800'
				)}
			>
				<Flag class="h-5 w-5" />
				Lap
			</button>

			<button
				onclick={() => stopwatch.reset()}
				disabled={stopwatch.elapsed === 0}
				class={cn(
					'flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-colors',
					stopwatch.elapsed > 0
						? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
						: 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800'
				)}
			>
				<RotateCcw class="h-5 w-5" />
				Reset
			</button>
		</div>
	</div>

	<!-- Alerts & Laps Grid -->
	<div class="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-2">
		<!-- Alerts Panel -->
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
					<Bell class="h-4 w-4" />
					Alerts
				</span>
				<button onclick={openAlertModal} class="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-accent-500 dark:hover:bg-slate-800">
					<Plus class="h-4 w-4" />
				</button>
			</div>

			<!-- Presets -->
			<div class="flex flex-wrap gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
				{#each presets as preset, i (i)}
					<button
						onclick={() => stopwatch.addPreset(preset.minutes, preset.label)}
						class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-accent-500/10 hover:text-accent-500 dark:bg-slate-800 dark:text-slate-400"
					>
						{preset.label}
					</button>
				{/each}
			</div>

			<!-- Alerts List -->
			<div class="flex-1 overflow-auto p-2">
				{#if stopwatch.alerts.length === 0}
					<div class="flex h-full flex-col items-center justify-center text-sm text-slate-400">
						<Bell class="mb-2 h-8 w-8 opacity-50" />
						<p>No alerts set</p>
						<p class="text-xs">Add presets or create custom alerts</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each stopwatch.alerts as alert (alert.id)}
							<div
								class={cn(
									'flex items-center gap-3 rounded-lg border p-3 transition-colors',
									alert.triggered
										? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
										: alert.enabled
											? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
											: 'border-slate-100 bg-slate-50/50 opacity-50 dark:border-slate-800 dark:bg-slate-800/30'
								)}
							>
								<button
									onclick={() => stopwatch.toggleAlert(alert.id)}
									class={cn(
										'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
										alert.triggered ? 'border-green-500 bg-green-500 text-white' : alert.enabled ? 'border-accent-500 hover:bg-accent-500/10' : 'border-slate-300 dark:border-slate-600'
									)}
								>
									{#if alert.triggered}
										<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
										</svg>
									{/if}
								</button>
								<div class="min-w-0 flex-1">
									<p class={cn('truncate text-sm font-medium', alert.triggered ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-300')}>
										{alert.label}
									</p>
									<p class="font-mono text-xs text-slate-500">
										{formatTimeShort(alert.time)}
									</p>
								</div>
								<button onclick={() => stopwatch.removeAlert(alert.id)} class="rounded p-1 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30">
									<X class="h-4 w-4" />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Notification Permission Warning -->
			{#if stopwatch.notificationsEnabled && !stopwatch.notificationPermission}
				<div class="border-t border-slate-200 bg-amber-50 p-3 dark:border-slate-800 dark:bg-amber-900/20">
					<button onclick={() => stopwatch.requestNotificationPermission()} class="w-full text-sm text-amber-700 hover:underline dark:text-amber-300"> Click to enable system notifications </button>
				</div>
			{/if}
		</div>

		<!-- Laps Panel -->
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
					<Flag class="h-4 w-4" />
					Laps
				</span>
				<span class="text-xs text-slate-400">{stopwatch.laps.length} recorded</span>
			</div>

			<div class="flex-1 overflow-auto">
				{#if stopwatch.laps.length === 0}
					<div class="flex h-full flex-col items-center justify-center p-4 text-sm text-slate-400">
						<Flag class="mb-2 h-8 w-8 opacity-50" />
						<p>No laps recorded</p>
						<p class="text-xs">Press Lap while running to record</p>
					</div>
				{:else}
					<table class="w-full text-sm">
						<thead class="sticky top-0 bg-slate-50 dark:bg-slate-800/50">
							<tr class="text-left text-slate-500">
								<th class="px-4 py-2 font-medium">#</th>
								<th class="px-4 py-2 font-medium">Lap Time</th>
								<th class="px-4 py-2 font-medium">Total</th>
							</tr>
						</thead>
						<tbody>
							{#each stopwatch.laps as lap (lap.number)}
								<tr class="border-t border-slate-100 dark:border-slate-800">
									<td class="px-4 py-2 text-slate-400">{lap.number}</td>
									<td class="px-4 py-2 font-mono text-slate-900 dark:text-slate-100">
										+{formatTimeShort(lap.delta)}
									</td>
									<td class="px-4 py-2 font-mono text-slate-500">
										{formatTime(lap.time)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Add Alert Modal -->
{#if showAlertModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => e.target === e.currentTarget && closeAlertModal()}
		onkeydown={(e) => e.key === 'Escape' && closeAlertModal()}
		role="dialog"
		tabindex="-1"
	>
		<div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Alert</h2>
				<button onclick={closeAlertModal} class="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="space-y-4 p-4">
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Time</label>
					<div class="flex items-center gap-2">
						<div class="flex-1">
							<input
								type="number"
								bind:value={newAlertMinutes}
								min="0"
								max="999"
								class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-center font-mono text-xl text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
							/>
							<p class="mt-1 text-center text-xs text-slate-400">minutes</p>
						</div>
						<span class="text-2xl text-slate-400">:</span>
						<div class="flex-1">
							<input
								type="number"
								bind:value={newAlertSeconds}
								min="0"
								max="59"
								class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-center font-mono text-xl text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
							/>
							<p class="mt-1 text-center text-xs text-slate-400">seconds</p>
						</div>
					</div>
				</div>

				<div>
					<label for="alert-label" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
						Label <span class="font-normal text-slate-400">(optional)</span>
					</label>
					<input
						id="alert-label"
						type="text"
						bind:value={newAlertLabel}
						placeholder="e.g., Take a break"
						class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
					/>
				</div>
			</div>

			<div class="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
				<button
					onclick={closeAlertModal}
					class="rounded-lg border border-slate-200 px-4 py-2 text-slate-700 transition-all hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
				>
					Cancel
				</button>
				<button
					onclick={handleAddAlert}
					disabled={newAlertMinutes === 0 && newAlertSeconds === 0}
					class={cn(
						'rounded-lg px-4 py-2 font-medium transition-all',
						newAlertMinutes > 0 || newAlertSeconds > 0 ? 'bg-accent-500 text-white hover:bg-accent-600' : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800'
					)}
				>
					Add Alert
				</button>
			</div>
		</div>
	</div>
{/if}
