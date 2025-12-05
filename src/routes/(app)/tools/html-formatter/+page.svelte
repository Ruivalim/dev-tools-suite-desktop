<script lang="ts">
	import { Code, Copy, Check, Trash2, Minimize2, Maximize2 } from 'lucide-svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { html as beautifyHtml } from 'js-beautify';

	let input = $state('');
	let output = $state('');
	let error = $state('');
	let indentSize = $state(2);
	let wrapLineLength = $state(120);
	let preserveNewlines = $state(true);
	let copied = $state(false);

	function formatHtml() {
		error = '';
		if (!input.trim()) {
			output = '';
			return;
		}

		try {
			output = beautifyHtml(input, {
				indent_size: indentSize,
				wrap_line_length: wrapLineLength,
				preserve_newlines: preserveNewlines,
				max_preserve_newlines: preserveNewlines ? 2 : 0,
				indent_inner_html: true,
				indent_body_inner_html: true,
				indent_head_inner_html: true,
				extra_liners: ['head', 'body', '/html']
			});
		} catch (e) {
			error = e instanceof Error ? e.message : 'Formatting failed';
			output = input;
		}
	}

	function minify() {
		error = '';
		if (!input.trim()) {
			output = '';
			return;
		}

		// Simple HTML minification
		output = input
			.replace(/>\s+</g, '><')
			.replace(/\s+/g, ' ')
			.replace(/<!--.*?-->/g, '')
			.trim();
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

	function loadExample() {
		input =
			'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Example</title><style>body{margin:0;padding:20px;font-family:sans-serif}</style></head><body><div class="container"><header><h1>Welcome</h1><nav><a href="/">Home</a><a href="/about">About</a></nav></header><main><article><h2>Article Title</h2><p>Lorem ipsum dolor sit amet.</p></article></main><footer><p>&copy; 2024</p></footer></div><script>console.log("Hello")</' +
			'script></body></html>';
		formatHtml();
	}

	// Auto-format on changes
	$effect(() => {
		formatHtml();
	});
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<Code class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">HTML Formatter</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Beautify and minify HTML</p>
			</div>
		</div>
	</div>

	<!-- Controls -->
	<div class="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
		<div class="flex flex-wrap items-center gap-4">
			<div class="flex items-center gap-2">
				<label class="text-sm font-medium text-slate-700 dark:text-slate-300">Indent:</label>
				<Select
					value={String(indentSize)}
					options={[
						{ value: '2', label: '2 spaces' },
						{ value: '4', label: '4 spaces' }
					]}
					onchange={(v) => (indentSize = parseInt(v))}
					searchable={false}
					class="w-28"
				/>
			</div>

			<div class="flex items-center gap-2">
				<label class="text-sm font-medium text-slate-700 dark:text-slate-300">Wrap at:</label>
				<Select
					value={String(wrapLineLength)}
					options={[
						{ value: '80', label: '80 chars' },
						{ value: '120', label: '120 chars' },
						{ value: '0', label: 'No wrap' }
					]}
					onchange={(v) => (wrapLineLength = parseInt(v))}
					searchable={false}
					class="w-28"
				/>
			</div>

			<label class="flex cursor-pointer items-center gap-2">
				<input type="checkbox" bind:checked={preserveNewlines} class="rounded border-slate-300 text-accent-500 focus:ring-accent-500 dark:border-slate-700" />
				<span class="text-sm text-slate-700 dark:text-slate-300">Preserve newlines</span>
			</label>

			<button onclick={formatHtml} class="flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-600">
				<Maximize2 class="h-4 w-4" />
				Format
			</button>

			<button
				onclick={minify}
				class="flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
			>
				<Minimize2 class="h-4 w-4" />
				Minify
			</button>

			<button onclick={loadExample} class="rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"> Load Example </button>

			<button onclick={clear} class="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
				<Trash2 class="h-4 w-4" />
				Clear
			</button>
		</div>
	</div>

	<!-- Error -->
	{#if error}
		<div class="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
			{error}
		</div>
	{/if}

	<!-- Editors -->
	<div class="grid min-h-0 flex-1 grid-cols-2 gap-4">
		<!-- Input -->
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Input HTML</span>
			</div>
			<textarea
				bind:value={input}
				placeholder="Paste your HTML here..."
				class="flex-1 resize-none bg-transparent p-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
				spellcheck="false"
			></textarea>
		</div>

		<!-- Output -->
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Formatted HTML</span>
				<button onclick={copyOutput} disabled={!output} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">
					{#if copied}
						<Check class="h-4 w-4 text-green-500" />
					{:else}
						<Copy class="h-4 w-4" />
					{/if}
				</button>
			</div>
			<pre class="flex-1 overflow-auto p-3 font-mono text-sm text-slate-900 dark:text-slate-100">{output}</pre>
		</div>
	</div>
</div>
