<script lang="ts">
  import { FileCode, ArrowRight, ArrowLeft, ArrowLeftRight, Trash2, Copy, Check, Upload } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';

  let input = $state('');
  let output = $state('');
  let error = $state('');
  let copied = $state(false);
  let isDragging = $state(false);

  function encode() {
    try {
      error = '';
      output = btoa(unescape(encodeURIComponent(input)));
    } catch (e) {
      error = 'Failed to encode. Make sure the input is valid text.';
      output = '';
    }
  }

  function decode() {
    try {
      error = '';
      output = decodeURIComponent(escape(atob(input)));
    } catch (e) {
      error = 'Failed to decode. Make sure the input is valid Base64.';
      output = '';
    }
  }

  function swap() {
    const temp = input;
    input = output;
    output = temp;
    error = '';
  }

  function clear() {
    input = '';
    output = '';
    error = '';
  }

  async function copyOutput() {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      copied = true;
      setTimeout(() => copied = false, 2000);
    } catch (e) {
      error = 'Failed to copy to clipboard';
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;

    const file = e.dataTransfer?.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1] || result;
        input = base64;
        output = '';
        error = '';
      }
    };
    reader.readAsDataURL(file);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="mb-6 flex items-center gap-3">
    <div class="p-2 rounded-lg bg-accent-500/10">
      <FileCode class="w-6 h-6 text-accent-500" />
    </div>
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Base64 Encoder/Decoder</h1>
      <p class="text-sm text-slate-600 dark:text-slate-400">Encode or decode Base64 strings. Drop a file to encode it.</p>
    </div>
  </div>

  <!-- Main Content -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <!-- Input -->
    <div class="space-y-2">
      <label for="input" class="text-sm font-medium text-slate-700 dark:text-slate-300">Input</label>
      <div
        class={cn(
          'relative rounded-xl border-2 border-dashed transition-colors',
          isDragging ? 'border-accent-500 bg-accent-500/5' : 'border-transparent'
        )}
        role="region"
        ondrop={handleDrop}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
      >
        <textarea
          id="input"
          bind:value={input}
          placeholder="Enter text to encode or Base64 to decode..."
          class="w-full h-64 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 resize-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all font-mono text-sm"
        ></textarea>
        {#if isDragging}
          <div class="absolute inset-0 flex items-center justify-center bg-accent-500/10 rounded-xl pointer-events-none">
            <div class="flex items-center gap-2 text-accent-500 font-medium">
              <Upload class="w-5 h-5" />
              Drop file to encode
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Output -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label for="output" class="text-sm font-medium text-slate-700 dark:text-slate-300">Output</label>
        <button
          onclick={copyOutput}
          disabled={!output}
          class={cn(
            'flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition-all',
            output
              ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
          )}
        >
          {#if copied}
            <Check class="w-3.5 h-3.5 text-green-500" />
            <span class="text-green-500">Copied!</span>
          {:else}
            <Copy class="w-3.5 h-3.5" />
            Copy
          {/if}
        </button>
      </div>
      <textarea
        id="output"
        bind:value={output}
        readonly
        placeholder="Output will appear here..."
        class="w-full h-64 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 resize-none font-mono text-sm cursor-text"
      ></textarea>
    </div>
  </div>

  <!-- Error Message -->
  {#if error}
    <div class="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
      {error}
    </div>
  {/if}

  <!-- Actions -->
  <div class="mt-6 flex flex-wrap items-center gap-3">
    <button
      onclick={encode}
      class="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
    >
      Encode
      <ArrowRight class="w-4 h-4" />
    </button>

    <button
      onclick={decode}
      class="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-medium rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
    >
      <ArrowLeft class="w-4 h-4" />
      Decode
    </button>

    <div class="w-px h-6 bg-slate-200 dark:bg-slate-800"></div>

    <button
      onclick={swap}
      disabled={!input && !output}
      class={cn(
        'flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-all',
        input || output
          ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:scale-[1.02] active:scale-[0.98]'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
      )}
    >
      <ArrowLeftRight class="w-4 h-4" />
      Swap
    </button>

    <button
      onclick={clear}
      disabled={!input && !output}
      class={cn(
        'flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-all',
        input || output
          ? 'bg-slate-100 dark:bg-slate-800 hover:bg-red-500/10 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:scale-[1.02] active:scale-[0.98]'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
      )}
    >
      <Trash2 class="w-4 h-4" />
      Clear
    </button>
  </div>
</div>
