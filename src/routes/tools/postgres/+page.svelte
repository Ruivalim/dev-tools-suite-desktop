<script lang="ts">
  import { Database, Plus, FolderPlus, Server, Construction } from 'lucide-svelte';
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="mb-6 flex items-center gap-3">
    <div class="p-2 rounded-lg bg-accent-500/10">
      <Database class="w-6 h-6 text-accent-500" />
    </div>
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">PostgreSQL Viewer</h1>
      <p class="text-sm text-slate-600 dark:text-slate-400">Connect and query your PostgreSQL databases.</p>
    </div>
  </div>

  <!-- Coming Soon -->
  <div class="flex flex-col items-center justify-center py-20 px-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
    <div class="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
      <Construction class="w-12 h-12 text-slate-400 dark:text-slate-500" />
    </div>
    <h2 class="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Coming Soon</h2>
    <p class="text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
      The PostgreSQL viewer is currently under development. You'll be able to manage connections, browse schemas, and run queries.
    </p>

    <div class="flex flex-wrap gap-3 justify-center">
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-400">
        <Server class="w-4 h-4" />
        Save connections
      </div>
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-400">
        <FolderPlus class="w-4 h-4" />
        Organize in folders
      </div>
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-400">
        <Plus class="w-4 h-4" />
        Query editor
      </div>
    </div>
  </div>
</div>
