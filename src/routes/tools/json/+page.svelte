<script lang="ts">
	import { Braces, Copy, Check, Trash2, Minimize2, Maximize2, AlertCircle } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';
	import Select from '$lib/components/ui/Select.svelte';

	let input = $state('');
	let output = $state('');
	let error = $state('');
	let copied = $state(false);
	let indentSize = $state(2);

	function formatJSON() {
		error = '';
		if (!input.trim()) {
			output = '';
			return;
		}
		try {
			const parsed = JSON.parse(input);
			output = JSON.stringify(parsed, null, indentSize);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invalid JSON';
			output = '';
		}
	}

	function minifyJSON() {
		error = '';
		if (!input.trim()) {
			output = '';
			return;
		}
		try {
			const parsed = JSON.parse(input);
			output = JSON.stringify(parsed);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invalid JSON';
			output = '';
		}
	}

	function validateJSON() {
		error = '';
		if (!input.trim()) {
			error = 'Enter JSON to validate';
			return;
		}
		try {
			JSON.parse(input);
			error = '';
			output = '✓ Valid JSON';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invalid JSON';
			output = '';
		}
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

	// Auto-format on input change
	$effect(() => {
		if (input) {
			formatJSON();
		}
	});
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<Braces class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">JSON Formatter</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Format, minify, and validate JSON</p>
			</div>
		</div>
	</div>

	<!-- Controls -->
	<div class="mb-4 flex flex-wrap items-center gap-2">
		<button onclick={formatJSON} class="flex items-center gap-1.5 rounded-md bg-accent-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-600">
			<Maximize2 class="h-4 w-4" />
			Format
		</button>
		<button
			onclick={minifyJSON}
			class="flex items-center gap-1.5 rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
		>
			<Minimize2 class="h-4 w-4" />
			Minify
		</button>
		<button
			onclick={validateJSON}
			class="flex items-center gap-1.5 rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
		>
			<Check class="h-4 w-4" />
			Validate
		</button>
		<div class="ml-4 flex items-center gap-2">
			<span class="text-sm text-slate-500">Indent:</span>
			<Select
				value={String(indentSize)}
				options={[
					{ value: '2', label: '2 spaces' },
					{ value: '4', label: '4 spaces' },
					{ value: '1', label: '1 tab' }
				]}
				onchange={(v) => {
					indentSize = Number(v);
					formatJSON();
				}}
				searchable={false}
				class="w-28"
			/>
		</div>
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
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Input</span>
			</div>
			<textarea
				bind:value={input}
				placeholder="Paste your JSON here..."
				class="flex-1 resize-none bg-transparent p-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
				spellcheck="false"
			></textarea>
		</div>

		<!-- Output -->
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Output</span>
				<button onclick={copyOutput} disabled={!output} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">
					{#if copied}
						<Check class="h-4 w-4 text-green-500" />
					{:else}
						<Copy class="h-4 w-4" />
					{/if}
				</button>
			</div>
			<pre class={cn('flex-1 overflow-auto p-3 font-mono text-sm', output === '✓ Valid JSON' ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-slate-100')}>{output}</pre>
		</div>
	</div>
</div>
