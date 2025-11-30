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
    { label: '1 Hour', minutes: 60 },
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
    const upcoming = stopwatch.alerts.filter(a => a.enabled && !a.triggered && a.time > stopwatch.elapsed);
    return upcoming.length > 0 ? upcoming[0] : null;
  });

  let progress = $derived.by(() => {
    if (!nextAlert) return 0;
    return Math.min((stopwatch.elapsed / nextAlert.time) * 100, 100);
  });
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-accent-500/10">
        <Timer class="w-6 h-6 text-accent-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Stopwatch</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Track time with alerts and laps</p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        onclick={() => stopwatch.toggleSound()}
        class={cn(
          "p-2 rounded-lg transition-colors",
          stopwatch.soundEnabled
            ? "text-accent-500 bg-accent-500/10 hover:bg-accent-500/20"
            : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
        title={stopwatch.soundEnabled ? "Sound on" : "Sound off"}
      >
        {#if stopwatch.soundEnabled}
          <Volume2 class="w-5 h-5" />
        {:else}
          <VolumeX class="w-5 h-5" />
        {/if}
      </button>
      <button
        onclick={() => stopwatch.toggleNotifications()}
        class={cn(
          "p-2 rounded-lg transition-colors",
          stopwatch.notificationsEnabled
            ? "text-accent-500 bg-accent-500/10 hover:bg-accent-500/20"
            : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
        title={stopwatch.notificationsEnabled ? "Notifications on" : "Notifications off"}
      >
        {#if stopwatch.notificationsEnabled}
          <Bell class="w-5 h-5" />
        {:else}
          <BellOff class="w-5 h-5" />
        {/if}
      </button>
      <button
        onclick={() => stopwatch.toggleShowInTray()}
        class={cn(
          "p-2 rounded-lg transition-colors",
          stopwatch.showInTray
            ? "text-accent-500 bg-accent-500/10 hover:bg-accent-500/20"
            : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
        title={stopwatch.showInTray ? "Show in system tray" : "Hidden from system tray"}
      >
        <AppWindow class="w-5 h-5" />
      </button>
    </div>
  </div>

  <!-- Main Timer Display -->
  <div class="flex-shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 mb-4">
    <!-- Progress bar for next alert -->
    {#if nextAlert}
      <div class="mb-4">
        <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>Next: {nextAlert.label}</span>
          <span>{formatTimeShort(nextAlert.time - stopwatch.elapsed)} remaining</span>
        </div>
        <div class="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            class="h-full bg-accent-500 transition-all duration-100"
            style="width: {progress}%"
          ></div>
        </div>
      </div>
    {/if}

    <!-- Time Display -->
    <div class="text-center mb-8">
      <div class="text-6xl md:text-8xl font-mono font-bold text-slate-900 dark:text-slate-100 tracking-tight">
        {formatTime(stopwatch.elapsed)}
      </div>
    </div>

    <!-- Controls -->
    <div class="flex items-center justify-center gap-4">
      {#if !stopwatch.isRunning}
        <button
          onclick={() => stopwatch.start()}
          class="flex items-center gap-2 px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
        >
          <Play class="w-5 h-5" />
          {stopwatch.elapsed > 0 ? 'Resume' : 'Start'}
        </button>
      {:else}
        <button
          onclick={() => stopwatch.pause()}
          class="flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
        >
          <Pause class="w-5 h-5" />
          Pause
        </button>
      {/if}

      <button
        onclick={() => stopwatch.lap()}
        disabled={!stopwatch.isRunning}
        class={cn(
          "flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-colors",
          stopwatch.isRunning
            ? "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
            : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
        )}
      >
        <Flag class="w-5 h-5" />
        Lap
      </button>

      <button
        onclick={() => stopwatch.reset()}
        disabled={stopwatch.elapsed === 0}
        class={cn(
          "flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-colors",
          stopwatch.elapsed > 0
            ? "bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
            : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
        )}
      >
        <RotateCcw class="w-5 h-5" />
        Reset
      </button>
    </div>
  </div>

  <!-- Alerts & Laps Grid -->
  <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-hidden">
    <!-- Alerts Panel -->
    <div class="flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div class="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span class="font-medium text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Bell class="w-4 h-4" />
          Alerts
        </span>
        <button
          onclick={openAlertModal}
          class="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-accent-500 transition-colors"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>

      <!-- Presets -->
      <div class="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
        {#each presets as preset}
          <button
            onclick={() => stopwatch.addPreset(preset.minutes, preset.label)}
            class="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-accent-500/10 hover:text-accent-500 transition-colors"
          >
            {preset.label}
          </button>
        {/each}
      </div>

      <!-- Alerts List -->
      <div class="flex-1 overflow-auto p-2">
        {#if stopwatch.alerts.length === 0}
          <div class="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
            <Bell class="w-8 h-8 mb-2 opacity-50" />
            <p>No alerts set</p>
            <p class="text-xs">Add presets or create custom alerts</p>
          </div>
        {:else}
          <div class="space-y-2">
            {#each stopwatch.alerts as alert (alert.id)}
              <div class={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                alert.triggered
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : alert.enabled
                    ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                    : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 opacity-50"
              )}>
                <button
                  onclick={() => stopwatch.toggleAlert(alert.id)}
                  class={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    alert.triggered
                      ? "bg-green-500 border-green-500 text-white"
                      : alert.enabled
                        ? "border-accent-500 hover:bg-accent-500/10"
                        : "border-slate-300 dark:border-slate-600"
                  )}
                >
                  {#if alert.triggered}
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                  {/if}
                </button>
                <div class="flex-1 min-w-0">
                  <p class={cn(
                    "font-medium text-sm truncate",
                    alert.triggered ? "text-green-700 dark:text-green-300" : "text-slate-700 dark:text-slate-300"
                  )}>
                    {alert.label}
                  </p>
                  <p class="text-xs text-slate-500 font-mono">
                    {formatTimeShort(alert.time)}
                  </p>
                </div>
                <button
                  onclick={() => stopwatch.removeAlert(alert.id)}
                  class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Notification Permission Warning -->
      {#if stopwatch.notificationsEnabled && !stopwatch.notificationPermission}
        <div class="p-3 border-t border-slate-200 dark:border-slate-800 bg-amber-50 dark:bg-amber-900/20">
          <button
            onclick={() => stopwatch.requestNotificationPermission()}
            class="w-full text-sm text-amber-700 dark:text-amber-300 hover:underline"
          >
            Click to enable system notifications
          </button>
        </div>
      {/if}
    </div>

    <!-- Laps Panel -->
    <div class="flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div class="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span class="font-medium text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Flag class="w-4 h-4" />
          Laps
        </span>
        <span class="text-xs text-slate-400">{stopwatch.laps.length} recorded</span>
      </div>

      <div class="flex-1 overflow-auto">
        {#if stopwatch.laps.length === 0}
          <div class="flex flex-col items-center justify-center h-full text-slate-400 text-sm p-4">
            <Flag class="w-8 h-8 mb-2 opacity-50" />
            <p>No laps recorded</p>
            <p class="text-xs">Press Lap while running to record</p>
          </div>
        {:else}
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
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
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onclick={(e) => e.target === e.currentTarget && closeAlertModal()}
    onkeydown={(e) => e.key === 'Escape' && closeAlertModal()}
    role="dialog"
    tabindex="-1"
  >
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800">
      <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Alert</h2>
        <button
          onclick={closeAlertModal}
          class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Time</label>
          <div class="flex items-center gap-2">
            <div class="flex-1">
              <input
                type="number"
                bind:value={newAlertMinutes}
                min="0"
                max="999"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center text-xl font-mono"
              />
              <p class="text-xs text-slate-400 text-center mt-1">minutes</p>
            </div>
            <span class="text-2xl text-slate-400">:</span>
            <div class="flex-1">
              <input
                type="number"
                bind:value={newAlertSeconds}
                min="0"
                max="59"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center text-xl font-mono"
              />
              <p class="text-xs text-slate-400 text-center mt-1">seconds</p>
            </div>
          </div>
        </div>

        <div>
          <label for="alert-label" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Label <span class="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="alert-label"
            type="text"
            bind:value={newAlertLabel}
            placeholder="e.g., Take a break"
            class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>
      </div>

      <div class="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onclick={closeAlertModal}
          class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          Cancel
        </button>
        <button
          onclick={handleAddAlert}
          disabled={newAlertMinutes === 0 && newAlertSeconds === 0}
          class={cn(
            'px-4 py-2 rounded-lg font-medium transition-all',
            (newAlertMinutes > 0 || newAlertSeconds > 0)
              ? 'bg-accent-500 hover:bg-accent-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
          )}
        >
          Add Alert
        </button>
      </div>
    </div>
  </div>
{/if}
