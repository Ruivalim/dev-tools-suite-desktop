<script lang="ts">
  import { onMount } from 'svelte';
  import { StickyNote, Plus, X, Trash2, Search, Copy, Check, Maximize2, Minimize2 } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';
  import { Store } from '@tauri-apps/plugin-store';

  interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt: number;
  }

  let notes = $state<Note[]>([]);
  let searchQuery = $state('');
  let store: Store | null = null;
  let copiedId = $state<string | null>(null);

  // Modal states
  let showCreateModal = $state(false);
  let showViewModal = $state(false);
  let viewingNote = $state<Note | null>(null);
  let isFullscreen = $state(false);

  // Form states
  let formTitle = $state('');
  let formContent = $state('');

  const filteredNotes = $derived.by(() => {
    if (!searchQuery.trim()) return notes;
    const query = searchQuery.toLowerCase();
    return notes.filter(
      s => s.title.toLowerCase().includes(query) || s.content.toLowerCase().includes(query)
    );
  });

  onMount(async () => {
    store = await Store.load('notes.json');
    const saved = await store.get<Note[]>('notes');
    if (saved) {
      notes = saved;
    }
  });

  async function saveNotes() {
    if (store) {
      await store.set('notes', notes);
      await store.save();
    }
  }

  function openCreateModal() {
    formTitle = '';
    formContent = '';
    isFullscreen = false;
    showCreateModal = true;
  }

  function openViewModal(note: Note) {
    viewingNote = note;
    formTitle = note.title;
    formContent = note.content;
    isFullscreen = false;
    showViewModal = true;
  }

  function closeModals() {
    showCreateModal = false;
    showViewModal = false;
    viewingNote = null;
    formTitle = '';
    formContent = '';
    isFullscreen = false;
  }

  function getNoteTitle(note: Note): string {
    if (note.title.trim()) return note.title;
    // Use first line of content as title fallback
    const firstLine = note.content.split('\n')[0].trim();
    return firstLine.slice(0, 50) || 'Untitled';
  }

  async function handleSave() {
    if (!formContent.trim()) return;

    if (viewingNote) {
      // Editing existing note
      const index = notes.findIndex(s => s.id === viewingNote.id);
      if (index !== -1) {
        notes[index] = {
          ...notes[index],
          title: formTitle.trim(),
          content: formContent.trim(),
          updatedAt: Date.now()
        };
        notes = [...notes];
      }
    } else {
      // Creating new note
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: formTitle.trim(),
        content: formContent.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      notes = [newNote, ...notes];
    }

    await saveNotes();
    closeModals();
  }

  async function handleDelete(note: Note) {
    notes = notes.filter(s => s.id !== note.id);
    await saveNotes();
    closeModals();
  }

  async function copyNote(e: MouseEvent, note: Note) {
    e.stopPropagation();
    await navigator.clipboard.writeText(note.content);
    copiedId = note.id;
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
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Notes</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Save and organize quick notes</p>
      </div>
    </div>

    <button
      onclick={openCreateModal}
      class="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-lg transition-colors"
    >
      <Plus class="w-4 h-4" />
      New Note
    </button>
  </div>

  <!-- Search -->
  <div class="mb-4">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search notes..."
        class="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
      />
    </div>
  </div>

  <!-- Notes Grid -->
  <div class="flex-1 overflow-auto">
    {#if filteredNotes.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
        <StickyNote class="w-12 h-12 mb-4 opacity-50" />
        <p class="text-lg font-medium">No notes yet</p>
        <p class="text-sm">Create your first note to get started!</p>
      </div>
    {:else}
      <div class="masonry-grid">
        {#each filteredNotes as note (note.id)}
          <div
            class="masonry-item bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-accent-500/50 hover:shadow-lg hover:shadow-accent-500/5 transition-all group cursor-pointer"
            onclick={() => openViewModal(note)}
            onkeydown={(e) => e.key === 'Enter' && openViewModal(note)}
            role="button"
            tabindex="0"
          >
            <div class="p-4">
              <div class="flex items-start justify-between gap-2 mb-2">
                <h3 class={cn(
                  "font-semibold group-hover:text-accent-500 transition-colors line-clamp-2",
                  note.title ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400 italic"
                )}>
                  {getNoteTitle(note)}
                </h3>
                <button
                  onclick={(e) => copyNote(e, note)}
                  class="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  title="Copy content"
                >
                  {#if copiedId === note.id}
                    <Check class="w-4 h-4 text-green-500" />
                  {:else}
                    <Copy class="w-4 h-4" />
                  {/if}
                </button>
              </div>
              <pre class="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 max-h-64 overflow-hidden">{note.content}</pre>
            </div>
            <div class="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <p class="text-xs text-slate-400 dark:text-slate-500">
                {formatDate(note.updatedAt)}
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
    <div class={cn(
      "bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200",
      isFullscreen ? "w-full h-full max-w-none rounded-none" : "w-full max-w-2xl max-h-[90vh]"
    )}>
      <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">New Note</h2>
        <div class="flex items-center gap-1">
          <button
            onclick={() => isFullscreen = !isFullscreen}
            class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {#if isFullscreen}
              <Minimize2 class="w-4 h-4" />
            {:else}
              <Maximize2 class="w-4 h-4" />
            {/if}
          </button>
          <button
            onclick={closeModals}
            class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <div class="p-4 space-y-4 flex-1 overflow-auto flex flex-col">
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

        <div class="flex-1 flex flex-col min-h-0">
          <label for="content" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content</label>
          <textarea
            id="content"
            bind:value={formContent}
            placeholder="Write your note..."
            class={cn(
              "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all resize-none",
              isFullscreen ? "flex-1" : "min-h-[300px]"
            )}
          ></textarea>
        </div>
      </div>

      <div class="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
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
{#if showViewModal && viewingNote}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onclick={(e) => e.target === e.currentTarget && closeModals()}
    onkeydown={(e) => e.key === 'Escape' && closeModals()}
    role="dialog"
    tabindex="-1"
  >
    <div class={cn(
      "bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200",
      isFullscreen ? "w-full h-full max-w-none rounded-none" : "w-full max-w-2xl max-h-[90vh]"
    )}>
      <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit Note</h2>
        <div class="flex items-center gap-1">
          <button
            onclick={() => isFullscreen = !isFullscreen}
            class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {#if isFullscreen}
              <Minimize2 class="w-4 h-4" />
            {:else}
              <Maximize2 class="w-4 h-4" />
            {/if}
          </button>
          <button
            onclick={() => handleDelete(viewingNote)}
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

      <div class="p-4 space-y-4 flex-1 overflow-auto flex flex-col">
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

        <div class="flex-1 flex flex-col min-h-0">
          <label for="edit-content" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content</label>
          <textarea
            id="edit-content"
            bind:value={formContent}
            placeholder="Write your note..."
            class={cn(
              "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all resize-none",
              isFullscreen ? "flex-1" : "min-h-[300px]"
            )}
          ></textarea>
        </div>

        <p class="text-xs text-slate-400 flex-shrink-0">
          Created: {formatDate(viewingNote.createdAt)} · Updated: {formatDate(viewingNote.updatedAt)}
        </p>
      </div>

      <div class="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
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
