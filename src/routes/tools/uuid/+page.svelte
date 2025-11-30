<script lang="ts">
  import { onMount } from 'svelte';
  import { Fingerprint, Copy, Check, RefreshCw, Trash2, Plus, Minus } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';
  import Select from '$lib/components/ui/Select.svelte';
  import { ulid } from 'ulid';
  import { nanoid, customAlphabet } from 'nanoid';

  type IdType = 'uuid' | 'ulid' | 'nanoid';

  let activeTab = $state<IdType>('uuid');
  let ids = $state<string[]>([]);
  let count = $state(1);
  let copiedIndex = $state<number | null>(null);
  let copiedAll = $state(false);

  // UUID specific
  let uuidFormat = $state<'lowercase' | 'uppercase' | 'no-dashes'>('lowercase');

  // NanoID specific
  let nanoidSize = $state(21);
  let nanoidAlphabet = $state<'default' | 'alphanumeric' | 'numeric' | 'hex' | 'custom'>('default');
  let customNanoidAlphabet = $state('');

  const alphabets: Record<string, string> = {
    default: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-',
    alphanumeric: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    numeric: '0123456789',
    hex: '0123456789abcdef'
  };

  function formatUUID(uuid: string): string {
    let normalized = uuid.toLowerCase().replace(/-/g, '');
    normalized = `${normalized.slice(0,8)}-${normalized.slice(8,12)}-${normalized.slice(12,16)}-${normalized.slice(16,20)}-${normalized.slice(20)}`;

    if (uuidFormat === 'uppercase') {
      return normalized.toUpperCase();
    } else if (uuidFormat === 'no-dashes') {
      return normalized.replace(/-/g, '');
    }
    return normalized;
  }

  function generateOne(): string {
    switch (activeTab) {
      case 'uuid':
        return formatUUID(crypto.randomUUID());
      case 'ulid':
        return ulid();
      case 'nanoid':
        if (nanoidAlphabet === 'default') {
          return nanoid(nanoidSize);
        } else if (nanoidAlphabet === 'custom' && customNanoidAlphabet) {
          const customGen = customAlphabet(customNanoidAlphabet, nanoidSize);
          return customGen();
        } else {
          const customGen = customAlphabet(alphabets[nanoidAlphabet], nanoidSize);
          return customGen();
        }
      default:
        return '';
    }
  }

  function generate() {
    ids = Array.from({ length: count }, () => generateOne());
  }

  function addMore() {
    const newIds = Array.from({ length: count }, () => generateOne());
    ids = [...ids, ...newIds];
  }

  function reformatUUIDs() {
    if (activeTab === 'uuid') {
      ids = ids.map(id => formatUUID(id));
    }
  }

  async function copyId(index: number) {
    await navigator.clipboard.writeText(ids[index]);
    copiedIndex = index;
    setTimeout(() => copiedIndex = null, 2000);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(ids.join('\n'));
    copiedAll = true;
    setTimeout(() => copiedAll = false, 2000);
  }

  function removeId(index: number) {
    ids = ids.filter((_, i) => i !== index);
  }

  function clear() {
    ids = [];
  }

  function switchTab(tab: IdType) {
    activeTab = tab;
    ids = [];
    generate();
  }

  onMount(() => {
    generate();
  });

  const tabInfo: Record<IdType, { name: string; description: string }> = {
    uuid: { name: 'UUID v4', description: 'Universally Unique Identifier (random)' },
    ulid: { name: 'ULID', description: 'Universally Unique Lexicographically Sortable Identifier' },
    nanoid: { name: 'NanoID', description: 'Compact, URL-safe unique string ID' }
  };
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-accent-500/10">
        <Fingerprint class="w-6 h-6 text-accent-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">ID Generator</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Generate UUID, ULID, and NanoID</p>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="mb-4 flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
    {#each (['uuid', 'ulid', 'nanoid'] as IdType[]) as tab}
      <button
        onclick={() => switchTab(tab)}
        class={cn(
          "px-4 py-2 rounded-md text-sm font-medium transition-colors",
          activeTab === tab
            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        )}
      >
        {tabInfo[tab].name}
      </button>
    {/each}
  </div>

  <!-- Tab Description -->
  <div class="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
    <p class="text-sm text-slate-600 dark:text-slate-400">{tabInfo[activeTab].description}</p>
  </div>

  <!-- Controls -->
  <div class="mb-4 flex items-center gap-4 flex-wrap p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
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

    <!-- UUID specific options -->
    {#if activeTab === 'uuid'}
      <div class="flex items-center gap-2">
        <span class="text-sm text-slate-500">Format:</span>
        <Select
          value={uuidFormat}
          options={[
            { value: 'lowercase', label: 'lowercase' },
            { value: 'uppercase', label: 'UPPERCASE' },
            { value: 'no-dashes', label: 'No dashes' }
          ]}
          onchange={(v) => { uuidFormat = v as typeof uuidFormat; reformatUUIDs(); }}
          searchable={false}
          class="w-36"
        />
      </div>
    {/if}

    <!-- NanoID specific options -->
    {#if activeTab === 'nanoid'}
      <div class="flex items-center gap-2">
        <span class="text-sm text-slate-500">Size:</span>
        <input
          type="number"
          bind:value={nanoidSize}
          min="1"
          max="256"
          class="w-20 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
        />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-slate-500">Alphabet:</span>
        <Select
          value={nanoidAlphabet}
          options={[
            { value: 'default', label: 'Default (URL-safe)' },
            { value: 'alphanumeric', label: 'Alphanumeric' },
            { value: 'numeric', label: 'Numeric only' },
            { value: 'hex', label: 'Hexadecimal' },
            { value: 'custom', label: 'Custom' }
          ]}
          onchange={(v) => nanoidAlphabet = v as typeof nanoidAlphabet}
          searchable={false}
          class="w-40"
        />
      </div>
      {#if nanoidAlphabet === 'custom'}
        <input
          type="text"
          bind:value={customNanoidAlphabet}
          placeholder="Enter custom alphabet..."
          class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
        />
      {/if}
    {/if}

    <button
      onclick={generate}
      class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium"
    >
      <RefreshCw class="w-4 h-4" />
      Generate
    </button>

    <button
      onclick={addMore}
      disabled={ids.length >= 100}
      class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium disabled:opacity-50"
    >
      <Plus class="w-4 h-4" />
      Add More
    </button>

    {#if ids.length > 1}
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

  <!-- IDs List -->
  <div class="flex-1 overflow-auto space-y-2">
    {#each ids as id, index}
      <div class="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group">
        <span class="text-xs text-slate-400 w-8">{index + 1}.</span>
        <code class="flex-1 font-mono text-sm text-slate-900 dark:text-slate-100 select-all">
          {id}
        </code>
        <button
          onclick={() => copyId(index)}
          class="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          {#if copiedIndex === index}
            <Check class="w-4 h-4 text-green-500" />
          {:else}
            <Copy class="w-4 h-4" />
          {/if}
        </button>
        <button
          onclick={() => removeId(index)}
          class="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    {/each}

    {#if ids.length === 0}
      <div class="flex items-center justify-center h-full text-slate-400">
        Click "Generate" to create IDs
      </div>
    {/if}
  </div>

  <!-- Stats -->
  {#if ids.length > 0}
    <div class="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
      <span>{ids.length} ID{ids.length !== 1 ? 's' : ''} generated</span>
      <span>
        {#if activeTab === 'uuid'}
          UUID v4 (random) • 36 chars
        {:else if activeTab === 'ulid'}
          ULID • 26 chars • Sortable by time
        {:else}
          NanoID • {nanoidSize} chars • URL-safe
        {/if}
      </span>
    </div>
  {/if}
</div>
