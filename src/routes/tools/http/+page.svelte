<script lang="ts">
	import { onMount } from 'svelte';
	import { Store } from '@tauri-apps/plugin-store';
	import { Globe, Send, Plus, X, Copy, Check, Clock, FileJson, ChevronDown, Save, FolderOpen, Folder, FolderPlus, ChevronRight, Trash2 } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';
	import Select from '$lib/components/ui/Select.svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';

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
	let headers = $state<Header[]>([{ id: crypto.randomUUID(), key: 'Content-Type', value: 'application/json', enabled: true }]);
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
		const pathMap = new SvelteMap<string, FolderNode>();
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
		headers = headers.filter((h) => h.id !== id);
	}

	function toggleHeader(id: string) {
		headers = headers.map((h) => (h.id === id ? { ...h, enabled: !h.enabled } : h));
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
				headers: headersObj
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
			console.error('Request error:', e);
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
			setTimeout(() => (copied = false), 2000);
		} catch {
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
			createdAt: currentRequestId ? savedRequests.find((r) => r.id === currentRequestId)?.createdAt || Date.now() : Date.now(),
			updatedAt: Date.now()
		};

		if (currentRequestId) {
			savedRequests = savedRequests.map((r) => (r.id === currentRequestId ? request : r));
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
		headers = request.headers.map((h) => ({ ...h, id: crypto.randomUUID() }));
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
		savedRequests = savedRequests.filter((r) => r.id !== id);
		if (currentRequestId === id) {
			currentRequestId = null;
		}
		await saveToStore();
	}

	async function addFolder() {
		if (!newFolderName.trim()) return;
		const fullPath = parentFolderForNew ? `${parentFolderForNew}/${newFolderName.trim()}` : newFolderName.trim();

		if (!folders.includes(fullPath)) {
			folders = [...folders, fullPath];
			await saveToStore();
		}

		newFolderName = '';
		parentFolderForNew = '';
		showAddFolderModal = false;
	}

	async function deleteFolder(folder: string) {
		savedRequests = savedRequests.map((r) => {
			if (r.folder === folder || r.folder?.startsWith(folder + '/')) {
				return { ...r, folder: undefined };
			}
			return r;
		});
		folders = folders.filter((f) => f !== folder && !f.startsWith(folder + '/'));
		await saveToStore();
	}

	function toggleFolder(folder: string) {
		if (expandedFolders.has(folder)) {
			expandedFolders.delete(folder);
		} else {
			expandedFolders.add(folder);
		}
		expandedFolders = new SvelteSet(expandedFolders);
	}

	function getRequestsByFolder(folder: string | undefined): SavedRequest[] {
		return savedRequests.filter((r) => (r.folder || '') === (folder || ''));
	}

	function getMethodColor(m: HttpMethod): string {
		switch (m) {
			case 'GET':
				return 'text-green-500';
			case 'POST':
				return 'text-blue-500';
			case 'PUT':
				return 'text-orange-500';
			case 'PATCH':
				return 'text-yellow-500';
			case 'DELETE':
				return 'text-red-500';
		}
	}
</script>

