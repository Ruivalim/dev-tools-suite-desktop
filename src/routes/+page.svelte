<script lang="ts">
  import { tools } from '$lib/stores/tools';
  import * as Icons from 'lucide-svelte';
  import { Wrench, ArrowRight } from 'lucide-svelte';

  function getToolIcon(iconName: string) {
    return (Icons as Record<string, any>)[iconName] || Wrench;
  }
</script>

<div class="max-w-4xl mx-auto">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Dev Tools Suite</h1>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {#each tools as tool}
      {@const Icon = getToolIcon(tool.icon)}
      <a
        href={tool.route}
        class="group p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-accent-500/50 hover:shadow-lg hover:shadow-accent-500/10 transition-all duration-200"
      >
        <div class="flex items-start gap-4">
          <div class="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-accent-500/10 transition-colors">
            <Icon class="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-accent-500 transition-colors" />
          </div>
          <div class="flex-1">
            <h2
              class="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-accent-500 transition-colors flex items-center gap-2"
            >
              {tool.name}
              <ArrowRight
                class="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
              />
            </h2>
            <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {tool.description}
            </p>
          </div>
        </div>
      </a>
    {/each}
  </div>
</div>
