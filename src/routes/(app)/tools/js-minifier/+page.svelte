<script lang="ts">
	import { FileCode, Copy, Check, Trash2, Minimize2, Maximize2 } from 'lucide-svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { js as beautifyJs } from 'js-beautify';

	let input = $state('');
	let output = $state('');
	let error = $state('');
	let indentSize = $state(2);
	let braceStyle = $state('collapse');
	let preserveNewlines = $state(true);
	let copied = $state(false);

	function formatJs() {
		error = '';
		if (!input.trim()) {
			output = '';
			return;
		}

		try {
			output = beautifyJs(input, {
				indent_size: indentSize,
				brace_style: braceStyle as 'collapse' | 'expand' | 'end-expand' | 'none',
				preserve_newlines: preserveNewlines,
				max_preserve_newlines: preserveNewlines ? 2 : 0,
				space_in_empty_paren: false,
				space_after_anon_function: true,
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

		try {
			let code = input;

			// Remove single-line comments (but not URLs like http://)
			code = code.replace(/(?<!:)\/\/.*$/gm, '');

			// Remove multi-line comments
			code = code.replace(/\/\*[\s\S]*?\*\//g, '');

			// Remove leading/trailing whitespace from lines
			code = code.replace(/^\s+|\s+$/gm, '');

			// Remove empty lines
			code = code.replace(/\n\s*\n/g, '\n');

			// Remove newlines
			code = code.replace(/\n/g, ' ');

			// Collapse multiple spaces to single space
			code = code.replace(/\s{2,}/g, ' ');

			// Remove spaces around operators and punctuation
			code = code.replace(/\s*([{}()[\];,:<>?=!&|+\-*/%])\s*/g, '$1');

			// Add space after keywords that need it
			code = code.replace(/\b(return|throw|new|delete|typeof|void|else|case|instanceof|in|of)\b(?=[^\s])/g, '$1 ');

			// Add space before keywords that need it
			code = code.replace(/([^\s])\b(else|instanceof|in|of)\b/g, '$1 $2');

			// Fix function declarations
			code = code.replace(/function\(/g, 'function (');
			code = code.replace(/function\s+(\w+)\s*\(/g, 'function $1(');

			// Clean up any double spaces created
			code = code.replace(/\s{2,}/g, ' ');

			output = code.trim();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Minification failed';
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

	function loadExample() {
		input = `const fetchData=async(url,options={})=>{try{const response=await fetch(url,{method:options.method||'GET',headers:{'Content-Type':'application/json',...options.headers},body:options.body?JSON.stringify(options.body):undefined});if(!response.ok){throw new Error(\`HTTP error! status: \${response.status}\`)}return await response.json()}catch(error){console.error('Fetch error:',error);throw error}};class DataManager{constructor(baseUrl){this.baseUrl=baseUrl;this.cache=new Map()}async get(endpoint){const url=\`\${this.baseUrl}/\${endpoint}\`;if(this.cache.has(url)){return this.cache.get(url)}const data=await fetchData(url);this.cache.set(url,data);return data}async post(endpoint,body){return fetchData(\`\${this.baseUrl}/\${endpoint}\`,{method:'POST',body})}clearCache(){this.cache.clear()}}`;
		formatJs();
	}

	// Auto-format on changes
	$effect(() => {
		formatJs();
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
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">JavaScript Formatter</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Beautify and minify JavaScript</p>
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
				<label class="text-sm font-medium text-slate-700 dark:text-slate-300">Braces:</label>
				<Select
					value={braceStyle}
					options={[
						{ value: 'collapse', label: 'Collapse' },
						{ value: 'expand', label: 'Expand' },
						{ value: 'end-expand', label: 'End expand' }
					]}
					onchange={(v) => (braceStyle = v)}
					searchable={false}
					class="w-32"
				/>
			</div>

			<label class="flex cursor-pointer items-center gap-2">
				<input type="checkbox" bind:checked={preserveNewlines} class="rounded border-slate-300 text-accent-500 focus:ring-accent-500 dark:border-slate-700" />
				<span class="text-sm text-slate-700 dark:text-slate-300">Preserve newlines</span>
			</label>

			<button onclick={formatJs} class="flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-600">
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
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Input JavaScript</span>
			</div>
			<textarea
				bind:value={input}
				placeholder="Paste your JavaScript here..."
				class="flex-1 resize-none bg-transparent p-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
				spellcheck="false"
			></textarea>
		</div>

		<!-- Output -->
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Formatted JavaScript</span>
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
