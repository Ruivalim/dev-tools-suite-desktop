<script lang="ts">
	import { onMount } from 'svelte';
	import { Bookmark, Plus, Search, Trash2, ExternalLink, Tag, Edit2, X, Check, Lock } from 'lucide-svelte';
	import { bookmarksStore, type Bookmark as BookmarkType } from '$lib/stores/bookmarks.svelte';
	import { icloudStore } from '$lib/stores/icloud.svelte';

	let searchQuery = $state('');
	let selectedTag = $state('');
	let showAddForm = $state(false);
	let editingId = $state<string | null>(null);

	// Form state
	let formTitle = $state('');
	let formUrl = $state('');
	let formDescription = $state('');
	let formTags = $state('');

	onMount(async () => {
		await icloudStore.init();
		if (!icloudStore.needsPassword) {
			await bookmarksStore.init();
		}
	});

	let filteredBookmarks = $derived.by(() => {
		let result = bookmarksStore.bookmarks;

		if (searchQuery) {
			result = bookmarksStore.search(searchQuery);
		}

		if (selectedTag) {
			result = result.filter((b) => b.tags.includes(selectedTag));
		}

		return result;
	});

	let allTags = $derived(bookmarksStore.getAllTags());

	function resetForm() {
		formTitle = '';
		formUrl = '';
		formDescription = '';
		formTags = '';
		showAddForm = false;
		editingId = null;
	}

	async function handleSubmit() {
		if (!formUrl.trim()) return;

		const tags = formTags
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
		let url = formUrl.trim();
		if (!url.startsWith('http://') && !url.startsWith('https://')) {
			url = 'https://' + url;
		}

		const title = formTitle.trim() || new URL(url).hostname;

		if (editingId) {
			await bookmarksStore.update(editingId, {
				title,
				url,
				description: formDescription.trim() || undefined,
				tags
			});
		} else {
			await bookmarksStore.add({
				title,
				url,
				description: formDescription.trim() || undefined,
				tags
			});
		}

		resetForm();
	}

	function startEdit(bookmark: BookmarkType) {
		editingId = bookmark.id;
		formTitle = bookmark.title;
		formUrl = bookmark.url;
		formDescription = bookmark.description || '';
		formTags = bookmark.tags.join(', ');
		showAddForm = true;
	}

	async function deleteBookmark(id: string) {
		await bookmarksStore.remove(id);
	}

	function openUrl(url: string) {
		window.open(url, '_blank');
	}

	function getFaviconUrl(url: string): string {
		try {
			const domain = new URL(url).hostname;
			return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
		} catch {
			return '';
		}
	}
</script>

