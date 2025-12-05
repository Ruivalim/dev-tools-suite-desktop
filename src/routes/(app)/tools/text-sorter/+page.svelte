<script lang="ts">
	import { ArrowUpDown, Copy, Check, Trash2 } from 'lucide-svelte';
	import Select from '$lib/components/ui/Select.svelte';

	type SortType = 'alphabetical' | 'alphabetical-reverse' | 'numerical' | 'numerical-reverse' | 'length' | 'length-reverse' | 'random';

	let input = $state('');
	let output = $state('');
	let sortType = $state<SortType>('alphabetical');
	let caseSensitive = $state(false);
	let trimLines = $state(true);
	let removeEmpty = $state(true);
	let copied = $state(false);

	const sortOptions = [
		{ value: 'alphabetical', label: 'A → Z' },
		{ value: 'alphabetical-reverse', label: 'Z → A' },
		{ value: 'numerical', label: '0 → 9' },
		{ value: 'numerical-reverse', label: '9 → 0' },
		{ value: 'length', label: 'Short → Long' },
		{ value: 'length-reverse', label: 'Long → Short' },
		{ value: 'random', label: 'Random shuffle' }
	];

	function sort() {
		if (!input.trim()) {
			output = '';
			return;
		}

		let lines = input.split('\n');

		if (trimLines) {
			lines = lines.map((l) => l.trim());
		}

		if (removeEmpty) {
			lines = lines.filter((l) => l.length > 0);
		}

		switch (sortType) {
			case 'alphabetical':
				lines.sort((a, b) => {
					const aVal = caseSensitive ? a : a.toLowerCase();
					const bVal = caseSensitive ? b : b.toLowerCase();
					return aVal.localeCompare(bVal);
				});
				break;

			case 'alphabetical-reverse':
				lines.sort((a, b) => {
					const aVal = caseSensitive ? a : a.toLowerCase();
					const bVal = caseSensitive ? b : b.toLowerCase();
					return bVal.localeCompare(aVal);
				});
				break;

			case 'numerical':
				lines.sort((a, b) => {
					const aNum = parseFloat(a.replace(/[^\d.-]/g, '')) || 0;
					const bNum = parseFloat(b.replace(/[^\d.-]/g, '')) || 0;
					return aNum - bNum;
				});
				break;

			case 'numerical-reverse':
				lines.sort((a, b) => {
					const aNum = parseFloat(a.replace(/[^\d.-]/g, '')) || 0;
					const bNum = parseFloat(b.replace(/[^\d.-]/g, '')) || 0;
					return bNum - aNum;
				});
				break;

			case 'length':
				lines.sort((a, b) => a.length - b.length);
				break;

			case 'length-reverse':
				lines.sort((a, b) => b.length - a.length);
				break;

			case 'random':
				for (let i = lines.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[lines[i], lines[j]] = [lines[j], lines[i]];
				}
				break;
		}

		output = lines.join('\n');
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

	function useOutput() {
		input = output;
		output = '';
	}

	// Auto-sort on changes
	$effect(() => {
		sort();
	});

	const lineCount = $derived(output.split('\n').filter((l) => l.length > 0).length);
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<ArrowUpDown class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Text Sorter</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Sort lines alphabetically, numerically, or by length</p>
			</div>
		</div>
	</div>

	<!-- Controls -->
	<div class="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
		<div class="flex flex-wrap items-center gap-4">
			<div class="flex items-center gap-2">
				<label class="text-sm font-medium text-slate-700 dark:text-slate-300">Sort by:</label>
				<Select value={sortType} options={sortOptions} onchange={(v) => (sortType = v as SortType)} searchable={false} class="w-40" />
			</div>

			<label class="flex cursor-pointer items-center gap-2">
				<input type="checkbox" bind:checked={caseSensitive} class="rounded border-slate-300 text-accent-500 focus:ring-accent-500 dark:border-slate-700" />
				<span class="text-sm text-slate-700 dark:text-slate-300">Case sensitive</span>
			</label>

			<label class="flex cursor-pointer items-center gap-2">
				<input type="checkbox" bind:checked={trimLines} class="rounded border-slate-300 text-accent-500 focus:ring-accent-500 dark:border-slate-700" />
				<span class="text-sm text-slate-700 dark:text-slate-300">Trim whitespace</span>
			</label>

			<label class="flex cursor-pointer items-center gap-2">
				<input type="checkbox" bind:checked={removeEmpty} class="rounded border-slate-300 text-accent-500 focus:ring-accent-500 dark:border-slate-700" />
				<span class="text-sm text-slate-700 dark:text-slate-300">Remove empty lines</span>
			</label>

			<button onclick={clear} class="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
				<Trash2 class="h-4 w-4" />
				Clear
			</button>
		</div>
	</div>

	<!-- Editors -->
	<div class="grid min-h-0 flex-1 grid-cols-2 gap-4">
		<!-- Input -->
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Input (one item per line)</span>
			</div>
			<textarea
				bind:value={input}
				placeholder="Enter text to sort...&#10;One item per line"
				class="flex-1 resize-none bg-transparent p-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
				spellcheck="false"
			></textarea>
		</div>

		<!-- Output -->
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">
					Sorted Output
					{#if lineCount > 0}
						<span class="font-normal text-slate-400">({lineCount} lines)</span>
					{/if}
				</span>
				<div class="flex items-center gap-2">
					<button onclick={useOutput} disabled={!output} class="px-2 py-1 text-xs text-slate-500 transition-colors hover:text-accent-500 disabled:opacity-50"> Use as input </button>
					<button onclick={copyOutput} disabled={!output} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">
						{#if copied}
							<Check class="h-4 w-4 text-green-500" />
						{:else}
							<Copy class="h-4 w-4" />
						{/if}
					</button>
				</div>
			</div>
			<pre class="flex-1 overflow-auto p-3 font-mono text-sm text-slate-900 dark:text-slate-100">{output}</pre>
		</div>
	</div>
</div>
