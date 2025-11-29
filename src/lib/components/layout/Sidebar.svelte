<script lang="ts">
  import { page } from '$app/stores';
  import { sidebarStore } from '$lib/stores/sidebar.svelte';
  import { tools } from '$lib/stores/tools';
  import { cn } from '$lib/utils/cn';
  import * as Icons from 'lucide-svelte';
  import {
    PanelLeftClose,
    PanelLeft,
    Wrench,
    Cpu,
    HardDrive,
    MemoryStick,
    Search
  } from 'lucide-svelte';

  interface Props {
    cpuUsage?: number;
    ramUsage?: string;
    diskUsage?: string;
  }

  let { cpuUsage = 0, ramUsage = '0 GB', diskUsage = '0%' }: Props = $props();

  let searchQuery = $state('');

  const filteredTools = $derived(
    tools.filter(tool =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  function getToolIcon(iconName: string) {
    return (Icons as Record<string, typeof Wrench>)[iconName] || Wrench;
  }
</script>

<aside
  class={cn(
    'h-full flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 transition-all duration-200 ease-out',
    sidebarStore.collapsed ? 'w-16' : 'w-60'
  )}
>
  <!-- Toggle Button -->
  <div class="p-3 border-b border-slate-200 dark:border-slate-800">
    <button
      onclick={() => sidebarStore.toggle()}
      class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors w-full flex items-center justify-center"
      title={sidebarStore.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {#if sidebarStore.collapsed}
        <PanelLeft class="w-5 h-5 text-slate-600 dark:text-slate-400" />
      {:else}
        <PanelLeftClose class="w-5 h-5 text-slate-600 dark:text-slate-400" />
      {/if}
    </button>
  </div>

  <!-- Search Input -->
  {#if !sidebarStore.collapsed}
    <div class="p-2">
      <div class="relative">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search tools..."
          bind:value={searchQuery}
          class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
        />
      </div>
    </div>
  {/if}

  <!-- Tools Navigation -->
  <nav class="flex-1 overflow-y-auto p-2 space-y-1">
    {#each filteredTools as tool}
      {@const isActive = $page.url.pathname === tool.route}
      {@const Icon = getToolIcon(tool.icon)}
      <a
        href={tool.route}
        class={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150',
          'hover:bg-slate-200 dark:hover:bg-slate-800 hover:scale-[1.02]',
          isActive && 'bg-accent-500/10 text-accent-600 dark:text-accent-400 font-medium',
          !isActive && 'text-slate-700 dark:text-slate-300',
          sidebarStore.collapsed && 'justify-center px-2'
        )}
        title={sidebarStore.collapsed ? tool.name : undefined}
      >
        <Icon class="w-5 h-5 flex-shrink-0" />
        {#if !sidebarStore.collapsed}
          <span class="truncate">{tool.name}</span>
        {/if}
      </a>
    {/each}

    {#if filteredTools.length === 0 && !sidebarStore.collapsed}
      <div class="px-3 py-4 text-sm text-slate-400 dark:text-slate-500 text-center">
        No tools found
      </div>
    {/if}
  </nav>

  <!-- System Stats Footer -->
  <div class="border-t border-slate-200 dark:border-slate-800 p-3 space-y-2 flex-shrink-0">
    <div
      class={cn(
        'flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400',
        sidebarStore.collapsed && 'flex-col gap-1'
      )}
      title="CPU Usage"
    >
      <Cpu class="w-4 h-4 flex-shrink-0" />
      {#if !sidebarStore.collapsed}
        <span>CPU:</span>
        <span class="ml-auto font-mono">{cpuUsage.toFixed(0)}%</span>
      {:else}
        <span class="font-mono text-[10px]">{cpuUsage.toFixed(0)}%</span>
      {/if}
    </div>

    <div
      class={cn(
        'flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400',
        sidebarStore.collapsed && 'flex-col gap-1'
      )}
      title="RAM Usage"
    >
      <MemoryStick class="w-4 h-4 flex-shrink-0" />
      {#if !sidebarStore.collapsed}
        <span>RAM:</span>
        <span class="ml-auto font-mono">{ramUsage}</span>
      {:else}
        <span class="font-mono text-[10px]">{ramUsage}</span>
      {/if}
    </div>

    <div
      class={cn(
        'flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400',
        sidebarStore.collapsed && 'flex-col gap-1'
      )}
      title="Disk Usage"
    >
      <HardDrive class="w-4 h-4 flex-shrink-0" />
      {#if !sidebarStore.collapsed}
        <span>Disk:</span>
        <span class="ml-auto font-mono">{diskUsage}</span>
      {:else}
        <span class="font-mono text-[10px]">{diskUsage}</span>
      {/if}
    </div>
  </div>
</aside>
