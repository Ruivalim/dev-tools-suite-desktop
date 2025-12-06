<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Plus, Check, Copy, X, Trash2, Lock } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';
	import { Store } from '@tauri-apps/plugin-store';
	import { invoke } from '@tauri-apps/api/core';
	import { icloudStore } from '$lib/stores/icloud.svelte';

	interface Note {
		id: string;
		title: string;
		content: string;
		createdAt: number;
		updatedAt: number;
		deleted?: boolean;
	}

	let notes = $state<Note[]>([]);
	let store: Store | null = null;
	let copiedId = $state<string | null>(null);
	let showAddForm = $state(false);
	let newNoteContent = $state('');

	const activeNotes = $derived(notes.filter((n) => !n.deleted).slice(0, 10));

	async function syncNotes() {
		if (!icloudStore.enabled || !store) return;
		notes = await icloudStore.syncFile('notes.json', notes, 'notes');
		await saveNotesLocal();
	}

	async function handleVisibilityChange() {
		if (document.visibilityState === 'visible') {
			await syncNotes();
		}
	}

	let unsubscribeForceSync: (() => void) | null = null;

	onMount(async () => {
		// Initialize iCloud first to check encryption state
		await icloudStore.init();

		// Don't load data if encryption is enabled but no password
		if (icloudStore.needsPassword) {
			return;
		}

		store = await Store.load('notes.json');
		const saved = await store.get<Note[]>('notes');
		if (saved) {
			notes = saved;
		}

		// Sync with iCloud if enabled
		if (icloudStore.enabled) {
			notes = await icloudStore.syncFile('notes.json', notes, 'notes');
			await saveNotesLocal();
		}

		// Listen for force sync events from iCloud
		unsubscribeForceSync = icloudStore.onForceSync(async () => {
			if (icloudStore.enabled) {
				notes = await icloudStore.syncFile('notes.json', notes, 'notes');
				await saveNotesLocal();
			}
		});

		// Sync when popover becomes visible
		document.addEventListener('visibilitychange', handleVisibilityChange);
	});

	onDestroy(() => {
		document.removeEventListener('visibilitychange', handleVisibilityChange);
		if (unsubscribeForceSync) {
			unsubscribeForceSync();
		}
	});

	async function saveNotesLocal() {
		if (store) {
			await store.set('notes', notes);
			await store.save();
			invoke('refresh_tray_menu').catch(() => {});
		}
	}

	async function saveNotes() {
		await saveNotesLocal();

		// Sync to iCloud if enabled
		if (icloudStore.enabled) {
			await icloudStore.writeToICloud('notes.json', notes, 'notes');
		}
	}

	function getNoteTitle(note: Note): string {
		if (note.title.trim()) return note.title;
		const firstLine = note.content.split('\n')[0].trim();
		return firstLine.slice(0, 50) || 'Untitled';
	}

	async function copyNote(note: Note) {
		await navigator.clipboard.writeText(note.content);
		copiedId = note.id;
		setTimeout(() => (copiedId = null), 1500);
	}

	async function addNote() {
		if (!newNoteContent.trim()) return;

		const newNote: Note = {
			id: crypto.randomUUID(),
			title: '',
			content: newNoteContent.trim(),
			createdAt: Date.now(),
			updatedAt: Date.now()
		};
		notes = [newNote, ...notes];
		await saveNotes();
		newNoteContent = '';
		showAddForm = false;
	}

	async function deleteNote(e: MouseEvent, note: Note) {
		e.stopPropagation();
		const index = notes.findIndex((n) => n.id === note.id);
		if (index !== -1) {
			notes[index] = { ...notes[index], deleted: true, updatedAt: Date.now() };
			notes = [...notes];
			await saveNotes();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			addNote();
		} else if (e.key === 'Escape') {
			showAddForm = false;
			newNoteContent = '';
		}
	}
</script>

{#if icloudStore.needsPassword}
	<!-- Locked State -->
	<div class="flex h-screen flex-col items-center justify-center p-4">
		<div class="mb-3 rounded-full bg-amber-100 p-3 dark:bg-amber-900/30">
			<Lock class="h-6 w-6 text-amber-600 dark:text-amber-400" />
		</div>
		<h2 class="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Notes Locked</h2>
		<p class="text-center text-xs text-slate-500 dark:text-slate-400">Enter your password in Settings to unlock.</p>
	</div>
{:else}
	<div class="flex h-screen flex-col overflow-hidden">
		<!-- Header -->
		<div class="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
			<h1 class="text-sm font-semibold text-slate-700 dark:text-slate-200">Quick Notes</h1>
			<button
				onclick={() => (showAddForm = !showAddForm)}
				class={cn(
					'cursor-pointer rounded-md p-1 transition-colors hover:text-slate-700 dark:hover:text-slate-200',
					showAddForm ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700'
				)}
			>
				{#if showAddForm}
					<X class="h-4 w-4" />
				{:else}
					<Plus class="h-4 w-4" />
				{/if}
			</button>
		</div>

		<!-- Add Form -->
		{#if showAddForm}
			<div class="flex-shrink-0 border-b border-slate-200 p-3 dark:border-slate-800">
				<textarea
					bind:value={newNoteContent}
					onkeydown={handleKeydown}
					placeholder="Type your note..."
					class="w-full resize-none rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 placeholder-slate-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
					rows="3"
					autofocus
				></textarea>
				<div class="mt-2 flex items-center justify-between">
					<span class="text-xs text-slate-400">Cmd+Enter to save</span>
					<button
						onclick={addNote}
						disabled={!newNoteContent.trim()}
						class="rounded-md bg-accent-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Add
					</button>
				</div>
			</div>
		{/if}

		<!-- Notes List -->
		<div class="flex-1 overflow-y-auto">
			{#if activeNotes.length === 0}
				<div class="flex flex-col items-center justify-center py-8 text-slate-400">
					<p class="text-sm">No notes yet</p>
					<button onclick={() => (showAddForm = true)} class="mt-2 text-xs text-accent-500 hover:underline"> Add your first note </button>
				</div>
			{:else}
				{#each activeNotes as note (note.id)}
					<div
						onclick={() => copyNote(note)}
						onkeydown={(e) => e.key === 'Enter' && copyNote(note)}
						role="button"
						tabindex="0"
						class="group flex w-full cursor-pointer items-start gap-2 border-b border-slate-100 px-3 py-2 text-left transition-colors hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
					>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
								{getNoteTitle(note)}
							</p>
							{#if note.title && note.content !== note.title}
								<p class="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
									{note.content}
								</p>
							{/if}
						</div>
						<div class="flex flex-shrink-0 items-center gap-1">
							{#if copiedId === note.id}
								<Check class="h-4 w-4 text-green-500" />
							{:else}
								<Copy class="h-4 w-4 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
							{/if}
							<button
								onclick={(e) => deleteNote(e, note)}
								class="rounded p-0.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30"
							>
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Footer -->
		<div class="flex-shrink-0 border-t border-slate-200 px-3 py-1.5 dark:border-slate-800">
			<p class="text-center text-xs text-slate-400">Click note to copy</p>
		</div>
	</div>
{/if}