{#if icloudStore.needsPassword}
	<!-- Locked State -->
	<div class="flex h-full flex-col items-center justify-center">
		<div class="flex flex-col items-center text-center">
			<div class="mb-4 rounded-full bg-amber-100 p-4 dark:bg-amber-900/30">
				<Lock class="h-8 w-8 text-amber-600 dark:text-amber-400" />
			</div>
			<h2 class="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Bookmarks Locked</h2>
			<p class="mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">Your bookmarks are encrypted. Enter your password in Settings to unlock and sync.</p>
			<a href="/tools/settings" class="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-600"> Go to Settings </a>
		</div>
	</div>
{:else}
	<div class="flex h-full flex-col">
		<!-- Header -->
		<div class="mb-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-accent-500/10 p-2">
					<Bookmark class="h-6 w-6 text-accent-500" />
				</div>
				<div>
					<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Bookmarks</h1>
					<p class="text-sm text-slate-600 dark:text-slate-400">Save and organize your dev bookmarks</p>
				</div>
			</div>

			<button
				onclick={() => {
					resetForm();
					showAddForm = true;
				}}
				class="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 font-medium text-white hover:bg-accent-600"
			>
				<Plus class="h-4 w-4" />
				Add Bookmark
			</button>
		</div>

		<!-- Search and Filters -->
		<div class="mb-4 flex items-center gap-4">
			<div class="relative max-w-md flex-1">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search bookmarks..."
					class="w-full rounded-lg border border-slate-200 bg-white py-2 pr-4 pl-10 text-slate-900 focus:ring-2 focus:ring-accent-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
				/>
			</div>

			{#if allTags.length > 0}
				<div class="flex flex-wrap items-center gap-2">
					<button
						onclick={() => (selectedTag = '')}
						class="rounded-full px-3 py-1 text-sm font-medium transition-colors {selectedTag === ''
							? 'bg-accent-500 text-white'
							: 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}"
					>
						All
					</button>
					{#each allTags as tag (tag)}
						<button
							onclick={() => (selectedTag = tag)}
							class="rounded-full px-3 py-1 text-sm font-medium transition-colors {selectedTag === tag
								? 'bg-accent-500 text-white'
								: 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}"
						>
							{tag}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Add/Edit Form -->
		{#if showAddForm}
			<div class="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="font-semibold text-slate-900 dark:text-slate-100">
						{editingId ? 'Edit Bookmark' : 'Add Bookmark'}
					</h3>
					<button onclick={resetForm} class="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
						<X class="h-4 w-4 text-slate-500" />
					</button>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<input
						type="text"
						bind:value={formUrl}
						placeholder="URL *"
						class="col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-accent-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
					/>
					<input
						type="text"
						bind:value={formTitle}
						placeholder="Title (optional)"
						class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-accent-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
					/>
					<input
						type="text"
						bind:value={formTags}
						placeholder="Tags (comma separated)"
						class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-accent-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
					/>
					<input
						type="text"
						bind:value={formDescription}
						placeholder="Description (optional)"
						class="col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-accent-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
					/>
				</div>

				<div class="mt-4 flex justify-end gap-2">
					<button onclick={resetForm} class="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"> Cancel </button>
					<button onclick={handleSubmit} disabled={!formUrl.trim()} class="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-medium text-white hover:bg-orange-600 disabled:opacity-50">
						<Check class="h-4 w-4" />
						{editingId ? 'Update' : 'Add'}
					</button>
				</div>
			</div>
		{/if}

		<!-- Bookmarks List -->
		<div class="flex-1 overflow-auto">
			{#if filteredBookmarks.length === 0}
				<div class="flex h-full flex-col items-center justify-center text-slate-500 dark:text-slate-400">
					<Bookmark class="mb-4 h-12 w-12 opacity-50" />
					<p>No bookmarks yet</p>
					<p class="text-sm">Click "Add Bookmark" to get started</p>
				</div>
			{:else}
				<div class="grid gap-3">
					{#each filteredBookmarks as bookmark (bookmark.id)}
						<div class="group rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-accent-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-accent-700">
							<div class="flex items-start gap-3">
								<img src={getFaviconUrl(bookmark.url)} alt="" class="mt-0.5 h-6 w-6 rounded" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} role="presentation" />

								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<h3 class="truncate font-medium text-slate-900 dark:text-slate-100">
											{bookmark.title}
										</h3>
										<button onclick={() => openUrl(bookmark.url)} class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-accent-500 dark:hover:bg-slate-800">
											<ExternalLink class="h-4 w-4" />
										</button>
									</div>

									<p class="truncate text-sm text-slate-500 dark:text-slate-400">{bookmark.url}</p>

									{#if bookmark.description}
										<p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{bookmark.description}</p>
									{/if}

									{#if bookmark.tags.length > 0}
										<div class="mt-2 flex items-center gap-1">
											<Tag class="h-3 w-3 text-slate-400" />
											{#each bookmark.tags as tag (tag)}
												<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
													{tag}
												</span>
											{/each}
										</div>
									{/if}
								</div>

								<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
									<button onclick={() => startEdit(bookmark)} class="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
										<Edit2 class="h-4 w-4" />
									</button>
									<button onclick={() => deleteBookmark(bookmark.id)} class="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
