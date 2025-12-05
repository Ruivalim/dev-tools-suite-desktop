<script lang="ts">
	import { Paintbrush, Copy, Check, Trash2, Minimize2, Maximize2 } from 'lucide-svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { css as beautifyCss } from 'js-beautify';

	let input = $state('');
	let output = $state('');
	let error = $state('');
	let indentSize = $state(2);
	let selectorSeparatorNewline = $state(true);
	let newlineBetweenRules = $state(true);
	let copied = $state(false);

	function formatCss() {
		error = '';
		if (!input.trim()) {
			output = '';
			return;
		}

		try {
			output = beautifyCss(input, {
				indent_size: indentSize,
				selector_separator_newline: selectorSeparatorNewline,
				newline_between_rules: newlineBetweenRules,
				end_with_newline: true
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

		// CSS minification
		output = input
			.replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
			.replace(/\s+/g, ' ') // Collapse whitespace
			.replace(/\s*{\s*/g, '{')
			.replace(/\s*}\s*/g, '}')
			.replace(/\s*;\s*/g, ';')
			.replace(/\s*:\s*/g, ':')
			.replace(/\s*,\s*/g, ',')
			.replace(/;}/g, '}')
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
		input = `.container{display:flex;flex-direction:column;gap:1rem;padding:20px;max-width:1200px;margin:0 auto}.header,.footer{background:#f5f5f5;padding:1rem}.header h1{margin:0;font-size:2rem;color:#333}.nav{display:flex;gap:1rem}.nav a{text-decoration:none;color:#666;transition:color 0.2s}.nav a:hover{color:#000}.main{flex:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem}.card{background:white;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);padding:1.5rem}.card h2{margin-top:0}@media(max-width:768px){.container{padding:10px}.header h1{font-size:1.5rem}}`;
		formatCss();
	}

	// Auto-format on changes
	$effect(() => {
		formatCss();
	});
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<Paintbrush class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">CSS Formatter</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Beautify and minify CSS</p>
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

			<label class="flex cursor-pointer items-center gap-2">
				<input type="checkbox" bind:checked={selectorSeparatorNewline} class="rounded border-slate-300 text-accent-500 focus:ring-accent-500 dark:border-slate-700" />
				<span class="text-sm text-slate-700 dark:text-slate-300">Selector per line</span>
			</label>

			<label class="flex cursor-pointer items-center gap-2">
				<input type="checkbox" bind:checked={newlineBetweenRules} class="rounded border-slate-300 text-accent-500 focus:ring-accent-500 dark:border-slate-700" />
				<span class="text-sm text-slate-700 dark:text-slate-300">Blank line between rules</span>
			</label>

			<button onclick={formatCss} class="flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-600">
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
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Input CSS</span>
			</div>
			<textarea
				bind:value={input}
				placeholder="Paste your CSS here..."
				class="flex-1 resize-none bg-transparent p-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
				spellcheck="false"
			></textarea>
		</div>

		<!-- Output -->
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Formatted CSS</span>
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
