<script lang="ts">
  import { onMount } from 'svelte';
  import { Store } from '@tauri-apps/plugin-store';
  import {
    Globe, Send, Plus, X, Copy, Check, Clock, FileJson, ChevronDown,
    Save, FolderOpen, Folder, FolderPlus, ChevronRight, Trash2
  } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';
  import Select from '$lib/components/ui/Select.svelte';

  type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  interface Header {
    id: string;
    key: string;
    value: string;
    enabled: boolean;
  }

  interface SavedRequest {
    id: string;
    name: string;
    method: HttpMethod;
    url: string;
    headers: Header[];
    body: string;
    folder?: string;
    createdAt: number;
    updatedAt: number;
  }

  interface FolderNode {
    name: string;
    path: string;
    children: FolderNode[];
  }

  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  // Current request state
  let method = $state<HttpMethod>('GET');
  let url = $state('');
  let headers = $state<Header[]>([
    { id: crypto.randomUUID(), key: 'Content-Type', value: 'application/json', enabled: true }
  ]);
  let body = $state('');
  let activeTab = $state<'headers' | 'body'>('headers');

  // Response state
  let response = $state<string | null>(null);
  let responseStatus = $state<number | null>(null);
  let responseTime = $state<number | null>(null);
  let responseHeaders = $state<Record<string, string>>({});
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let copied = $state(false);
  let responseTab = $state<'body' | 'headers'>('body');

  // Saved requests state
  let savedRequests = $state<SavedRequest[]>([]);
  let folders = $state<string[]>([]);
  let store: Store | null = null;
  let expandedFolders = $state<Set<string>>(new Set(['']));

  // Modal states
  let showSaveModal = $state(false);
  let showLoadModal = $state(false);
  let showAddFolderModal = $state(false);
  let saveName = $state('');
  let saveFolder = $state('');
  let newFolderName = $state('');
  let parentFolderForNew = $state('');
  let currentRequestId = $state<string | null>(null);

  // Derived folder tree
  let folderTree = $derived.by(() => {
    const root: FolderNode[] = [];
    const pathMap = new Map<string, FolderNode>();
    const sortedFolders = [...folders].sort((a, b) => a.split('/').length - b.split('/').length);

    for (const folderPath of sortedFolders) {
      const parts = folderPath.split('/');
      const name = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');
      const node: FolderNode = { name, path: folderPath, children: [] };
      pathMap.set(folderPath, node);

      if (!parentPath) {
        root.push(node);
      } else if (pathMap.has(parentPath)) {
        pathMap.get(parentPath)!.children.push(node);
      } else {
        root.push(node);
      }
    }
    return root;
  });

  onMount(async () => {
    store = await Store.load('http-requests.json');
    const saved = await store.get<SavedRequest[]>('requests');
    const savedFolders = await store.get<string[]>('folders');
    if (saved) savedRequests = saved;
    if (savedFolders) folders = savedFolders;
  });

  async function saveToStore() {
    if (store) {
      await store.set('requests', savedRequests);
      await store.set('folders', folders);
      await store.save();
    }
  }

  function addHeader() {
    headers = [...headers, { id: crypto.randomUUID(), key: '', value: '', enabled: true }];
  }

  function removeHeader(id: string) {
    headers = headers.filter(h => h.id !== id);
  }

  function toggleHeader(id: string) {
    headers = headers.map(h => h.id === id ? { ...h, enabled: !h.enabled } : h);
  }

  async function sendRequest() {
    if (!url.trim()) {
      error = 'Please enter a URL';
      return;
    }

    isLoading = true;
    error = null;
    response = null;
    responseStatus = null;
    responseTime = null;
    responseHeaders = {};

    const startTime = performance.now();

    try {
      const headersObj: Record<string, string> = {};
      for (const h of headers) {
        if (h.enabled && h.key.trim()) {
          headersObj[h.key] = h.value;
        }
      }

      const options: RequestInit = {
        method,
        headers: headersObj,
      };

      if (method !== 'GET' && body.trim()) {
        options.body = body;
      }

      const res = await fetch(url, options);
      const endTime = performance.now();

      responseStatus = res.status;
      responseTime = Math.round(endTime - startTime);

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        resHeaders[key] = value;
      });
      responseHeaders = resHeaders;

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        response = JSON.stringify(json, null, 2);
      } else {
        response = await res.text();
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Request failed';
    } finally {
      isLoading = false;
    }
  }

  async function copyResponse() {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response);
      copied = true;
      setTimeout(() => copied = false, 2000);
    } catch (e) {
      error = 'Failed to copy to clipboard';
    }
  }

  function formatBody() {
    try {
      const parsed = JSON.parse(body);
      body = JSON.stringify(parsed, null, 2);
    } catch {
      // Not valid JSON, ignore
    }
  }

  function getStatusColor(status: number): string {
    if (status >= 200 && status < 300) return 'text-green-500';
    if (status >= 300 && status < 400) return 'text-yellow-500';
    if (status >= 400 && status < 500) return 'text-orange-500';
    return 'text-red-500';
  }

  function openSaveModal() {
    saveName = '';
    saveFolder = '';
    showSaveModal = true;
  }

  async function handleSaveRequest() {
    if (!saveName.trim()) return;

    const request: SavedRequest = {
      id: currentRequestId || crypto.randomUUID(),
      name: saveName.trim(),
      method,
      url,
      headers: [...headers],
      body,
      folder: saveFolder || undefined,
      createdAt: currentRequestId ? savedRequests.find(r => r.id === currentRequestId)?.createdAt || Date.now() : Date.now(),
      updatedAt: Date.now()
    };

    if (currentRequestId) {
      savedRequests = savedRequests.map(r => r.id === currentRequestId ? request : r);
    } else {
      savedRequests = [...savedRequests, request];
    }

    await saveToStore();
    showSaveModal = false;
    currentRequestId = request.id;
  }

  function loadRequest(request: SavedRequest) {
    method = request.method;
    url = request.url;
    headers = request.headers.map(h => ({ ...h, id: crypto.randomUUID() }));
    body = request.body;
    currentRequestId = request.id;
    showLoadModal = false;

    // Clear response
    response = null;
    responseStatus = null;
    responseTime = null;
    responseHeaders = {};
    error = null;
  }

  async function deleteRequest(id: string) {
    savedRequests = savedRequests.filter(r => r.id !== id);
    if (currentRequestId === id) {
      currentRequestId = null;
    }
    await saveToStore();
  }

  async function addFolder() {
    if (!newFolderName.trim()) return;
    const fullPath = parentFolderForNew
      ? `${parentFolderForNew}/${newFolderName.trim()}`
      : newFolderName.trim();

    if (!folders.includes(fullPath)) {
      folders = [...folders, fullPath];
      await saveToStore();
    }

    newFolderName = '';
    parentFolderForNew = '';
    showAddFolderModal = false;
  }

  async function deleteFolder(folder: string) {
    savedRequests = savedRequests.map(r => {
      if (r.folder === folder || r.folder?.startsWith(folder + '/')) {
        return { ...r, folder: undefined };
      }
      return r;
    });
    folders = folders.filter(f => f !== folder && !f.startsWith(folder + '/'));
    await saveToStore();
  }

  function toggleFolder(folder: string) {
    if (expandedFolders.has(folder)) {
      expandedFolders.delete(folder);
    } else {
      expandedFolders.add(folder);
    }
    expandedFolders = new Set(expandedFolders);
  }

  function getRequestsByFolder(folder: string | undefined): SavedRequest[] {
    return savedRequests.filter(r => (r.folder || '') === (folder || ''));
  }

  function getMethodColor(m: HttpMethod): string {
    switch (m) {
      case 'GET': return 'text-green-500';
      case 'POST': return 'text-blue-500';
      case 'PUT': return 'text-orange-500';
      case 'PATCH': return 'text-yellow-500';
      case 'DELETE': return 'text-red-500';
    }
  }