<div class="mx-auto flex h-full max-w-7xl flex-col">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<Globe class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">HTTP Client</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Send HTTP requests and inspect responses.</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<button
				onclick={() => (showLoadModal = true)}
				class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-slate-700 transition-all hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
			>
				<FolderOpen class="h-4 w-4" />
				Load
			</button>
			<button
				onclick={openSaveModal}
				disabled={!url.trim()}
				class={cn(
					'flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition-all',
					url.trim() ? 'bg-accent-500 text-white hover:bg-accent-600' : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800'
				)}
			>
				<Save class="h-4 w-4" />
				Save
			</button>
		</div>
	</div>

	<!-- URL Bar -->
	<div class="mb-4 flex gap-2">
		<div class="relative">
			<select
				bind:value={method}
				class={cn(
					'cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pr-8 pl-3 text-sm font-semibold transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900',
					method === 'GET' && 'text-green-500',
					method === 'POST' && 'text-blue-500',
					method === 'PUT' && 'text-orange-500',
					method === 'PATCH' && 'text-yellow-500',
					method === 'DELETE' && 'text-red-500'
				)}
			>
				{#each methods as m, i (i)}
					<option value={m}>{m}</option>
				{/each}
			</select>
			<ChevronDown class="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-slate-400" />
		</div>

		<input
			type="text"
			bind:value={url}
			placeholder="Enter URL (e.g., https://api.example.com/users)"
			class="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 font-mono text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
			onkeydown={(e) => e.key === 'Enter' && sendRequest()}
		/>

		<button
			onclick={sendRequest}
			disabled={isLoading}
			class={cn(
				'flex items-center gap-2 rounded-lg px-5 py-2 font-medium transition-all',
				isLoading ? 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800' : 'bg-accent-500 text-white hover:scale-[1.02] hover:bg-accent-600 active:scale-[0.98]'
			)}
		>
			<Send class={cn('h-4 w-4', isLoading && 'animate-pulse')} />
			{isLoading ? 'Sending...' : 'Send'}
		</button>
	</div>

	<!-- Request Config -->
	<div class="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
		<!-- Request Panel -->
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="flex border-b border-slate-200 dark:border-slate-800">
				<button
					onclick={() => (activeTab = 'headers')}
					class={cn(
						'px-4 py-2 text-sm font-medium transition-colors',
						activeTab === 'headers' ? 'border-b-2 border-accent-500 text-accent-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
					)}
				>
					Headers ({headers.filter((h) => h.enabled).length})
				</button>
				<button
					onclick={() => (activeTab = 'body')}
					class={cn(
						'px-4 py-2 text-sm font-medium transition-colors',
						activeTab === 'body' ? 'border-b-2 border-accent-500 text-accent-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
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
								<input type="checkbox" checked={header.enabled} onchange={() => toggleHeader(header.id)} class="rounded border-slate-300 text-accent-500 focus:ring-accent-500 dark:border-slate-700" />
								<input
									type="text"
									bind:value={header.key}
									placeholder="Header name"
									class="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
								/>
								<input
									type="text"
									bind:value={header.value}
									placeholder="Value"
									class="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
								/>
								<button onclick={() => removeHeader(header.id)} class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500">
									<X class="h-4 w-4" />
								</button>
							</div>
						{/each}
						<button onclick={addHeader} class="flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-accent-500">
							<Plus class="h-4 w-4" />
							Add Header
						</button>
					</div>
				{:else}
					<div class="flex h-full flex-col">
						<div class="mb-2 flex justify-end">
							<button onclick={formatBody} class="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-accent-500">
								<FileJson class="h-3.5 w-3.5" />
								Format JSON
							</button>
						</div>
						<textarea
							bind:value={body}
							placeholder={'{"key": "value"}'}
							class="w-full flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
						></textarea>
					</div>
				{/if}
			</div>
		</div>

		<!-- Response Panel -->
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800">
				<div class="flex items-center gap-4">
					<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Response</span>
					{#if responseStatus !== null}
						<span class={cn('text-sm font-bold', getStatusColor(responseStatus))}>
							{responseStatus}
						</span>
					{/if}
					{#if responseTime !== null}
						<span class="flex items-center gap-1 text-xs text-slate-500">
							<Clock class="h-3 w-3" />
							{responseTime}ms
						</span>
					{/if}
				</div>
				{#if response}
					<button onclick={copyResponse} class="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-accent-500">
						{#if copied}
							<Check class="h-3.5 w-3.5 text-green-500" />
							<span class="text-green-500">Copied!</span>
						{:else}
							<Copy class="h-3.5 w-3.5" />
							Copy
						{/if}
					</button>
				{/if}
			</div>

			{#if response || Object.keys(responseHeaders).length > 0}
				<div class="flex border-b border-slate-200 dark:border-slate-800">
					<button
						onclick={() => (responseTab = 'body')}
						class={cn(
							'px-4 py-2 text-sm font-medium transition-colors',
							responseTab === 'body' ? 'border-b-2 border-accent-500 text-accent-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
						)}
					>
						Body
					</button>
					<button
						onclick={() => (responseTab = 'headers')}
						class={cn(
							'px-4 py-2 text-sm font-medium transition-colors',
							responseTab === 'headers' ? 'border-b-2 border-accent-500 text-accent-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
						)}
					>
						Headers ({Object.keys(responseHeaders).length})
					</button>
				</div>
			{/if}

			<div class="flex-1 overflow-auto p-4">
				{#if isLoading}
					<div class="flex h-full items-center justify-center text-slate-400">
						<div class="flex items-center gap-2">
							<div class="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent"></div>
							Sending request...
						</div>
					</div>
				{:else if error}
					<div class="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
						{error}
					</div>
				{:else if response || Object.keys(responseHeaders).length > 0}
					{#if responseTab === 'body'}
						<pre class="font-mono text-sm break-words whitespace-pre-wrap text-slate-700 dark:text-slate-300">{response || 'No body'}</pre>
					{:else}
						<div class="space-y-1">
							{#each Object.entries(responseHeaders) as [key, value], i (i)}
								<div class="flex gap-2 text-sm">
									<span class="font-medium text-slate-700 dark:text-slate-300">{key}:</span>
									<span class="break-all text-slate-500 dark:text-slate-400">{value}</span>
								</div>
							{/each}
						</div>
					{/if}
				{:else}
					<div class="flex h-full flex-col items-center justify-center text-slate-400">
						<Send class="mb-2 h-8 w-8 opacity-50" />
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
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => e.target === e.currentTarget && (showSaveModal = false)}
		onkeydown={(e) => e.key === 'Escape' && (showSaveModal = false)}
		role="dialog"
		tabindex="-1"
	>
		<div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Save Request</h2>
				<button onclick={() => (showSaveModal = false)} class="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="space-y-4 p-4">
				<div>
					<label for="save-name" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
					<input
						id="save-name"
						type="text"
						bind:value={saveName}
						placeholder="e.g., Get Users"
						class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
					/>
				</div>

				<div>
					<label for="save-folder" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Folder (optional)</label>
					<Select
						value={saveFolder}
						options={[{ value: '', label: 'No folder' }, ...folders.map((f) => ({ value: f, label: f }))]}
						onchange={(v) => (saveFolder = v)}
						searchable={folders.length > 5}
						class="w-full"
					/>
				</div>

				<div class="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
					<span class={cn('font-semibold', getMethodColor(method))}>{method}</span>
					<span class="ml-2 truncate text-slate-600 dark:text-slate-400">{url}</span>
				</div>
			</div>

			<div class="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
				<button
					onclick={() => (showSaveModal = false)}
					class="rounded-lg border border-slate-200 px-4 py-2 text-slate-700 transition-all hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
				>
					Cancel
				</button>
				<button
					onclick={handleSaveRequest}
					disabled={!saveName.trim()}
					class={cn(
						'rounded-lg px-4 py-2 font-medium transition-all',
						saveName.trim() ? 'bg-accent-500 text-white hover:bg-accent-600' : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800'
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
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => e.target === e.currentTarget && (showLoadModal = false)}
		onkeydown={(e) => e.key === 'Escape' && (showLoadModal = false)}
		role="dialog"
		tabindex="-1"
	>
		<div class="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Saved Requests</h2>
				<div class="flex items-center gap-2">
					<button
						onclick={() => {
							showAddFolderModal = true;
							parentFolderForNew = '';
						}}
						class="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-accent-500 dark:hover:bg-slate-800"
						title="New Folder"
					>
						<FolderPlus class="h-4 w-4" />
					</button>
					<button onclick={() => (showLoadModal = false)} class="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
						<X class="h-5 w-5" />
					</button>
				</div>
			</div>

			<div class="flex-1 overflow-auto p-4">
				{#if savedRequests.length === 0 && folders.length === 0}
					<div class="flex flex-col items-center justify-center py-8 text-slate-400">
						<FolderOpen class="mb-2 h-10 w-10 opacity-50" />
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
							class="group flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
						>
							<span class={cn('w-14 text-xs font-bold', getMethodColor(request.method))}>{request.method}</span>
							<div class="min-w-0 flex-1 text-left">
								<div class="truncate font-medium text-slate-900 dark:text-slate-100">{request.name}</div>
								<div class="truncate text-xs text-slate-500">{request.url}</div>
							</div>
							<button
								onclick={(e) => {
									e.stopPropagation();
									deleteRequest(request.id);
								}}
								class="rounded p-1 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500"
							>
								<Trash2 class="h-4 w-4" />
							</button>
						</div>
					{/each}

					<!-- Folders -->
					{#snippet renderFolder(node: FolderNode, depth: number)}
						<div style="margin-left: {depth * 16}px">
							<div class="flex items-center gap-1">
								<button
									onclick={() => toggleFolder(node.path)}
									class="flex flex-1 items-center gap-2 rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
								>
									{#if expandedFolders.has(node.path)}
										<ChevronDown class="h-4 w-4 text-slate-400" />
										<Folder class="h-4 w-4 text-accent-500" />
									{:else}
										<ChevronRight class="h-4 w-4 text-slate-400" />
										<Folder class="h-4 w-4 text-slate-400" />
									{/if}
									<span class="font-medium">{node.name}</span>
								</button>
								<button
									onclick={() => {
										showAddFolderModal = true;
										parentFolderForNew = node.path;
									}}
									class="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-accent-500 dark:hover:bg-slate-800"
									title="Add subfolder"
								>
									<FolderPlus class="h-3.5 w-3.5" />
								</button>
								<button onclick={() => deleteFolder(node.path)} class="rounded p-1 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500" title="Delete folder">
									<Trash2 class="h-3.5 w-3.5" />
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
										class="group flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 pl-8 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
									>
										<span class={cn('w-14 text-xs font-bold', getMethodColor(request.method))}>{request.method}</span>
										<div class="min-w-0 flex-1 text-left">
											<div class="truncate font-medium text-slate-900 dark:text-slate-100">{request.name}</div>
											<div class="truncate text-xs text-slate-500">{request.url}</div>
										</div>
										<button
											onclick={(e) => {
												e.stopPropagation();
												deleteRequest(request.id);
											}}
											class="rounded p-1 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500"
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								{/each}

								<!-- Child folders -->
								{#each node.children as child, i (i)}
									{@render renderFolder(child, depth + 1)}
								{/each}
							{/if}
						</div>
					{/snippet}

					{#each folderTree as node, i (i)}
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
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => e.target === e.currentTarget && (showAddFolderModal = false)}
		onkeydown={(e) => e.key === 'Escape' && (showAddFolderModal = false)}
		role="dialog"
		tabindex="-1"
	>
		<div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
					{parentFolderForNew ? `New Subfolder in ${parentFolderForNew}` : 'New Folder'}
				</h2>
				<button onclick={() => (showAddFolderModal = false)} class="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="p-4">
				<input
					type="text"
					bind:value={newFolderName}
					placeholder="Folder name"
					class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
					onkeydown={(e) => e.key === 'Enter' && addFolder()}
				/>
			</div>

			<div class="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
				<button
					onclick={() => (showAddFolderModal = false)}
					class="rounded-lg border border-slate-200 px-4 py-2 text-slate-700 transition-all hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
				>
					Cancel
				</button>
				<button
					onclick={addFolder}
					disabled={!newFolderName.trim()}
					class={cn(
						'rounded-lg px-4 py-2 font-medium transition-all',
						newFolderName.trim() ? 'bg-accent-500 text-white hover:bg-accent-600' : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800'
					)}
				>
					Create
				</button>
			</div>
		</div>
	</div>
{/if}
