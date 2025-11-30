<script lang="ts">
  import { Link, Copy, Check, Trash2, ArrowDownUp } from 'lucide-svelte';
  import Select from '$lib/components/ui/Select.svelte';

  let input = $state('');
  let output = $state('');
  let copied = $state(false);
  let mode = $state<'encode' | 'decode'>('encode');
  let encodeType = $state<'component' | 'full'>('component');

  function process() {
    if (!input.trim()) {
      output = '';
      return;
    }
    try {
      if (mode === 'encode') {
        output = encodeType === 'component'
          ? encodeURIComponent(input)
          : encodeURI(input);
      } else {
        output = encodeType === 'component'
          ? decodeURIComponent(input)
          : decodeURI(input);
      }
    } catch (e) {
      output = 'Error: Invalid input for ' + mode;
    }
  }

  function swap() {
    const temp = input;
    input = output;
    output = temp;
    mode = mode === 'encode' ? 'decode' : 'encode';
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

  // Auto-process on input change
  $effect(() => {
    process();
  });
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-accent-500/10">
        <Link class="w-6 h-6 text-accent-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">URL Encoder/Decoder</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Encode or decode URL strings</p>
      </div>
    </div>
  </div>

  <!-- Controls -->
  <div class="mb-4 flex items-center gap-2 flex-wrap">
    <div class="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      <button
        onclick={() => { mode = 'encode'; process(); }}
        class={mode === 'encode'
          ? 'px-4 py-1.5 text-sm font-medium bg-accent-500 text-white'
          : 'px-4 py-1.5 text-sm font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}
      >
        Encode
      </button>
      <button
        onclick={() => { mode = 'decode'; process(); }}
        class={mode === 'decode'
          ? 'px-4 py-1.5 text-sm font-medium bg-accent-500 text-white'
          : 'px-4 py-1.5 text-sm font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}
      >
        Decode
      </button>
    </div>

    <div class="flex items-center gap-2 ml-4">
      <span class="text-sm text-slate-500">Type:</span>
      <Select
        value={encodeType}
        options={[
          { value: 'component', label: 'Component (recommended)' },
          { value: 'full', label: 'Full URI' }
        ]}
        onchange={(v) => { encodeType = v as typeof encodeType; process(); }}
        searchable={false}
        class="w-52"
      />
    </div>

    <button
      onclick={swap}
      disabled={!output}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm disabled:opacity-50 ml-4"
    >
      <ArrowDownUp class="w-4 h-4" />
      Swap
    </button>

    <button
      onclick={clear}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm ml-auto"
    >
      <Trash2 class="w-4 h-4" />
      Clear
    </button>
  </div>

  <!-- Editor -->
  <div class="flex-1 grid grid-cols-2 gap-4 min-h-0">
    <!-- Input -->
    <div class="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="p-3 border-b border-slate-200 dark:border-slate-800">
        <span class="font-medium text-sm text-slate-700 dark:text-slate-300">
          {mode === 'encode' ? 'Plain Text' : 'Encoded URL'}
        </span>
      </div>
      <textarea
        bind:value={input}
        placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter URL to decode...'}
        class="flex-1 p-3 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none font-mono text-sm focus:outline-none"
        spellcheck="false"
      ></textarea>
    </div>

    <!-- Output -->
    <div class="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span class="font-medium text-sm text-slate-700 dark:text-slate-300">
          {mode === 'encode' ? 'Encoded URL' : 'Decoded Text'}
        </span>
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
      <pre class="flex-1 p-3 overflow-auto font-mono text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-all">{output}</pre>
    </div>
  </div>

  <!-- Info -->
  <div class="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400">
    <strong>Component:</strong> Encodes all special characters (use for query params, path segments)
    <br />
    <strong>Full URI:</strong> Preserves URI structure characters like :, /, ?, #, @
  </div>
</div>
