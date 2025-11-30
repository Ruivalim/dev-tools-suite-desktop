<script lang="ts">
  import '../app.css';
  import { onMount, onDestroy } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import Header from '$lib/components/layout/Header.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { stopwatch } from '$lib/stores/stopwatch.svelte';

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

  let statsInterval: ReturnType<typeof setInterval> | null = null;

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

  onMount(() => {
    // Initialize theme on mount
    document.documentElement.classList.add(themeStore.value);

    // Initialize stopwatch store (runs timer globally)
    stopwatch.init();

    // Fetch stats immediately and then every 2 seconds
    fetchStats();
    statsInterval = setInterval(fetchStats, 2000);
  });

  onDestroy(() => {
    if (statsInterval) {
      clearInterval(statsInterval);
    }
  });
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="h-full min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
  <Header />

  <div class="flex flex-1 overflow-hidden">
    <Sidebar {cpuUsage} {ramUsage} {diskUsage} />

    <main class="flex-1 overflow-auto p-6">
      {@render children()}
    </main>
  </div>
</div>

<CommandPalette />
