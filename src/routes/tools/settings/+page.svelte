<script lang="ts">
  import { onMount } from 'svelte';
  import { Settings, Power, Monitor } from 'lucide-svelte';
  import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';

  let autoStartEnabled = $state(false);
  let loading = $state(true);

  onMount(async () => {
    try {
      autoStartEnabled = await isEnabled();
    } catch (e) {
      console.error('Failed to check autostart status:', e);
    }
    loading = false;
  });

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
</script>

<div class="max-w-2xl mx-auto">
  <!-- Header -->
  <div class="mb-8 flex items-center gap-3">
    <div class="p-2 rounded-lg bg-accent-500/10">
      <Settings class="w-6 h-6 text-accent-500" />
    </div>
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
      <p class="text-sm text-slate-600 dark:text-slate-400">Configure your DevToolsSuite preferences</p>
    </div>
  </div>

  <!-- Settings Sections -->
  <div class="space-y-6">
    <!-- Startup Section -->
    <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
        <h2 class="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Power class="w-4 h-4" />
          Startup
        </h2>
      </div>
      <div class="p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-slate-900 dark:text-slate-100">Launch at startup</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Automatically start DevToolsSuite when you log in
            </p>
          </div>
          <button
            onclick={toggleAutoStart}
            disabled={loading}
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50"
            class:bg-accent-500={autoStartEnabled}
            class:bg-slate-300={!autoStartEnabled}
            class:dark:bg-slate-600={!autoStartEnabled}
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              class:translate-x-6={autoStartEnabled}
              class:translate-x-1={!autoStartEnabled}
            ></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Appearance Section -->
    <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
        <h2 class="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Monitor class="w-4 h-4" />
          Appearance
        </h2>
      </div>
      <div class="p-5">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Toggle between dark and light mode using the button in the header.
        </p>
      </div>
    </div>

    <!-- About Section -->
    <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="p-5">
        <div class="text-center">
          <div class="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center mb-3">
            <span class="text-white text-xl font-bold">D</span>
          </div>
          <h3 class="font-semibold text-slate-900 dark:text-slate-100">DevToolsSuite</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400">Version 0.1.0</p>
        </div>
      </div>
    </div>
  </div>
</div>