</script>

<div class="max-w-7xl mx-auto h-full flex flex-col">
  <!-- Header -->
  <div class="mb-6 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-accent-500/10">
        <Globe class="w-6 h-6 text-accent-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">HTTP Client</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Send HTTP requests and inspect responses.</p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        onclick={() => showLoadModal = true}
        class="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
      >
        <FolderOpen class="w-4 h-4" />
        Load
      </button>
      <button
        onclick={openSaveModal}
        disabled={!url.trim()}
        class={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all',
          url.trim()
            ? 'bg-accent-500 hover:bg-accent-600 text-white'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
        )}
      >
        <Save class="w-4 h-4" />
        Save
      </button>
    </div>
  </div>

  <!-- URL Bar -->
  <div class="flex gap-2 mb-4">
    <div class="relative">
      <select
        bind:value={method}
        class={cn(
          'appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-sm cursor-pointer focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all',
          method === 'GET' && 'text-green-500',
          method === 'POST' && 'text-blue-500',
          method === 'PUT' && 'text-orange-500',
          method === 'PATCH' && 'text-yellow-500',
          method === 'DELETE' && 'text-red-500'
        )}
      >
        {#each methods as m}
          <option value={m}>{m}</option>
        {/each}
      </select>
      <ChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>

    <input
      type="text"
      bind:value={url}
      placeholder="Enter URL (e.g., https://api.example.com/users)"
      class="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all font-mono text-sm"
      onkeydown={(e) => e.key === 'Enter' && sendRequest()}
    />

    <button
      onclick={sendRequest}
      disabled={isLoading}
      class={cn(
        'flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all',
        isLoading
          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
          : 'bg-accent-500 hover:bg-accent-600 text-white hover:scale-[1.02] active:scale-[0.98]'
      )}
    >
      <Send class={cn('w-4 h-4', isLoading && 'animate-pulse')} />
      {isLoading ? 'Sending...' : 'Send'}
    </button>
  </div>

  <!-- Request Config -->
  <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
    <!-- Request Panel -->
    <div class="flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div class="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onclick={() => activeTab = 'headers'}
          class={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'headers'
              ? 'text-accent-500 border-b-2 border-accent-500'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          )}
        >
          Headers ({headers.filter(h => h.enabled).length})
        </button>
        <button
          onclick={() => activeTab = 'body'}
          class={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'body'
              ? 'text-accent-500 border-b-2 border-accent-500'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          )}
        >
          Body
        </button>
      </div>

      <div class="flex-1 overflow-auto p-4">
        {#if activeTab === 'headers'}
          <div class="space-y-2">
            {#each headers as header (header.id)}
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={header.enabled}
                  onchange={() => toggleHeader(header.id)}
                  class="rounded border-slate-300 dark:border-slate-700 text-accent-500 focus:ring-accent-500"
                />
                <input
                  type="text"
                  bind:value={header.key}
                  placeholder="Header name"
                  class="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                />
                <input
                  type="text"
                  bind:value={header.value}
                  placeholder="Value"
                  class="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                />
                <button
                  onclick={() => removeHeader(header.id)}
                  class="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            {/each}
            <button
              onclick={addHeader}
              class="flex items-center gap-1 text-sm text-slate-500 hover:text-accent-500 transition-colors"
            >
              <Plus class="w-4 h-4" />
              Add Header
            </button>
          </div>
        {:else}
          <div class="h-full flex flex-col">
            <div class="flex justify-end mb-2">
              <button
                onclick={formatBody}
                class="flex items-center gap-1 text-xs text-slate-500 hover:text-accent-500 transition-colors"
              >
                <FileJson class="w-3.5 h-3.5" />
                Format JSON
              </button>
            </div>
            <textarea
              bind:value={body}
              placeholder={'{"key": "value"}'}
              class="flex-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 font-mono text-sm resize-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
            ></textarea>
          </div>
        {/if}
      </div>
    </div>

    <!-- Response Panel -->
    <div class="flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div class="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-4">
          <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Response</span>
          {#if responseStatus !== null}
            <span class={cn('text-sm font-bold', getStatusColor(responseStatus))}>
              {responseStatus}
            </span>
          {/if}
          {#if responseTime !== null}
            <span class="flex items-center gap-1 text-xs text-slate-500">
              <Clock class="w-3 h-3" />
              {responseTime}ms
            </span>
          {/if}
        </div>
        {#if response}
          <button
            onclick={copyResponse}
            class="flex items-center gap-1 text-xs text-slate-500 hover:text-accent-500 transition-colors"
          >
            {#if copied}
              <Check class="w-3.5 h-3.5 text-green-500" />
              <span class="text-green-500">Copied!</span>
            {:else}
              <Copy class="w-3.5 h-3.5" />
              Copy
            {/if}
          </button>
        {/if}
      </div>

      {#if response || Object.keys(responseHeaders).length > 0}
        <div class="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onclick={() => responseTab = 'body'}
            class={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              responseTab === 'body'
                ? 'text-accent-500 border-b-2 border-accent-500'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            Body
          </button>
          <button
            onclick={() => responseTab = 'headers'}
            class={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              responseTab === 'headers'
                ? 'text-accent-500 border-b-2 border-accent-500'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            Headers ({Object.keys(responseHeaders).length})
          </button>
        </div>
      {/if}

      <div class="flex-1 overflow-auto p-4">
        {#if isLoading}
          <div class="flex items-center justify-center h-full text-slate-400">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 border-2 border-accent-500 border-t-transparent rounded-full animate-spin"></div>
              Sending request...
            </div>
          </div>
        {:else if error}
          <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        {:else if response || Object.keys(responseHeaders).length > 0}
          {#if responseTab === 'body'}
            <pre class="text-sm text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap break-words">{response || 'No body'}</pre>
          {:else}
            <div class="space-y-1">
              {#each Object.entries(responseHeaders) as [key, value]}
                <div class="flex gap-2 text-sm">
                  <span class="font-medium text-slate-700 dark:text-slate-300">{key}:</span>
                  <span class="text-slate-500 dark:text-slate-400 break-all">{value}</span>
                </div>
              {/each}
            </div>
          {/if}
        {:else}
          <div class="flex flex-col items-center justify-center h-full text-slate-400">
            <Send class="w-8 h-8 mb-2 opacity-50" />
            <p class="text-sm">Send a request to see the response</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Save Modal -->
{#if showSaveModal}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onclick={(e) => e.target === e.currentTarget && (showSaveModal = false)}
    onkeydown={(e) => e.key === 'Escape' && (showSaveModal = false)}
    role="dialog"
    tabindex="-1"
  >
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800">
      <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Save Request</h2>
        <button
          onclick={() => showSaveModal = false}
          class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-4 space-y-4">
        <div>
          <label for="save-name" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
          <input
            id="save-name"
            type="text"
            bind:value={saveName}
            placeholder="e.g., Get Users"
            class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label for="save-folder" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Folder (optional)</label>
          <Select
            value={saveFolder}
            options={[
              { value: '', label: 'No folder' },
              ...folders.map(f => ({ value: f, label: f }))
            ]}
            onchange={(v) => saveFolder = v}
            searchable={folders.length > 5}
            class="w-full"
          />
        </div>

        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-sm">
          <span class={cn('font-semibold', getMethodColor(method))}>{method}</span>
          <span class="text-slate-600 dark:text-slate-400 ml-2 truncate">{url}</span>
        </div>
      </div>

      <div class="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onclick={() => showSaveModal = false}
          class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          Cancel
        </button>
        <button
          onclick={handleSaveRequest}
          disabled={!saveName.trim()}
          class={cn(
            'px-4 py-2 rounded-lg font-medium transition-all',
            saveName.trim()
              ? 'bg-accent-500 hover:bg-accent-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
          )}
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Load Modal -->
{#if showLoadModal}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onclick={(e) => e.target === e.currentTarget && (showLoadModal = false)}
    onkeydown={(e) => e.key === 'Escape' && (showLoadModal = false)}
    role="dialog"
    tabindex="-1"
  >
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 max-h-[80vh] flex flex-col">
      <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Saved Requests</h2>
        <div class="flex items-center gap-2">
          <button
            onclick={() => { showAddFolderModal = true; parentFolderForNew = ''; }}
            class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-accent-500 transition-colors"
            title="New Folder"
          >
            <FolderPlus class="w-4 h-4" />
          </button>
          <button
            onclick={() => showLoadModal = false}
            class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-4">
        {#if savedRequests.length === 0 && folders.length === 0}
          <div class="flex flex-col items-center justify-center py-8 text-slate-400">
            <FolderOpen class="w-10 h-10 mb-2 opacity-50" />
            <p class="text-sm">No saved requests yet</p>
          </div>
        {:else}
          <!-- Root level requests -->
          {#each getRequestsByFolder('') as request (request.id)}
            <div
              onclick={() => loadRequest(request)}
              onkeydown={(e) => e.key === 'Enter' && loadRequest(request)}
              role="button"
              tabindex="0"
              class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
            >
              <span class={cn('text-xs font-bold w-14', getMethodColor(request.method))}>{request.method}</span>
              <div class="flex-1 text-left min-w-0">
                <div class="font-medium text-slate-900 dark:text-slate-100 truncate">{request.name}</div>
                <div class="text-xs text-slate-500 truncate">{request.url}</div>
              </div>
              <button
                onclick={(e) => { e.stopPropagation(); deleteRequest(request.id); }}
                class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          {/each}

          <!-- Folders -->
          {#snippet renderFolder(node: FolderNode, depth: number)}
            <div style="margin-left: {depth * 16}px">
              <div class="flex items-center gap-1">
                <button
                  onclick={() => toggleFolder(node.path)}
                  class="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex-1"
                >
                  {#if expandedFolders.has(node.path)}
                    <ChevronDown class="w-4 h-4 text-slate-400" />
                    <Folder class="w-4 h-4 text-accent-500" />
                  {:else}
                    <ChevronRight class="w-4 h-4 text-slate-400" />
                    <Folder class="w-4 h-4 text-slate-400" />
                  {/if}
                  <span class="font-medium">{node.name}</span>
                </button>
                <button
                  onclick={() => { showAddFolderModal = true; parentFolderForNew = node.path; }}
                  class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-accent-500 transition-colors"
                  title="Add subfolder"
                >
                  <FolderPlus class="w-3.5 h-3.5" />
                </button>
                <button
                  onclick={() => deleteFolder(node.path)}
                  class="p-1 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                  title="Delete folder"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>

              {#if expandedFolders.has(node.path)}
                <!-- Requests in this folder -->
                {#each getRequestsByFolder(node.path) as request (request.id)}
                  <div
                    onclick={() => loadRequest(request)}
                    onkeydown={(e) => e.key === 'Enter' && loadRequest(request)}
                    role="button"
                    tabindex="0"
                    class="w-full flex items-center gap-3 p-3 pl-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                  >
                    <span class={cn('text-xs font-bold w-14', getMethodColor(request.method))}>{request.method}</span>
                    <div class="flex-1 text-left min-w-0">
                      <div class="font-medium text-slate-900 dark:text-slate-100 truncate">{request.name}</div>
                      <div class="text-xs text-slate-500 truncate">{request.url}</div>
                    </div>
                    <button
                      onclick={(e) => { e.stopPropagation(); deleteRequest(request.id); }}
                      class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                {/each}

                <!-- Child folders -->
                {#each node.children as child}
                  {@render renderFolder(child, depth + 1)}
                {/each}
              {/if}
            </div>
          {/snippet}

          {#each folderTree as node}
            {@render renderFolder(node, 0)}
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Add Folder Modal -->
{#if showAddFolderModal}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
    onclick={(e) => e.target === e.currentTarget && (showAddFolderModal = false)}
    onkeydown={(e) => e.key === 'Escape' && (showAddFolderModal = false)}
    role="dialog"
    tabindex="-1"
  >
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800">
      <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {parentFolderForNew ? `New Subfolder in ${parentFolderForNew}` : 'New Folder'}
        </h2>
        <button
          onclick={() => showAddFolderModal = false}
          class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-4">
        <input
          type="text"
          bind:value={newFolderName}
          placeholder="Folder name"
          class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
          onkeydown={(e) => e.key === 'Enter' && addFolder()}
        />
      </div>

      <div class="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onclick={() => showAddFolderModal = false}
          class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          Cancel
        </button>
        <button
          onclick={addFolder}
          disabled={!newFolderName.trim()}
          class={cn(
            'px-4 py-2 rounded-lg font-medium transition-all',
            newFolderName.trim()
              ? 'bg-accent-500 hover:bg-accent-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
          )}
        >
          Create
        </button>
      </div>
    </div>
  </div>
{/if}
