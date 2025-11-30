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
    <a
      href="/"
      class="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-600 to-accent-500 flex items-center justify-center hover:from-accent-500 hover:to-accent-400 transition-all"
      title="Home"
    >
      <svg width="18" height="18" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M8.5 4 Q6 4 6 6.5 L6 9.5 Q6 11 4 11 Q6 11 6 12.5 L6 15.5 Q6 18 8.5 18"
          stroke="white"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
        <path
          d="M13.5 4 Q16 4 16 6.5 L16 9.5 Q16 11 18 11 Q16 11 16 12.5 L16 15.5 Q16 18 13.5 18"
          stroke="white"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
        <circle cx="11" cy="11" r="1.2" fill="white" />
      </svg>
    </a>
    <h1
      class={cn(
        'font-semibold text-slate-800 dark:text-slate-200 transition-all duration-200',
        sidebarStore.collapsed ? 'text-sm' : 'text-base'
      )}
      data-tauri-drag-region
    >
      Dev Tools Suite
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
