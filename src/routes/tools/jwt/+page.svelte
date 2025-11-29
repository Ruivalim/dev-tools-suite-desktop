<script lang="ts">
  import { Key, Copy, Check, Trash2, AlertCircle, Clock, User } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';

  let input = $state('');
  let header = $state<Record<string, any> | null>(null);
  let payload = $state<Record<string, any> | null>(null);
  let signature = $state('');
  let error = $state('');
  let copiedSection = $state<string | null>(null);

  function decodeJWT() {
    error = '';
    header = null;
    payload = null;
    signature = '';

    if (!input.trim()) return;

    const parts = input.trim().split('.');
    if (parts.length !== 3) {
      error = 'Invalid JWT format. Expected 3 parts separated by dots.';
      return;
    }

    try {
      // Decode header
      const headerJson = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
      header = JSON.parse(headerJson);
    } catch (e) {
      error = 'Failed to decode header';
      return;
    }

    try {
      // Decode payload
      const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      payload = JSON.parse(payloadJson);
    } catch (e) {
      error = 'Failed to decode payload';
      return;
    }

    signature = parts[2];
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }

  function isExpired(exp: number): boolean {
    return Date.now() > exp * 1000;
  }

  function getTimeUntilExpiry(exp: number): string {
    const diff = exp * 1000 - Date.now();
    if (diff < 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    }
    return `${hours}h ${minutes}m remaining`;
  }

  async function copySection(section: string, content: any) {
    await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    copiedSection = section;
    setTimeout(() => copiedSection = null, 2000);
  }

  function clear() {
    input = '';
    header = null;
    payload = null;
    signature = '';
    error = '';
  }

  // Auto-decode on input change
  $effect(() => {
    if (input) {
      decodeJWT();
    }
  });
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-accent-500/10">
        <Key class="w-6 h-6 text-accent-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">JWT Decoder</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Decode and inspect JWT tokens (without validation)</p>
      </div>
    </div>
    <button
      onclick={clear}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
    >
      <Trash2 class="w-4 h-4" />
      Clear
    </button>
  </div>

  <!-- Input -->
  <div class="mb-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
    <div class="p-3 border-b border-slate-200 dark:border-slate-800">
      <span class="font-medium text-sm text-slate-700 dark:text-slate-300">JWT Token</span>
    </div>
    <textarea
      bind:value={input}
      placeholder="Paste your JWT token here..."
      class="w-full h-24 p-3 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none font-mono text-sm focus:outline-none"
      spellcheck="false"
    ></textarea>
  </div>

  <!-- Error -->
  {#if error}
    <div class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
      <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <span class="text-sm text-red-700 dark:text-red-300">{error}</span>
    </div>
  {/if}

  <!-- Decoded sections -->
  {#if header || payload}
    <div class="flex-1 grid grid-cols-2 gap-4 min-h-0 overflow-auto">
      <!-- Header -->
      <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div class="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-red-50 dark:bg-red-900/20">
          <span class="font-medium text-sm text-red-700 dark:text-red-300">Header</span>
          <button
            onclick={() => copySection('header', header)}
            class="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
          >
            {#if copiedSection === 'header'}
              <Check class="w-4 h-4" />
            {:else}
              <Copy class="w-4 h-4" />
            {/if}
          </button>
        </div>
        <pre class="p-3 overflow-auto font-mono text-sm text-slate-900 dark:text-slate-100">{JSON.stringify(header, null, 2)}</pre>
      </div>

      <!-- Payload -->
      <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div class="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-purple-50 dark:bg-purple-900/20">
          <span class="font-medium text-sm text-purple-700 dark:text-purple-300">Payload</span>
          <button
            onclick={() => copySection('payload', payload)}
            class="p-1.5 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-500"
          >
            {#if copiedSection === 'payload'}
              <Check class="w-4 h-4" />
            {:else}
              <Copy class="w-4 h-4" />
            {/if}
          </button>
        </div>
        <pre class="p-3 overflow-auto font-mono text-sm text-slate-900 dark:text-slate-100">{JSON.stringify(payload, null, 2)}</pre>
      </div>
    </div>

    <!-- Claims info -->
    {#if payload}
      <div class="mt-4 grid grid-cols-3 gap-4">
        {#if payload.exp}
          <div class={cn(
            "p-3 rounded-lg border",
            isExpired(payload.exp)
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          )}>
            <div class="flex items-center gap-2 mb-1">
              <Clock class={cn("w-4 h-4", isExpired(payload.exp) ? "text-red-500" : "text-green-500")} />
              <span class={cn("text-xs font-medium", isExpired(payload.exp) ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300")}>
                Expiration (exp)
              </span>
            </div>
            <p class="text-sm text-slate-700 dark:text-slate-300">{formatDate(payload.exp)}</p>
            <p class={cn("text-xs mt-1", isExpired(payload.exp) ? "text-red-500" : "text-green-500")}>
              {getTimeUntilExpiry(payload.exp)}
            </p>
          </div>
        {/if}

        {#if payload.iat}
          <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-2 mb-1">
              <Clock class="w-4 h-4 text-slate-500" />
              <span class="text-xs font-medium text-slate-600 dark:text-slate-400">Issued At (iat)</span>
            </div>
            <p class="text-sm text-slate-700 dark:text-slate-300">{formatDate(payload.iat)}</p>
          </div>
        {/if}

        {#if payload.sub}
          <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-2 mb-1">
              <User class="w-4 h-4 text-slate-500" />
              <span class="text-xs font-medium text-slate-600 dark:text-slate-400">Subject (sub)</span>
            </div>
            <p class="text-sm text-slate-700 dark:text-slate-300 truncate">{payload.sub}</p>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Signature -->
    <div class="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs font-medium text-blue-700 dark:text-blue-300">Signature (not verified)</span>
        <button
          onclick={() => copySection('signature', signature)}
          class="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500"
        >
          {#if copiedSection === 'signature'}
            <Check class="w-3 h-3" />
          {:else}
            <Copy class="w-3 h-3" />
          {/if}
        </button>
      </div>
      <p class="font-mono text-xs text-blue-600 dark:text-blue-400 break-all">{signature}</p>
    </div>
  {:else if !error && !input}
    <div class="flex-1 flex items-center justify-center text-slate-400">
      Paste a JWT token to decode it
    </div>
  {/if}
</div>
