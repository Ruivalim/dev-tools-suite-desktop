<script lang="ts">
	import { GitCompare, Trash2, ArrowDownUp } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';

	let leftText = $state('');
	let rightText = $state('');
	let diffMode = $state<'line' | 'word' | 'char'>('line');

	interface DiffLine {
		type: 'equal' | 'add' | 'remove' | 'change';
		leftLine?: string;
		rightLine?: string;
		leftNum?: number;
		rightNum?: number;
	}

	// Simple LCS-based diff algorithm
	function computeDiff(left: string[], right: string[]): DiffLine[] {
		// Build LCS table
		const m = left.length;
		const n = right.length;
		const dp: number[][] = Array(m + 1)
			.fill(null)
			.map(() => Array(n + 1).fill(0));

		for (let i = 1; i <= m; i++) {
			for (let j = 1; j <= n; j++) {
				if (left[i - 1] === right[j - 1]) {
					dp[i][j] = dp[i - 1][j - 1] + 1;
				} else {
					dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
				}
			}
		}

		// Backtrack to find diff
		let i = m,
			j = n;
		const diff: DiffLine[] = [];

		while (i > 0 || j > 0) {
			if (i > 0 && j > 0 && left[i - 1] === right[j - 1]) {
				diff.unshift({
					type: 'equal',
					leftLine: left[i - 1],
					rightLine: right[j - 1],
					leftNum: i,
					rightNum: j
				});
				i--;
				j--;
			} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
				diff.unshift({
					type: 'add',
					rightLine: right[j - 1],
					rightNum: j
				});
				j--;
			} else if (i > 0) {
				diff.unshift({
					type: 'remove',
					leftLine: left[i - 1],
					leftNum: i
				});
				i--;
			}
		}

		return diff;
	}

	let diffResult = $derived.by(() => {
		if (!leftText && !rightText) return [];

		let leftParts: string[];
		let rightParts: string[];

		if (diffMode === 'line') {
			leftParts = leftText.split('\n');
			rightParts = rightText.split('\n');
		} else if (diffMode === 'word') {
			leftParts = leftText.split(/(\s+)/);
			rightParts = rightText.split(/(\s+)/);
		} else {
			leftParts = leftText.split('');
			rightParts = rightText.split('');
		}

		return computeDiff(leftParts, rightParts);
	});

	let stats = $derived.by(() => {
		const added = diffResult.filter((d) => d.type === 'add').length;
		const removed = diffResult.filter((d) => d.type === 'remove').length;
		const unchanged = diffResult.filter((d) => d.type === 'equal').length;
		return { added, removed, unchanged };
	});

	function swap() {
		const temp = leftText;
		leftText = rightText;
		rightText = temp;
	}

	function clear() {
		leftText = '';
		rightText = '';
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<GitCompare class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Diff Tool</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Compare two texts and see differences</p>
			</div>
		</div>
	</div>

	<!-- Controls -->
	<div class="mb-4 flex flex-wrap items-center gap-4">
		<div class="flex items-center gap-2">
			<span class="text-sm text-slate-500">Compare by:</span>
			<div class="flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
				<button
					onclick={() => (diffMode = 'line')}
					class={diffMode === 'line'
						? 'bg-accent-500 px-3 py-1.5 text-sm font-medium text-white'
						: 'bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}
				>
					Line
				</button>
				<button
					onclick={() => (diffMode = 'word')}
					class={diffMode === 'word'
						? 'bg-accent-500 px-3 py-1.5 text-sm font-medium text-white'
						: 'bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}
				>
					Word
				</button>
				<button
					onclick={() => (diffMode = 'char')}
					class={diffMode === 'char'
						? 'bg-accent-500 px-3 py-1.5 text-sm font-medium text-white'
						: 'bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}
				>
					Character
				</button>
			</div>
		</div>

		<button onclick={swap} class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
			<ArrowDownUp class="h-4 w-4" />
			Swap
		</button>

		<button onclick={clear} class="ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
			<Trash2 class="h-4 w-4" />
			Clear
		</button>
	</div>

	<!-- Input panels -->
	<div class="mb-4 grid grid-cols-2 gap-4">
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="border-b border-slate-200 bg-red-50 p-3 dark:border-slate-800 dark:bg-red-900/20">
				<span class="text-sm font-medium text-red-700 dark:text-red-300">Original</span>
			</div>
			<textarea
				bind:value={leftText}
				placeholder="Paste original text here..."
				class="min-h-[150px] flex-1 resize-none bg-transparent p-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
				spellcheck="false"
			></textarea>
		</div>

		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="border-b border-slate-200 bg-green-50 p-3 dark:border-slate-800 dark:bg-green-900/20">
				<span class="text-sm font-medium text-green-700 dark:text-green-300">Modified</span>
			</div>
			<textarea
				bind:value={rightText}
				placeholder="Paste modified text here..."
				class="min-h-[150px] flex-1 resize-none bg-transparent p-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
				spellcheck="false"
			></textarea>
		</div>
	</div>

	<!-- Stats -->
	{#if leftText || rightText}
		<div class="mb-4 flex items-center gap-4 text-sm">
			<span class="flex items-center gap-1.5">
				<span class="h-3 w-3 rounded bg-green-500"></span>
				<span class="text-slate-600 dark:text-slate-400">{stats.added} added</span>
			</span>
			<span class="flex items-center gap-1.5">
				<span class="h-3 w-3 rounded bg-red-500"></span>
				<span class="text-slate-600 dark:text-slate-400">{stats.removed} removed</span>
			</span>
			<span class="flex items-center gap-1.5">
				<span class="h-3 w-3 rounded bg-slate-300 dark:bg-slate-600"></span>
				<span class="text-slate-600 dark:text-slate-400">{stats.unchanged} unchanged</span>
			</span>
		</div>
	{/if}

	<!-- Diff output -->
	<div class="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
		<div class="border-b border-slate-200 p-3 dark:border-slate-800">
			<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Diff Result</span>
		</div>
		<div class="h-full max-h-[400px] overflow-auto">
			{#if diffResult.length > 0}
				{#if diffMode === 'line'}
					<table class="w-full font-mono text-sm">
						<tbody>
							{#each diffResult as line, i (i)}
								<tr class={cn(line.type === 'add' && 'bg-green-50 dark:bg-green-900/20', line.type === 'remove' && 'bg-red-50 dark:bg-red-900/20')}>
									<td class="w-12 border-r border-slate-200 px-2 py-1 text-right text-slate-400 select-none dark:border-slate-700">
										{line.leftNum || ''}
									</td>
									<td class="w-12 border-r border-slate-200 px-2 py-1 text-right text-slate-400 select-none dark:border-slate-700">
										{line.rightNum || ''}
									</td>
									<td class="w-6 border-r border-slate-200 px-2 py-1 text-center select-none dark:border-slate-700">
										{#if line.type === 'add'}
											<span class="text-green-600">+</span>
										{:else if line.type === 'remove'}
											<span class="text-red-600">-</span>
										{:else}
											<span class="text-slate-300">&nbsp;</span>
										{/if}
									</td>
									<td
										class={cn(
											'px-3 py-1 whitespace-pre',
											line.type === 'add' && 'text-green-700 dark:text-green-300',
											line.type === 'remove' && 'text-red-700 dark:text-red-300',
											line.type === 'equal' && 'text-slate-600 dark:text-slate-400'
										)}
									>
										{line.leftLine ?? line.rightLine ?? ''}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<div class="p-3 font-mono text-sm whitespace-pre-wrap">
						{#each diffResult as part, i (i)}
							<span
								class={cn(
									part.type === 'add' && 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200',
									part.type === 'remove' && 'bg-red-200 text-red-800 line-through dark:bg-red-800 dark:text-red-200',
									part.type === 'equal' && 'text-slate-600 dark:text-slate-400'
								)}>{part.leftLine ?? part.rightLine ?? ''}</span
							>
						{/each}
					</div>
				{/if}
			{:else}
				<div class="flex h-full items-center justify-center py-12 text-slate-400">Enter text in both panels to see differences</div>
			{/if}
		</div>
	</div>
</div>
