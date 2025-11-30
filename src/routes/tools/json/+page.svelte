<script lang="ts">
  import { Braces, Copy, Check, Trash2, Minimize2, Maximize2, AlertCircle } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';
  import Select from '$lib/components/ui/Select.svelte';

  let input = $state('');
  let output = $state('');
  let error = $state('');
  let copied = $state(false);
  let indentSize = $state(2);

  function formatJSON() {
    error = '';
    if (!input.trim()) {
      output = '';
      return;
    }
    try {
      const parsed = JSON.parse(input);
      output = JSON.stringify(parsed, null, indentSize);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Invalid JSON';
      output = '';
    }
  }

  function minifyJSON() {
    error = '';
    if (!input.trim()) {
      output = '';
      return;
    }
    try {
      const parsed = JSON.parse(input);
      output = JSON.stringify(parsed);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Invalid JSON';
      output = '';
    }
  }

  function validateJSON() {
    error = '';
    if (!input.trim()) {
      error = 'Enter JSON to validate';
      return;
    }
    try {
      JSON.parse(input);
      error = '';
      output = '✓ Valid JSON';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Invalid JSON';
      output = '';
    }
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
    error = '';
  }

  // Auto-format on input change
  $effect(() => {
    if (input) {
      formatJSON();
    }
  });
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-accent-500/10">
        <Braces class="w-6 h-6 text-accent-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">JSON Formatter</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Format, minify, and validate JSON</p>
      </div>
    </div>
  </div>

  <!-- Controls -->
  <div class="mb-4 flex items-center gap-2 flex-wrap">
    <button
      onclick={formatJSON}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium"
    >
      <Maximize2 class="w-4 h-4" />
      Format
    </button>
    <button
      onclick={minifyJSON}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium"
    >
      <Minimize2 class="w-4 h-4" />
      Minify
    </button>
    <button
      onclick={validateJSON}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium"
    >
      <Check class="w-4 h-4" />
      Validate
    </button>
    <div class="flex items-center gap-2 ml-4">
      <span class="text-sm text-slate-500">Indent:</span>
      <Select
        value={String(indentSize)}
        options={[
          { value: '2', label: '2 spaces' },
          { value: '4', label: '4 spaces' },
          { value: '1', label: '1 tab' }
        ]}
        onchange={(v) => { indentSize = Number(v); formatJSON(); }}
        searchable={false}
        class="w-28"
      />
    </div>
    <button
      onclick={clear}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm ml-auto"
    >
      <Trash2 class="w-4 h-4" />
      Clear
    </button>
  </div>

  <!-- Error -->
  {#if error}
    <div class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
      <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <span class="text-sm text-red-700 dark:text-red-300">{error}</span>
    </div>
  {/if}

  <!-- Editor -->
  <div class="flex-1 grid grid-cols-2 gap-4 min-h-0">
    <!-- Input -->
    <div class="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="p-3 border-b border-slate-200 dark:border-slate-800">
        <span class="font-medium text-sm text-slate-700 dark:text-slate-300">Input</span>
      </div>
      <textarea
        bind:value={input}
        placeholder="Paste your JSON here..."
        class="flex-1 p-3 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none font-mono text-sm focus:outline-none"
        spellcheck="false"
      ></textarea>
    </div>

    <!-- Output -->
    <div class="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span class="font-medium text-sm text-slate-700 dark:text-slate-300">Output</span>
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
      <pre class={cn(
        "flex-1 p-3 overflow-auto font-mono text-sm",
        output === '✓ Valid JSON' ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-slate-100'
      )}>{output}</pre>
    </div>
  </div>
</div>
