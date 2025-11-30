<script lang="ts">
  import { ArrowUpDown, Copy, Check, Trash2 } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';
  import Select from '$lib/components/ui/Select.svelte';

  type SortType = 'alphabetical' | 'alphabetical-reverse' | 'numerical' | 'numerical-reverse' | 'length' | 'length-reverse' | 'random';

  let input = $state('');
  let output = $state('');
  let sortType = $state<SortType>('alphabetical');
  let caseSensitive = $state(false);
  let trimLines = $state(true);
  let removeEmpty = $state(true);
  let copied = $state(false);

  const sortOptions = [
    { value: 'alphabetical', label: 'A → Z' },
    { value: 'alphabetical-reverse', label: 'Z → A' },
    { value: 'numerical', label: '0 → 9' },
    { value: 'numerical-reverse', label: '9 → 0' },
    { value: 'length', label: 'Short → Long' },
    { value: 'length-reverse', label: 'Long → Short' },
    { value: 'random', label: 'Random shuffle' }
  ];

  function sort() {
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

    switch (sortType) {
      case 'alphabetical':
        lines.sort((a, b) => {
          const aVal = caseSensitive ? a : a.toLowerCase();
          const bVal = caseSensitive ? b : b.toLowerCase();
          return aVal.localeCompare(bVal);
        });
        break;

      case 'alphabetical-reverse':
        lines.sort((a, b) => {
          const aVal = caseSensitive ? a : a.toLowerCase();
          const bVal = caseSensitive ? b : b.toLowerCase();
          return bVal.localeCompare(aVal);
        });
        break;

      case 'numerical':
        lines.sort((a, b) => {
          const aNum = parseFloat(a.replace(/[^\d.-]/g, '')) || 0;
          const bNum = parseFloat(b.replace(/[^\d.-]/g, '')) || 0;
          return aNum - bNum;
        });
        break;

      case 'numerical-reverse':
        lines.sort((a, b) => {
          const aNum = parseFloat(a.replace(/[^\d.-]/g, '')) || 0;
          const bNum = parseFloat(b.replace(/[^\d.-]/g, '')) || 0;
          return bNum - aNum;
        });
        break;

      case 'length':
        lines.sort((a, b) => a.length - b.length);
        break;

      case 'length-reverse':
        lines.sort((a, b) => b.length - a.length);
        break;

      case 'random':
        for (let i = lines.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [lines[i], lines[j]] = [lines[j], lines[i]];
        }
        break;
    }

    output = lines.join('\n');
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

  function useOutput() {
    input = output;
    output = '';
  }

  // Auto-sort on changes
  $effect(() => {
    sort();
  });

  const lineCount = $derived(output.split('\n').filter(l => l.length > 0).length);
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-accent-500/10">
        <ArrowUpDown class="w-6 h-6 text-accent-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Text Sorter</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Sort lines alphabetically, numerically, or by length</p>
      </div>
    </div>
  </div>

  <!-- Controls -->
  <div class="mb-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
    <div class="flex flex-wrap items-center gap-4">
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Sort by:</label>
        <Select
          value={sortType}
          options={sortOptions}
          onchange={(v) => sortType = v as SortType}
          searchable={false}
          class="w-40"
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
          bind:checked={removeEmpty}
          class="rounded border-slate-300 dark:border-slate-700 text-accent-500 focus:ring-accent-500"
        />
        <span class="text-sm text-slate-700 dark:text-slate-300">Remove empty lines</span>
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

  <!-- Editors -->
  <div class="flex-1 grid grid-cols-2 gap-4 min-h-0">
    <!-- Input -->
    <div class="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="p-3 border-b border-slate-200 dark:border-slate-800">
        <span class="font-medium text-sm text-slate-700 dark:text-slate-300">Input (one item per line)</span>
      </div>
      <textarea
        bind:value={input}
        placeholder="Enter text to sort...&#10;One item per line"
        class="flex-1 p-3 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none font-mono text-sm focus:outline-none"
        spellcheck="false"
      ></textarea>
    </div>

    <!-- Output -->
    <div class="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
        <span class="font-medium text-sm text-slate-700 dark:text-slate-300">
          Sorted Output
          {#if lineCount > 0}
            <span class="text-slate-400 font-normal">({lineCount} lines)</span>
          {/if}
        </span>
        <div class="flex items-center gap-2">
          <button
            onclick={useOutput}
            disabled={!output}
            class="px-2 py-1 text-xs text-slate-500 hover:text-accent-500 disabled:opacity-50 transition-colors"
          >
            Use as input
          </button>
          <button
            onclick={copyOutput}
            disabled={!output}
            class="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-50"
          >
            {#if copied}
              <Check class="w-4 h-4 text-green-500" />
            {:else}
              <Copy class="w-4 h-4" />
            {/if}
          </button>
        </div>
      </div>
      <pre class="flex-1 p-3 overflow-auto font-mono text-sm text-slate-900 dark:text-slate-100">{output}</pre>
    </div>
  </div>
</div>
