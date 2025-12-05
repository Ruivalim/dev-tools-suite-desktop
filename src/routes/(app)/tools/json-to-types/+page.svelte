<script lang="ts">
	import { Braces, Copy, Check, Trash2, AlertCircle } from 'lucide-svelte';

	let input = $state('');
	let output = $state('');
	let error = $state('');
	let copied = $state(false);
	let targetLang = $state<'typescript' | 'go' | 'rust'>('typescript');
	let rootName = $state('Root');

	function capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	function toSnakeCase(str: string): string {
		return str
			.replace(/([A-Z])/g, '_$1')
			.toLowerCase()
			.replace(/^_/, '');
	}

	function inferType(value: unknown, key: string, lang: string): string {
		if (value === null) {
			if (lang === 'typescript') return 'null';
			if (lang === 'go') return 'interface{}';
			if (lang === 'rust') return 'Option<serde_json::Value>';
		}

		if (Array.isArray(value)) {
			if (value.length === 0) {
				if (lang === 'typescript') return 'unknown[]';
				if (lang === 'go') return '[]interface{}';
				if (lang === 'rust') return 'Vec<serde_json::Value>';
			}
			const itemType = inferType(value[0], key, lang);
			if (lang === 'typescript') return `${itemType}[]`;
			if (lang === 'go') return `[]${itemType}`;
			if (lang === 'rust') return `Vec<${itemType}>`;
		}

		switch (typeof value) {
			case 'string':
				if (lang === 'typescript') return 'string';
				if (lang === 'go') return 'string';
				if (lang === 'rust') return 'String';
				break;
			case 'number':
				if (Number.isInteger(value)) {
					if (lang === 'typescript') return 'number';
					if (lang === 'go') return 'int64';
					if (lang === 'rust') return 'i64';
				}
				if (lang === 'typescript') return 'number';
				if (lang === 'go') return 'float64';
				if (lang === 'rust') return 'f64';
				break;
			case 'boolean':
				if (lang === 'typescript') return 'boolean';
				if (lang === 'go') return 'bool';
				if (lang === 'rust') return 'bool';
				break;
			case 'object':
				return capitalize(key);
			default:
				if (lang === 'typescript') return 'unknown';
				if (lang === 'go') return 'interface{}';
				if (lang === 'rust') return 'serde_json::Value';
		}
		return 'unknown';
	}

	function generateTypeScript(obj: Record<string, unknown>, name: string, types: string[] = []): string[] {
		let result = `export interface ${name} {\n`;

		for (const [key, value] of Object.entries(obj)) {
			const type = inferType(value, key, 'typescript');
			result += `  ${key}: ${type};\n`;

			if (value && typeof value === 'object' && !Array.isArray(value)) {
				generateTypeScript(value as Record<string, unknown>, capitalize(key), types);
			} else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
				generateTypeScript(value[0] as Record<string, unknown>, capitalize(key), types);
			}
		}

		result += '}';
		types.push(result);
		return types;
	}

	function generateGo(obj: Record<string, unknown>, name: string, types: string[] = []): string[] {
		let result = `type ${name} struct {\n`;

		for (const [key, value] of Object.entries(obj)) {
			const goType = inferType(value, key, 'go');
			const fieldName = capitalize(key);
			result += `\t${fieldName} ${goType} \`json:"${key}"\`\n`;

			if (value && typeof value === 'object' && !Array.isArray(value)) {
				generateGo(value as Record<string, unknown>, capitalize(key), types);
			} else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
				generateGo(value[0] as Record<string, unknown>, capitalize(key), types);
			}
		}

		result += '}';
		types.push(result);
		return types;
	}

	function generateRust(obj: Record<string, unknown>, name: string, types: string[] = []): string[] {
		let result = `#[derive(Debug, Serialize, Deserialize)]\npub struct ${name} {\n`;

		for (const [key, value] of Object.entries(obj)) {
			const rustType = inferType(value, key, 'rust');
			const fieldName = toSnakeCase(key);
			if (fieldName !== key) {
				result += `    #[serde(rename = "${key}")]\n`;
			}
			result += `    pub ${fieldName}: ${rustType},\n`;

			if (value && typeof value === 'object' && !Array.isArray(value)) {
				generateRust(value as Record<string, unknown>, capitalize(key), types);
			} else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
				generateRust(value[0] as Record<string, unknown>, capitalize(key), types);
			}
		}

		result += '}';
		types.push(result);
		return types;
	}

	function convert() {
		error = '';
		output = '';

		if (!input.trim()) return;

		try {
			const parsed = JSON.parse(input);

			if (typeof parsed !== 'object' || parsed === null) {
				error = 'Input must be a JSON object';
				return;
			}

			let types: string[] = [];

			switch (targetLang) {
				case 'typescript':
					types = generateTypeScript(parsed, rootName);
					break;
				case 'go':
					types = generateGo(parsed, rootName);
					types.unshift('package main\n');
					break;
				case 'rust':
					types = generateRust(parsed, rootName);
					types.unshift('use serde::{Deserialize, Serialize};\n');
					break;
			}

			output = types.reverse().join('\n\n');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invalid JSON';
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
		input = JSON.stringify(
			{
				id: 1,
				name: 'John Doe',
				email: 'john@example.com',
				isActive: true,
				score: 98.5,
				tags: ['developer', 'designer'],
				address: {
					street: '123 Main St',
					city: 'New York',
					zipCode: '10001'
				},
				orders: [{ id: 101, total: 99.99, items: 3 }]
			},
			null,
			2
		);
	}

	$effect(() => {
		if (input) convert();
	});

	$effect(() => {
		// Track dependencies to trigger reconversion
		void targetLang;
		void rootName;
		if (input) convert();
	});
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-blue-500/10 p-2">
				<Braces class="h-6 w-6 text-blue-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">JSON to Types</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Convert JSON to TypeScript, Go, or Rust types</p>
			</div>
		</div>
	</div>

	<!-- Controls -->
	<div class="mb-4 flex flex-wrap items-center gap-4">
		<div class="flex items-center gap-2">
			<span class="text-sm text-slate-500">Language:</span>
			<div class="flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
				<button
					onclick={() => (targetLang = 'typescript')}
					class="px-3 py-1.5 text-sm font-medium transition-colors {targetLang === 'typescript'
						? 'bg-blue-500 text-white'
						: 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}"
				>
					TypeScript
				</button>
				<button
					onclick={() => (targetLang = 'go')}
					class="border-l border-slate-200 px-3 py-1.5 text-sm font-medium transition-colors dark:border-slate-700 {targetLang === 'go'
						? 'bg-blue-500 text-white'
						: 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}"
				>
					Go
				</button>
				<button
					onclick={() => (targetLang = 'rust')}
					class="border-l border-slate-200 px-3 py-1.5 text-sm font-medium transition-colors dark:border-slate-700 {targetLang === 'rust'
						? 'bg-blue-500 text-white'
						: 'bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}"
				>
					Rust
				</button>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<span class="text-sm text-slate-500">Root name:</span>
			<input
				type="text"
				bind:value={rootName}
				class="w-32 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
			/>
		</div>

		<button onclick={loadExample} class="rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
			Load Example
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
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">JSON Input</span>
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
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">
					{targetLang === 'typescript' ? 'TypeScript' : targetLang === 'go' ? 'Go' : 'Rust'} Output
				</span>
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
