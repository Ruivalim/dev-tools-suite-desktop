<script lang="ts">
  import { onMount } from 'svelte';
  import { StickyNote, Plus, X, Trash2, Search, Copy, Check } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';
  import { Store } from '@tauri-apps/plugin-store';

  interface Snippet {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt: number;
  }

  let snippets = $state<Snippet[]>([]);
  let searchQuery = $state('');
  let store: Store | null = null;
  let copiedId = $state<string | null>(null);

  // Modal states
  let showCreateModal = $state(false);
  let showViewModal = $state(false);
  let viewingSnippet = $state<Snippet | null>(null);

  // Form states
  let formTitle = $state('');
  let formContent = $state('');

  const filteredSnippets = $derived.by(() => {
    if (!searchQuery.trim()) return snippets;
    const query = searchQuery.toLowerCase();
    return snippets.filter(
      s => s.title.toLowerCase().includes(query) || s.content.toLowerCase().includes(query)
    );
  });

  onMount(async () => {
    store = await Store.load('snippets.json');
    const saved = await store.get<Snippet[]>('snippets');
    if (saved) {
      snippets = saved;
    }
  });

  async function saveSnippets() {
    if (store) {
      await store.set('snippets', snippets);
      await store.save();
    }
  }

  function openCreateModal() {
    formTitle = '';
    formContent = '';
    showCreateModal = true;
  }

  function openViewModal(snippet: Snippet) {
    viewingSnippet = snippet;
    formTitle = snippet.title;
    formContent = snippet.content;
    showViewModal = true;
  }

  function closeModals() {
    showCreateModal = false;
    showViewModal = false;
    viewingSnippet = null;
    formTitle = '';
    formContent = '';
  }

  function getSnippetTitle(snippet: Snippet): string {
    if (snippet.title.trim()) return snippet.title;
    // Use first line of content as title fallback
    const firstLine = snippet.content.split('\n')[0].trim();
    return firstLine.slice(0, 50) || 'Untitled';
  }

  async function handleSave() {
    if (!formContent.trim()) return;

    if (viewingSnippet) {
      // Editing existing snippet
      const index = snippets.findIndex(s => s.id === viewingSnippet.id);
      if (index !== -1) {
        snippets[index] = {
          ...snippets[index],
          title: formTitle.trim(),
          content: formContent.trim(),
          updatedAt: Date.now()
        };
        snippets = [...snippets];
      }
    } else {
      // Creating new snippet
      const newSnippet: Snippet = {
        id: crypto.randomUUID(),
        title: formTitle.trim(),
        content: formContent.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      snippets = [newSnippet, ...snippets];
    }

    await saveSnippets();
    closeModals();
  }

  async function handleDelete(snippet: Snippet) {
    snippets = snippets.filter(s => s.id !== snippet.id);
    await saveSnippets();
    closeModals();
  }

  async function copySnippet(e: MouseEvent, snippet: Snippet) {
    e.stopPropagation();
    await navigator.clipboard.writeText(snippet.content);
    copiedId = snippet.id;
    setTimeout(() => copiedId = null, 2000);
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-accent-500/10">
        <StickyNote class="w-6 h-6 text-accent-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Snippets</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Save and organize code and text snippets</p>
      </div>
    </div>

    <button
      onclick={openCreateModal}
      class="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-lg transition-colors"
    >
      <Plus class="w-4 h-4" />
      New Snippet
    </button>
  </div>

  <!-- Search -->
  <div class="mb-4">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search snippets..."
        class="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
      />
    </div>
  </div>

  <!-- Snippets Grid -->
  <div class="flex-1 overflow-auto">
    {#if filteredSnippets.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
        <StickyNote class="w-12 h-12 mb-4 opacity-50" />
        <p class="text-lg font-medium">No snippets yet</p>
        <p class="text-sm">Create your first snippet to get started!</p>
      </div>
    {:else}
      <div class="masonry-grid">
        {#each filteredSnippets as snippet (snippet.id)}
          <div
            class="masonry-item bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-accent-500/50 hover:shadow-lg hover:shadow-accent-500/5 transition-all group cursor-pointer"
            onclick={() => openViewModal(snippet)}
            onkeydown={(e) => e.key === 'Enter' && openViewModal(snippet)}
            role="button"
            tabindex="0"
          >
            <div class="p-4">
              <div class="flex items-start justify-between gap-2 mb-2">
                <h3 class={cn(
                  "font-semibold group-hover:text-accent-500 transition-colors line-clamp-2",
                  snippet.title ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400 italic"
                )}>
                  {getSnippetTitle(snippet)}
                </h3>
                <button
                  onclick={(e) => copySnippet(e, snippet)}
                  class="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  title="Copy content"
                >
                  {#if copiedId === snippet.id}
                    <Check class="w-4 h-4 text-green-500" />
                  {:else}
                    <Copy class="w-4 h-4" />
                  {/if}
                </button>
              </div>
              <pre class="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words font-mono bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 max-h-64 overflow-hidden">{snippet.content}</pre>
            </div>
            <div class="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <p class="text-xs text-slate-400 dark:text-slate-500">
                {formatDate(snippet.updatedAt)}
              </p>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Create Modal -->
{#if showCreateModal}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onclick={(e) => e.target === e.currentTarget && closeModals()}
    onkeydown={(e) => e.key === 'Escape' && closeModals()}
    role="dialog"
    tabindex="-1"
  >
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800">
      <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">New Snippet</h2>
        <button
          onclick={closeModals}
          class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-4 space-y-4">
        <div>
          <label for="title" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Title <span class="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="title"
            type="text"
            bind:value={formTitle}
            placeholder="Enter a title..."
            class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label for="content" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content</label>
          <textarea
            id="content"
            bind:value={formContent}
            placeholder="Enter your snippet content..."
            rows="10"
            class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all font-mono text-sm resize-none"
          ></textarea>
        </div>
      </div>

      <div class="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onclick={closeModals}
          class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          Cancel
        </button>
        <button
          onclick={handleSave}
          disabled={!formContent.trim()}
          class={cn(
            'px-4 py-2 rounded-lg font-medium transition-all',
            formContent.trim()
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

<!-- View/Edit Modal -->
{#if showViewModal && viewingSnippet}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onclick={(e) => e.target === e.currentTarget && closeModals()}
    onkeydown={(e) => e.key === 'Escape' && closeModals()}
    role="dialog"
    tabindex="-1"
  >
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800">
      <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit Snippet</h2>
        <div class="flex items-center gap-1">
          <button
            onclick={() => handleDelete(viewingSnippet)}
            class="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 class="w-4 h-4" />
          </button>
          <button
            onclick={closeModals}
            class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <div class="p-4 space-y-4">
        <div>
          <label for="edit-title" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Title <span class="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="edit-title"
            type="text"
            bind:value={formTitle}
            placeholder="Enter a title..."
            class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label for="edit-content" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content</label>
          <textarea
            id="edit-content"
            bind:value={formContent}
            placeholder="Enter your snippet content..."
            rows="10"
            class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all font-mono text-sm resize-none"
          ></textarea>
        </div>

        <p class="text-xs text-slate-400">
          Created: {formatDate(viewingSnippet.createdAt)} · Updated: {formatDate(viewingSnippet.updatedAt)}
        </p>
      </div>

      <div class="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onclick={closeModals}
          class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          Cancel
        </button>
        <button
          onclick={handleSave}
          disabled={!formContent.trim()}
          class={cn(
            'px-4 py-2 rounded-lg font-medium transition-all',
            formContent.trim()
              ? 'bg-accent-500 hover:bg-accent-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
          )}
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .masonry-grid {
    columns: 1;
    column-gap: 1rem;
  }

  @media (min-width: 640px) {
    .masonry-grid {
      columns: 2;
    }
  }

  @media (min-width: 1024px) {
    .masonry-grid {
      columns: 3;
    }
  }

  @media (min-width: 1280px) {
    .masonry-grid {
      columns: 4;
    }
  }

  .masonry-item {
    break-inside: avoid;
    margin-bottom: 1rem;
  }
</style>