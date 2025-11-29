<script lang="ts">
  import { themeStore } from '$lib/stores/theme.svelte';
  import { sidebarStore } from '$lib/stores/sidebar.svelte';
  import { Sun, Moon } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';
</script>

<header
  class="h-12 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
  data-tauri-drag-region
>
  <!-- Left: App Title -->
  <div class="flex items-center gap-2 px-4" data-tauri-drag-region>
    <div class="w-6 h-6 rounded-md bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
      <span class="text-white text-xs font-bold">D</span>
    </div>
    <h1
      class={cn(
        'font-semibold text-slate-800 dark:text-slate-200 transition-all duration-200',
        sidebarStore.collapsed ? 'text-sm' : 'text-base'
      )}
      data-tauri-drag-region
    >
      {sidebarStore.collapsed ? 'DTS' : 'DevToolsSuite'}
    </h1>
  </div>

  <!-- Right: Theme Toggle -->
  <div class="flex items-center px-2">
    <button
      onclick={() => themeStore.toggle()}
      class="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
      title={themeStore.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {#if themeStore.value === 'dark'}
        <Sun class="w-4 h-4 text-slate-500 dark:text-slate-400" />
      {:else}
        <Moon class="w-4 h-4 text-slate-500 dark:text-slate-400" />
      {/if}
    </button>
  </div>
</header>
