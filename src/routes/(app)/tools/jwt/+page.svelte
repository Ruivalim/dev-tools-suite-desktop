<script lang="ts">
	import { Key, Copy, Check, Trash2, AlertCircle, Clock, User } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';

	let input = $state('');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let header = $state<Record<string, any> | null>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
		} catch {
			error = 'Failed to decode header';
			return;
		}

		try {
			// Decode payload
			const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
			payload = JSON.parse(payloadJson);
		} catch {
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async function copySection(section: string, content: any) {
		await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
		copiedSection = section;
		setTimeout(() => (copiedSection = null), 2000);
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

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<Key class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">JWT Decoder</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Decode and inspect JWT tokens (without validation)</p>
			</div>
		</div>
		<button onclick={clear} class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
			<Trash2 class="h-4 w-4" />
			Clear
		</button>
	</div>

	<!-- Input -->
	<div class="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
		<div class="border-b border-slate-200 p-3 dark:border-slate-800">
			<span class="text-sm font-medium text-slate-700 dark:text-slate-300">JWT Token</span>
		</div>
		<textarea
			bind:value={input}
			placeholder="Paste your JWT token here..."
			class="h-24 w-full resize-none bg-transparent p-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
			spellcheck="false"
		></textarea>
	</div>

	<!-- Error -->
	{#if error}
		<div class="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
			<AlertCircle class="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
			<span class="text-sm text-red-700 dark:text-red-300">{error}</span>
		</div>
	{/if}

	<!-- Decoded sections -->
	{#if header || payload}
		<div class="grid min-h-0 flex-1 grid-cols-2 gap-4 overflow-auto">
			<!-- Header -->
			<div class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between border-b border-slate-200 bg-red-50 p-3 dark:border-slate-800 dark:bg-red-900/20">
					<span class="text-sm font-medium text-red-700 dark:text-red-300">Header</span>
					<button onclick={() => copySection('header', header)} class="rounded-md p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30">
						{#if copiedSection === 'header'}
							<Check class="h-4 w-4" />
						{:else}
							<Copy class="h-4 w-4" />
						{/if}
					</button>
				</div>
				<pre class="overflow-auto p-3 font-mono text-sm text-slate-900 dark:text-slate-100">{JSON.stringify(header, null, 2)}</pre>
			</div>

			<!-- Payload -->
			<div class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between border-b border-slate-200 bg-purple-50 p-3 dark:border-slate-800 dark:bg-purple-900/20">
					<span class="text-sm font-medium text-purple-700 dark:text-purple-300">Payload</span>
					<button onclick={() => copySection('payload', payload)} class="rounded-md p-1.5 text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/30">
						{#if copiedSection === 'payload'}
							<Check class="h-4 w-4" />
						{:else}
							<Copy class="h-4 w-4" />
						{/if}
					</button>
				</div>
				<pre class="overflow-auto p-3 font-mono text-sm text-slate-900 dark:text-slate-100">{JSON.stringify(payload, null, 2)}</pre>
			</div>
		</div>

		<!-- Claims info -->
		{#if payload}
			<div class="mt-4 grid grid-cols-3 gap-4">
				{#if payload.exp}
					<div
						class={cn(
							'rounded-lg border p-3',
							isExpired(payload.exp) ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
						)}
					>
						<div class="mb-1 flex items-center gap-2">
							<Clock class={cn('h-4 w-4', isExpired(payload.exp) ? 'text-red-500' : 'text-green-500')} />
							<span class={cn('text-xs font-medium', isExpired(payload.exp) ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300')}> Expiration (exp) </span>
						</div>
						<p class="text-sm text-slate-700 dark:text-slate-300">{formatDate(payload.exp)}</p>
						<p class={cn('mt-1 text-xs', isExpired(payload.exp) ? 'text-red-500' : 'text-green-500')}>
							{getTimeUntilExpiry(payload.exp)}
						</p>
					</div>
				{/if}

				{#if payload.iat}
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
						<div class="mb-1 flex items-center gap-2">
							<Clock class="h-4 w-4 text-slate-500" />
							<span class="text-xs font-medium text-slate-600 dark:text-slate-400">Issued At (iat)</span>
						</div>
						<p class="text-sm text-slate-700 dark:text-slate-300">{formatDate(payload.iat)}</p>
					</div>
				{/if}

				{#if payload.sub}
					<div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
						<div class="mb-1 flex items-center gap-2">
							<User class="h-4 w-4 text-slate-500" />
							<span class="text-xs font-medium text-slate-600 dark:text-slate-400">Subject (sub)</span>
						</div>
						<p class="truncate text-sm text-slate-700 dark:text-slate-300">{payload.sub}</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Signature -->
		<div class="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
			<div class="mb-1 flex items-center justify-between">
				<span class="text-xs font-medium text-blue-700 dark:text-blue-300">Signature (not verified)</span>
				<button onclick={() => copySection('signature', signature)} class="rounded p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30">
					{#if copiedSection === 'signature'}
						<Check class="h-3 w-3" />
					{:else}
						<Copy class="h-3 w-3" />
					{/if}
				</button>
			</div>
			<p class="font-mono text-xs break-all text-blue-600 dark:text-blue-400">{signature}</p>
		</div>
	{:else if !error && !input}
		<div class="flex flex-1 items-center justify-center text-slate-400">Paste a JWT token to decode it</div>
	{/if}
</div>
