<script lang="ts">
  import { Copy as CopyIcon, Check, Trash2, Filter } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';
  import Select from '$lib/components/ui/Select.svelte';

  type OutputMode = 'unique' | 'duplicates' | 'unique-first' | 'count';

  let input = $state('');
  let output = $state('');
  let outputMode = $state<OutputMode>('unique');
  let caseSensitive = $state(false);
  let trimLines = $state(true);
  let removeEmpty = $state(true);
  let preserveOrder = $state(true);
  let copied = $state(false);

  const modeOptions = [
    { value: 'unique', label: 'Unique lines only' },
    { value: 'duplicates', label: 'Show duplicates' },
    { value: 'unique-first', label: 'First occurrence only' },
    { value: 'count', label: 'Count occurrences' }
  ];

  function process() {
    if (!input.trim()) {
      output = '';
      return;
    }

    let lines = input.split('\n');

    if (trimLines) {
      lines = lines.map(l => l.trim());
    }

    if (removeEmpty) {
      lines = lines.filter(l => l.length > 0);
    }

    const getKey = (line: string) => caseSensitive ? line : line.toLowerCase();

    // Count occurrences
    const countMap = new Map<string, { count: number; original: string; firstIndex: number }>();
    lines.forEach((line, index) => {
      const key = getKey(line);
      if (countMap.has(key)) {
        countMap.get(key)!.count++;
      } else {
        countMap.set(key, { count: 1, original: line, firstIndex: index });
      }
    });

    let result: string[] = [];

    switch (outputMode) {
      case 'unique':
        // Lines that appear only once
        if (preserveOrder) {
          result = lines.filter(line => countMap.get(getKey(line))!.count === 1);
        } else {
          result = Array.from(countMap.values())
            .filter(v => v.count === 1)
            .map(v => v.original);
        }
        break;

      case 'duplicates':
        // Lines that appear more than once (show each duplicate)
        const seen = new Set<string>();
        result = lines.filter(line => {
          const key = getKey(line);
          if (countMap.get(key)!.count > 1) {
            if (!seen.has(key)) {
              seen.add(key);
              return true;
            }
          }
          return false;
        });
        break;

      case 'unique-first':
        // Remove duplicates, keep first occurrence
        const seenFirst = new Set<string>();
        result = lines.filter(line => {
          const key = getKey(line);
          if (!seenFirst.has(key)) {
            seenFirst.add(key);
            return true;
          }
          return false;
        });
        break;

      case 'count':
        // Show count for each unique line
        const countEntries = Array.from(countMap.entries());
        if (preserveOrder) {
          countEntries.sort((a, b) => a[1].firstIndex - b[1].firstIndex);
        }
        result = countEntries.map(([_, v]) => `${v.count}x ${v.original}`);
        break;
    }

    output = result.join('\n');
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }

  function clear() {
    input = '';
    output = '';
  }

  // Auto-process on changes
  $effect(() => {
    process();
  });

  const inputLineCount = $derived(input.split('\n').filter(l => l.trim().length > 0).length);
  const outputLineCount = $derived(output.split('\n').filter(l => l.length > 0).length);
  const removedCount = $derived(inputLineCount - outputLineCount);
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-accent-500/10">
        <Filter class="w-6 h-6 text-accent-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Duplicate Remover</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Remove or find duplicate lines</p>
      </div>
    </div>
  </div>

  <!-- Controls -->
  <div class="mb-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
    <div class="flex flex-wrap items-center gap-4">
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Mode:</label>
        <Select
          value={outputMode}
          options={modeOptions}
          onchange={(v) => outputMode = v as OutputMode}
          searchable={false}
          class="w-48"
        />
      </div>

      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          bind:checked={caseSensitive}
          class="rounded border-slate-300 dark:border-slate-700 text-accent-500 focus:ring-accent-500"
        />
        <span class="text-sm text-slate-700 dark:text-slate-300">Case sensitive</span>
      </label>

      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          bind:checked={trimLines}
          class="rounded border-slate-300 dark:border-slate-700 text-accent-500 focus:ring-accent-500"
        />
        <span class="text-sm text-slate-700 dark:text-slate-300">Trim whitespace</span>
      </label>

      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          bind:checked={preserveOrder}
          class="rounded border-slate-300 dark:border-slate-700 text-accent-500 focus:ring-accent-500"
        />
        <span class="text-sm text-slate-700 dark:text-slate-300">Preserve order</span>
      </label>

      <button
        onclick={clear}
        class="flex items-center gap-1 ml-auto px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        <Trash2 class="w-4 h-4" />
        Clear
      </button>
    </div>
  </div>

  <!-- Stats -->
  {#if inputLineCount > 0}
    <div class="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex items-center gap-4 text-sm">
      <span class="text-slate-600 dark:text-slate-400">
        Input: <strong class="text-slate-900 dark:text-slate-100">{inputLineCount}</strong> lines
      </span>
      <span class="text-slate-600 dark:text-slate-400">
        Output: <strong class="text-slate-900 dark:text-slate-100">{outputLineCount}</strong> lines
      </span>
      {#if outputMode === 'unique-first' && removedCount > 0}
        <span class="text-red-500">
          Removed: <strong>{removedCount}</strong> duplicates
        </span>
      {/if}
    </div>
  {/if}

  <!-- Editors -->
  <div class="flex-1 grid grid-cols-2 gap-4 min-h-0">
    <!-- Input -->
    <div class="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="p-3 border-b border-slate-200 dark:border-slate-800">
        <span class="font-medium text-sm text-slate-700 dark:text-slate-300">Input</span>
      </div>
      <textarea
        bind:value={input}
        placeholder="Enter text with duplicate lines...&#10;One item per line"
        class="flex-1 p-3 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none font-mono text-sm focus:outline-none"
        spellcheck="false"
      ></textarea>
    </div>

    <!-- Output -->
    <div class="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
        <span class="font-medium text-sm text-slate-700 dark:text-slate-300">Output</span>
        <button
          onclick={copyOutput}
          disabled={!output}
          class="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-50"
        >
          {#if copied}
            <Check class="w-4 h-4 text-green-500" />
          {:else}
            <CopyIcon class="w-4 h-4" />
          {/if}
        </button>
      </div>
      <pre class="flex-1 p-3 overflow-auto font-mono text-sm text-slate-900 dark:text-slate-100">{output}</pre>
    </div>
  </div>
</div>
