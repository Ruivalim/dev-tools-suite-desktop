<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { Search, X } from 'lucide-svelte';
  import * as icons from 'lucide-svelte';
  import { tools } from '$lib/stores/tools';
  import { cn } from '$lib/utils/cn';

  let isOpen = $state(false);
  let searchQuery = $state('');
  let selectedIndex = $state(0);
  let inputRef: HTMLInputElement;

  const filteredTools = $derived.by(() => {
    if (!searchQuery.trim()) return tools;
    const query = searchQuery.toLowerCase();
    return tools.filter(
      t => t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)
    );
  });

  function open() {
    isOpen = true;
    searchQuery = '';
    selectedIndex = 0;
    setTimeout(() => inputRef?.focus(), 10);
  }

  function close() {
    isOpen = false;
    searchQuery = '';
    selectedIndex = 0;
  }

  function handleKeydown(e: KeyboardEvent) {
    // Open with Cmd+K or Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (isOpen) {
        close();
      } else {
        open();
      }
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredTools.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredTools[selectedIndex]) {
          navigateTo(filteredTools[selectedIndex].route);
        }
        break;
    }
  }

  function navigateTo(route: string) {
    close();
    goto(route);
  }

  // Reset selected index when filtered tools change
  $effect(() => {
    if (filteredTools.length > 0 && selectedIndex >= filteredTools.length) {
      selectedIndex = 0;
    }
  });

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  function getIcon(iconName: string) {
    return (icons as Record<string, any>)[iconName] || icons.Wrench;
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-[20vh]"
    onclick={(e) => e.target === e.currentTarget && close()}
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      <!-- Search Input -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <Search class="w-5 h-5 text-slate-400" />
        <input
          bind:this={inputRef}
          type="text"
          bind:value={searchQuery}
          placeholder="Search tools..."
          class="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none text-lg"
        />
        <div class="flex items-center gap-1">
          <kbd class="px-1.5 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">esc</kbd>
        </div>
      </div>

      <!-- Results -->
      <div class="max-h-80 overflow-auto py-2">
        {#if filteredTools.length === 0}
          <div class="px-4 py-8 text-center text-slate-500">
            No tools found for "{searchQuery}"
          </div>
        {:else}
          {#each filteredTools as tool, index (tool.id)}
            {@const Icon = getIcon(tool.icon)}
            <button
              onclick={() => navigateTo(tool.route)}
              onmouseenter={() => selectedIndex = index}
              class={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                index === selectedIndex
                  ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <div class={cn(
                'p-2 rounded-lg',
                index === selectedIndex ? 'bg-accent-500/20' : 'bg-slate-100 dark:bg-slate-800'
              )}>
                <Icon class="w-4 h-4" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium">{tool.name}</div>
                <div class="text-sm text-slate-500 dark:text-slate-400 truncate">{tool.description}</div>
              </div>
              {#if index === selectedIndex}
                <kbd class="px-1.5 py-0.5 text-xs font-medium bg-accent-500/20 text-accent-600 dark:text-accent-400 rounded">enter</kbd>
              {/if}
            </button>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1">
            <kbd class="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">↑</kbd>
            <kbd class="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">↓</kbd>
            to navigate
          </span>
          <span class="flex items-center gap-1">
            <kbd class="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">enter</kbd>
            to select
          </span>
        </div>
        <span class="flex items-center gap-1">
          <kbd class="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">⌘</kbd>
          <kbd class="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">K</kbd>
          to toggle
        </span>
      </div>
    </div>
  </div>
{/if}
