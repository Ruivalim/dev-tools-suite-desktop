<script lang="ts">
	import { FileCode, Copy, Check, Trash2, ArrowDownUp, Upload, AlertCircle } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';

	let input = $state('');
	let output = $state('');
	let error = $state('');
	let copied = $state(false);
	let mode = $state<'encode' | 'decode'>('encode');
	let isDragging = $state(false);

	function process() {
		error = '';
		if (!input.trim()) {
			output = '';
			return;
		}
		try {
			if (mode === 'encode') {
				output = btoa(unescape(encodeURIComponent(input)));
			} else {
				output = decodeURIComponent(escape(atob(input)));
			}
		} catch (e) {
			error = mode === 'encode' ? 'Failed to encode. Make sure the input is valid text.' : 'Failed to decode. Make sure the input is valid Base64.';
			output = '';
			console.error('Failed to encode/decode:', e);
		}
	}

	function swap() {
		const temp = input;
		input = output;
		output = temp;
		mode = mode === 'encode' ? 'decode' : 'encode';
		error = '';
	}

	async function copyOutput() {
		if (!output) return;
		await navigator.clipboard.writeText(output);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function clear() {
		input = '';
		output = '';
		error = '';
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;

		const file = e.dataTransfer?.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const result = event.target?.result;
			if (typeof result === 'string') {
				const base64 = result.split(',')[1] || result;
				input = base64;
				mode = 'decode';
				process();
			}
		};
		reader.readAsDataURL(file);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	// Auto-process on input change
	$effect(() => {
		if (input !== undefined) {
			process();
		}
	});
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<FileCode class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Base64 Encoder/Decoder</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Encode or decode Base64 strings</p>
			</div>
		</div>
	</div>

	<!-- Controls -->
	<div class="mb-4 flex flex-wrap items-center gap-2">
		<div class="flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
			<button
				onclick={() => {
					mode = 'encode';
					process();
				}}
				class={mode === 'encode'
					? 'bg-accent-500 px-4 py-1.5 text-sm font-medium text-white'
					: 'bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}
			>
				Encode
			</button>
			<button
				onclick={() => {
					mode = 'decode';
					process();
				}}
				class={mode === 'decode'
					? 'bg-accent-500 px-4 py-1.5 text-sm font-medium text-white'
					: 'bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}
			>
				Decode
			</button>
		</div>

		<button onclick={swap} disabled={!output} class="ml-4 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">
			<ArrowDownUp class="h-4 w-4" />
			Swap
		</button>

		<button onclick={clear} class="ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
			<Trash2 class="h-4 w-4" />
			Clear
		</button>
	</div>

	<!-- Error -->
	{#if error}
		<div class="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
			<AlertCircle class="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
			<span class="text-sm text-red-700 dark:text-red-300">{error}</span>
		</div>
	{/if}

	<!-- Editor -->
	<div class="grid min-h-0 flex-1 grid-cols-2 gap-4">
		<!-- Input -->
		<div
			class={cn(
				'flex flex-col overflow-hidden rounded-xl border transition-colors',
				isDragging ? 'border-accent-500 bg-accent-500/5' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
			)}
			ondrop={handleDrop}
			role="region"
			aria-label={mode === 'encode' ? 'Drop file to encode' : 'Drop file to decode'}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
		>
			<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">
					{mode === 'encode' ? 'Plain Text' : 'Base64'}
				</span>
				<span class="flex items-center gap-1 text-xs text-slate-400">
					<Upload class="h-3 w-3" />
					Drop file
				</span>
			</div>
			<div class="relative flex-1">
				<textarea
					bind:value={input}
					placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter Base64 to decode...'}
					class="h-full w-full resize-none bg-transparent p-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
					spellcheck="false"
				></textarea>
				{#if isDragging}
					<div class="pointer-events-none absolute inset-0 flex items-center justify-center bg-accent-500/10">
						<div class="flex items-center gap-2 font-medium text-accent-500">
							<Upload class="h-5 w-5" />
							Drop file to encode
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Output -->
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">
					{mode === 'encode' ? 'Base64' : 'Plain Text'}
				</span>
				<button onclick={copyOutput} disabled={!output} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">
					{#if copied}
						<Check class="h-4 w-4 text-green-500" />
					{:else}
						<Copy class="h-4 w-4" />
					{/if}
				</button>
			</div>
			<pre class="flex-1 overflow-auto p-3 font-mono text-sm break-all whitespace-pre-wrap text-slate-900 dark:text-slate-100">{output}</pre>
		</div>
	</div>

	<!-- Info -->
	<div class="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">Base64 encoding converts binary data to ASCII text. Supports UTF-8 characters.</div>
</div>
