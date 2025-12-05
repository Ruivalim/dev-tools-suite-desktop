<script lang="ts">
	import { Link, Copy, Check, Trash2, ArrowDownUp } from 'lucide-svelte';
	import Select from '$lib/components/ui/Select.svelte';

	let input = $state('');
	let output = $state('');
	let copied = $state(false);
	let mode = $state<'encode' | 'decode'>('encode');
	let encodeType = $state<'component' | 'full'>('component');

	function process() {
		if (!input.trim()) {
			output = '';
			return;
		}
		try {
			if (mode === 'encode') {
				output = encodeType === 'component' ? encodeURIComponent(input) : encodeURI(input);
			} else {
				output = encodeType === 'component' ? decodeURIComponent(input) : decodeURI(input);
			}
		} catch {
			output = 'Error: Invalid input for ' + mode;
		}
	}

	function swap() {
		const temp = input;
		input = output;
		output = temp;
		mode = mode === 'encode' ? 'decode' : 'encode';
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
	}

	// Auto-process on input change
	$effect(() => {
		process();
	});
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<Link class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">URL Encoder/Decoder</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Encode or decode URL strings</p>
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

		<div class="ml-4 flex items-center gap-2">
			<span class="text-sm text-slate-500">Type:</span>
			<Select
				value={encodeType}
				options={[
					{ value: 'component', label: 'Component (recommended)' },
					{ value: 'full', label: 'Full URI' }
				]}
				onchange={(v) => {
					encodeType = v as typeof encodeType;
					process();
				}}
				searchable={false}
				class="w-52"
			/>
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

	<!-- Editor -->
	<div class="grid min-h-0 flex-1 grid-cols-2 gap-4">
		<!-- Input -->
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">
					{mode === 'encode' ? 'Plain Text' : 'Encoded URL'}
				</span>
			</div>
			<textarea
				bind:value={input}
				placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter URL to decode...'}
				class="flex-1 resize-none bg-transparent p-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
				spellcheck="false"
			></textarea>
		</div>

		<!-- Output -->
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">
					{mode === 'encode' ? 'Encoded URL' : 'Decoded Text'}
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
	<div class="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
		<strong>Component:</strong> Encodes all special characters (use for query params, path segments)
		<br />
		<strong>Full URI:</strong> Preserves URI structure characters like :, /, ?, #, @
	</div>
</div>
