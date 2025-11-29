<script lang="ts">
  import { onMount } from 'svelte';
  import { Fingerprint, Copy, Check, RefreshCw, Trash2, Plus, Minus } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';

  let uuids = $state<string[]>([]);
  let count = $state(1);
  let format = $state<'lowercase' | 'uppercase' | 'no-dashes'>('lowercase');
  let copiedIndex = $state<number | null>(null);
  let copiedAll = $state(false);

  function formatUUID(uuid: string): string {
    // Normalize to lowercase with dashes
    let normalized = uuid.toLowerCase().replace(/-/g, '');
    normalized = `${normalized.slice(0,8)}-${normalized.slice(8,12)}-${normalized.slice(12,16)}-${normalized.slice(16,20)}-${normalized.slice(20)}`;

    if (format === 'uppercase') {
      return normalized.toUpperCase();
    } else if (format === 'no-dashes') {
      return normalized.replace(/-/g, '');
    }
    return normalized;
  }

  function generateUUID(): string {
    const uuid = crypto.randomUUID();
    return formatUUID(uuid);
  }

  function generate() {
    uuids = Array.from({ length: count }, () => generateUUID());
  }

  function addMore() {
    const newUuids = Array.from({ length: count }, () => generateUUID());
    uuids = [...uuids, ...newUuids];
  }

  function reformatAll() {
    uuids = uuids.map(uuid => formatUUID(uuid));
  }

  async function copyUUID(index: number) {
    await navigator.clipboard.writeText(uuids[index]);
    copiedIndex = index;
    setTimeout(() => copiedIndex = null, 2000);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(uuids.join('\n'));
    copiedAll = true;
    setTimeout(() => copiedAll = false, 2000);
  }

  function removeUUID(index: number) {
    uuids = uuids.filter((_, i) => i !== index);
  }

  function clear() {
    uuids = [];
  }

  // Generate on mount
  onMount(() => {
    generate();
  });
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-accent-500/10">
        <Fingerprint class="w-6 h-6 text-accent-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">UUID Generator</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Generate random UUIDs (v4)</p>
      </div>
    </div>
  </div>

  <!-- Controls -->
  <div class="mb-4 flex items-center gap-4 flex-wrap">
    <div class="flex items-center gap-2">
      <span class="text-sm text-slate-500">Count:</span>
      <div class="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          onclick={() => count = Math.max(1, count - 1)}
          class="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Minus class="w-4 h-4" />
        </button>
        <input
          type="number"
          bind:value={count}
          min="1"
          max="100"
          class="w-16 px-2 py-1 text-center bg-transparent text-sm border-x border-slate-200 dark:border-slate-700"
        />
        <button
          onclick={() => count = Math.min(100, count + 1)}
          class="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <span class="text-sm text-slate-500">Format:</span>
      <select
        bind:value={format}
        onchange={reformatAll}
        class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
      >
        <option value="lowercase">lowercase</option>
        <option value="uppercase">UPPERCASE</option>
        <option value="no-dashes">No dashes</option>
      </select>
    </div>

    <button
      onclick={generate}
      class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium"
    >
      <RefreshCw class="w-4 h-4" />
      Generate
    </button>

    <button
      onclick={addMore}
      disabled={uuids.length >= 100}
      class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium disabled:opacity-50"
    >
      <Plus class="w-4 h-4" />
      Add More
    </button>

    {#if uuids.length > 1}
      <button
        onclick={copyAll}
        class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
      >
        {#if copiedAll}
          <Check class="w-4 h-4 text-green-500" />
          Copied!
        {:else}
          <Copy class="w-4 h-4" />
          Copy All
        {/if}
      </button>
    {/if}

    <button
      onclick={clear}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm ml-auto"
    >
      <Trash2 class="w-4 h-4" />
      Clear
    </button>
  </div>

  <!-- UUIDs List -->
  <div class="flex-1 overflow-auto space-y-2">
    {#each uuids as uuid, index}
      <div class="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group">
        <span class="text-xs text-slate-400 w-8">{index + 1}.</span>
        <code class="flex-1 font-mono text-sm text-slate-900 dark:text-slate-100 select-all">
          {uuid}
        </code>
        <button
          onclick={() => copyUUID(index)}
          class="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          {#if copiedIndex === index}
            <Check class="w-4 h-4 text-green-500" />
          {:else}
            <Copy class="w-4 h-4" />
          {/if}
        </button>
        <button
          onclick={() => removeUUID(index)}
          class="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    {/each}

    {#if uuids.length === 0}
      <div class="flex items-center justify-center h-full text-slate-400">
        Click "Generate" to create UUIDs
      </div>
    {/if}
  </div>

  <!-- Stats -->
  {#if uuids.length > 0}
    <div class="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
      <span>{uuids.length} UUID{uuids.length !== 1 ? 's' : ''} generated</span>
      <span>Version 4 (random)</span>
    </div>
  {/if}
</div>
