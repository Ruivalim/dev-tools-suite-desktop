<script lang="ts">
	import { onMount } from 'svelte';
	import { StickyNote, Plus, X, Trash2, Search, Copy, Check, Maximize2, Minimize2, Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';
	import { Store } from '@tauri-apps/plugin-store';
	import { invoke } from '@tauri-apps/api/core';
	import { syncStore } from '$lib/stores/sync.svelte';

	interface Note {
		id: string;
		title: string;
		content: string;
		createdAt: number;
		updatedAt: number;
		deleted?: boolean;
	}

	interface SyncNote {
		id: string;
		title: string;
		content: string;
		created_at: number;
		updated_at: number;
		deleted: boolean;
	}

	let notes = $state<Note[]>([]);
	let searchQuery = $state('');
	let store: Store | null = null;
	let copiedId = $state<string | null>(null);
	let syncing = $state(false);
	let lastSyncError = $state<string | null>(null);

	// Modal states
	let showCreateModal = $state(false);
	let showViewModal = $state(false);
	let viewingNote = $state<Note | null>(null);
	let isFullscreen = $state(false);

	// Form states
	let formTitle = $state('');
	let formContent = $state('');

	const filteredNotes = $derived.by(() => {
		const activeNotes = notes.filter((n) => !n.deleted);
		if (!searchQuery.trim()) return activeNotes;
		const query = searchQuery.toLowerCase();
		return activeNotes.filter((s) => s.title.toLowerCase().includes(query) || s.content.toLowerCase().includes(query));
	});

	onMount(async () => {
		store = await Store.load('notes.json');
		const saved = await store.get<Note[]>('notes');
		if (saved) {
			notes = saved;
		}

		// Initialize sync and pull from remote
		await syncStore.init();
		if (syncStore.isConfigured) {
			await pullFromRemote();
		}
	});

	async function saveNotes() {
		if (store) {
			await store.set('notes', notes);
			await store.save();
		}
	}

	async function syncToRemote(changedNotes: Note[]) {
		if (!syncStore.isConfigured || changedNotes.length === 0) return;

		syncing = true;
		lastSyncError = null;

		try {
			const syncNotes: SyncNote[] = changedNotes.map((n) => ({
				id: n.id,
				title: n.title,
				content: n.content,
				created_at: n.createdAt,
				updated_at: n.updatedAt,
				deleted: n.deleted || false
			}));

			await invoke('sync_notes_push', {
				connectionString: syncStore.config.connectionString,
				notes: syncNotes
			});

			await syncStore.updateLastSync(Date.now());
		} catch (e) {
			console.error('Failed to sync to remote:', e);
			lastSyncError = String(e);
		} finally {
			syncing = false;
		}
	}

	async function manualSync() {
		if (!syncStore.isConfigured || syncing) return;

		// Pull first, then push all local notes
		await pullFromRemote();

		// Push all non-deleted notes
		const allNotes = notes.filter((n) => n.updatedAt > 0);
		if (allNotes.length > 0) {
			await syncToRemote(allNotes);
		}
	}

	async function pullFromRemote() {
		if (!syncStore.isConfigured) return;

		syncing = true;
		lastSyncError = null;

		try {
			const remoteNotes = await invoke<SyncNote[]>('sync_notes_pull', {
				connectionString: syncStore.config.connectionString,
				since: 0 // Pull all notes
			});

			// Merge remote notes with local
			let updated = false;
			for (const remote of remoteNotes) {
				const localIndex = notes.findIndex((n) => n.id === remote.id);

				if (localIndex === -1) {
					// Note doesn't exist locally, add it
					if (!remote.deleted) {
						notes.push({
							id: remote.id,
							title: remote.title,
							content: remote.content,
							createdAt: remote.created_at,
							updatedAt: remote.updated_at,
							deleted: remote.deleted
						});
						updated = true;
					}
				} else {
					// Note exists locally, check if remote is newer
					const local = notes[localIndex];
					if (remote.updated_at > local.updatedAt) {
						notes[localIndex] = {
							id: remote.id,
							title: remote.title,
							content: remote.content,
							createdAt: remote.created_at,
							updatedAt: remote.updated_at,
							deleted: remote.deleted
						};
						updated = true;
					}
				}
			}

			if (updated) {
				notes = [...notes];
				await saveNotes();
			}

			await syncStore.updateLastSync(Date.now());
		} catch (e) {
			console.error('Failed to pull from remote:', e);
			lastSyncError = String(e);
		} finally {
			syncing = false;
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

		let changedNote: Note;

		if (viewingNote) {
			// Editing existing note
			const index = notes.findIndex((s) => s.id === viewingNote.id);
			if (index !== -1) {
				changedNote = {
					...notes[index],
					title: formTitle.trim(),
					content: formContent.trim(),
					updatedAt: Date.now()
				};
				notes[index] = changedNote;
				notes = [...notes];
			} else {
				closeModals();
				return;
			}
		} else {
			// Creating new note
			changedNote = {
				id: crypto.randomUUID(),
				title: formTitle.trim(),
				content: formContent.trim(),
				createdAt: Date.now(),
				updatedAt: Date.now()
			};
			notes = [changedNote, ...notes];
		}

		await saveNotes();
		closeModals();

		// Sync to remote in background
		syncToRemote([changedNote]);
	}

	async function handleDelete(note: Note) {
		const index = notes.findIndex((s) => s.id === note.id);
		if (index !== -1) {
			// Mark as deleted instead of removing (for sync)
			const deletedNote: Note = {
				...notes[index],
				deleted: true,
				updatedAt: Date.now()
			};
			notes[index] = deletedNote;
			notes = [...notes];

			await saveNotes();
			closeModals();

			// Sync deletion to remote
			syncToRemote([deletedNote]);
		}
	}

	async function copyNote(e: MouseEvent, note: Note) {
		e.stopPropagation();
		await navigator.clipboard.writeText(note.content);
		copiedId = note.id;
		setTimeout(() => (copiedId = null), 2000);
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<StickyNote class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Notes</h1>
				<p class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
					Save and organize quick notes
					{#if syncStore.isConfigured}
						{#if syncing}
							<span class="inline-flex items-center gap-1 text-xs text-accent-500">
								<Loader2 class="h-3 w-3 animate-spin" />
								Syncing...
							</span>
						{:else if lastSyncError}
							<button onclick={manualSync} class="inline-flex items-center gap-1 text-xs text-red-500 transition-colors hover:text-red-600" title={lastSyncError}>
								<CloudOff class="h-3 w-3" />
								Sync error - click to retry
							</button>
						{:else}
							<button onclick={manualSync} class="inline-flex items-center gap-1 text-xs text-green-500 transition-colors hover:text-green-600" title="Click to sync now">
								<Cloud class="h-3 w-3" />
								Synced
								<RefreshCw class="h-3 w-3" />
							</button>
						{/if}
					{/if}
				</p>
			</div>
		</div>

		<button onclick={openCreateModal} class="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-600">
			<Plus class="h-4 w-4" />
			New Note
		</button>
	</div>

	<!-- Search -->
	<div class="mb-4">
		<div class="relative">
			<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search notes..."
				class="w-full rounded-lg border border-slate-200 bg-white py-2 pr-4 pl-10 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
			/>
		</div>
	</div>

	<!-- Notes Grid -->
	<div class="flex-1 overflow-auto">
		{#if filteredNotes.length === 0}
			<div class="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
				<StickyNote class="mb-4 h-12 w-12 opacity-50" />
				<p class="text-lg font-medium">No notes yet</p>
				<p class="text-sm">Create your first note to get started!</p>
			</div>
		{:else}
			<div class="masonry-grid">
				{#each filteredNotes as note (note.id)}
					<div
						class="masonry-item group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-accent-500/50 hover:shadow-lg hover:shadow-accent-500/5 dark:border-slate-800 dark:bg-slate-900"
						onclick={() => openViewModal(note)}
						onkeydown={(e) => e.key === 'Enter' && openViewModal(note)}
						role="button"
						tabindex="0"
					>
						<div class="p-4">
							<div class="mb-2 flex items-start justify-between gap-2">
								<h3
									class={cn(
										'line-clamp-2 font-semibold transition-colors group-hover:text-accent-500',
										note.title ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 italic dark:text-slate-400'
									)}
								>
									{getNoteTitle(note)}
								</h3>
								<button
									onclick={(e) => copyNote(e, note)}
									class="flex-shrink-0 rounded-md p-1.5 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
									title="Copy content"
								>
									{#if copiedId === note.id}
										<Check class="h-4 w-4 text-green-500" />
									{:else}
										<Copy class="h-4 w-4" />
									{/if}
								</button>
							</div>
							<pre class="max-h-64 overflow-hidden rounded-lg bg-slate-50 p-3 text-sm break-words whitespace-pre-wrap text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">{note.content}</pre>
						</div>
						<div class="border-t border-slate-100 bg-slate-50/50 px-4 py-2 dark:border-slate-800 dark:bg-slate-800/30">
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
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => e.target === e.currentTarget && closeModals()}
		onkeydown={(e) => e.key === 'Escape' && closeModals()}
		role="dialog"
		tabindex="-1"
	>
		<div
			class={cn(
				'flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 dark:border-slate-800 dark:bg-slate-900',
				isFullscreen ? 'h-full w-full max-w-none rounded-none' : 'max-h-[90vh] w-full max-w-2xl'
			)}
		>
			<div class="flex flex-shrink-0 items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">New Note</h2>
				<div class="flex items-center gap-1">
					<button
						onclick={() => (isFullscreen = !isFullscreen)}
						class="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
						title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
					>
						{#if isFullscreen}
							<Minimize2 class="h-4 w-4" />
						{:else}
							<Maximize2 class="h-4 w-4" />
						{/if}
					</button>
					<button onclick={closeModals} class="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
						<X class="h-5 w-5" />
					</button>
				</div>
			</div>

			<div class="flex flex-1 flex-col space-y-4 overflow-auto p-4">
				<div>
					<label for="title" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
						Title <span class="font-normal text-slate-400">(optional)</span>
					</label>
					<input
						id="title"
						type="text"
						bind:value={formTitle}
						placeholder="Enter a title..."
						class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
					/>
				</div>

				<div class="flex min-h-0 flex-1 flex-col">
					<label for="content" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Content</label>
					<textarea
						id="content"
						bind:value={formContent}
						placeholder="Write your note..."
						class={cn(
							'w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
							isFullscreen ? 'flex-1' : 'min-h-[300px]'
						)}
					></textarea>
				</div>
			</div>

			<div class="flex flex-shrink-0 justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
				<button
					onclick={closeModals}
					class="rounded-lg border border-slate-200 px-4 py-2 text-slate-700 transition-all hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
				>
					Cancel
				</button>
				<button
					onclick={handleSave}
					disabled={!formContent.trim()}
					class={cn(
						'rounded-lg px-4 py-2 font-medium transition-all',
						formContent.trim() ? 'bg-accent-500 text-white hover:bg-accent-600' : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800'
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
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => e.target === e.currentTarget && closeModals()}
		onkeydown={(e) => e.key === 'Escape' && closeModals()}
		role="dialog"
		tabindex="-1"
	>
		<div
			class={cn(
				'flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 dark:border-slate-800 dark:bg-slate-900',
				isFullscreen ? 'h-full w-full max-w-none rounded-none' : 'max-h-[90vh] w-full max-w-2xl'
			)}
		>
			<div class="flex flex-shrink-0 items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit Note</h2>
				<div class="flex items-center gap-1">
					<button
						onclick={() => (isFullscreen = !isFullscreen)}
						class="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
						title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
					>
						{#if isFullscreen}
							<Minimize2 class="h-4 w-4" />
						{:else}
							<Maximize2 class="h-4 w-4" />
						{/if}
					</button>
					<button onclick={() => handleDelete(viewingNote)} class="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-500" title="Delete">
						<Trash2 class="h-4 w-4" />
					</button>
					<button onclick={closeModals} class="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
						<X class="h-5 w-5" />
					</button>
				</div>
			</div>

			<div class="flex flex-1 flex-col space-y-4 overflow-auto p-4">
				<div>
					<label for="edit-title" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
						Title <span class="font-normal text-slate-400">(optional)</span>
					</label>
					<input
						id="edit-title"
						type="text"
						bind:value={formTitle}
						placeholder="Enter a title..."
						class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
					/>
				</div>

				<div class="flex min-h-0 flex-1 flex-col">
					<label for="edit-content" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Content</label>
					<textarea
						id="edit-content"
						bind:value={formContent}
						placeholder="Write your note..."
						class={cn(
							'w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
							isFullscreen ? 'flex-1' : 'min-h-[300px]'
						)}
					></textarea>
				</div>

				<p class="flex-shrink-0 text-xs text-slate-400">
					Created: {formatDate(viewingNote.createdAt)} · Updated: {formatDate(viewingNote.updatedAt)}
				</p>
			</div>

			<div class="flex flex-shrink-0 justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
				<button
					onclick={closeModals}
					class="rounded-lg border border-slate-200 px-4 py-2 text-slate-700 transition-all hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
				>
					Cancel
				</button>
				<button
					onclick={handleSave}
					disabled={!formContent.trim()}
					class={cn(
						'rounded-lg px-4 py-2 font-medium transition-all',
						formContent.trim() ? 'bg-accent-500 text-white hover:bg-accent-600' : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800'
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
