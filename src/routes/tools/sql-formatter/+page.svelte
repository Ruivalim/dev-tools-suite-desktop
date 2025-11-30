<script lang="ts">
	import { Database, Copy, Check, Trash2, Minimize2, Maximize2 } from 'lucide-svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { format } from 'sql-formatter';

	type SqlDialect = 'sql' | 'mysql' | 'postgresql' | 'sqlite' | 'mariadb' | 'bigquery' | 'plsql' | 'tsql' | 'spark' | 'trino';

	let input = $state('');
	let output = $state('');
	let error = $state('');
	let dialect = $state<SqlDialect>('postgresql');
	let tabWidth = $state(2);
	let uppercase = $state(true);
	let copied = $state(false);

	const dialectOptions = [
		{ value: 'postgresql', label: 'PostgreSQL' },
		{ value: 'mysql', label: 'MySQL' },
		{ value: 'mariadb', label: 'MariaDB' },
		{ value: 'sqlite', label: 'SQLite' },
		{ value: 'sql', label: 'Standard SQL' },
		{ value: 'tsql', label: 'T-SQL (SQL Server)' },
		{ value: 'plsql', label: 'PL/SQL (Oracle)' },
		{ value: 'bigquery', label: 'BigQuery' },
		{ value: 'spark', label: 'Spark SQL' },
		{ value: 'trino', label: 'Trino' }
	];

	function formatSql() {
		error = '';
		if (!input.trim()) {
			output = '';
			return;
		}

		try {
			output = format(input, {
				language: dialect,
				tabWidth,
				keywordCase: uppercase ? 'upper' : 'preserve',
				linesBetweenQueries: 2
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

		// Simple minification: remove extra whitespace and newlines
		output = input
			.replace(/\s+/g, ' ')
			.replace(/\s*([,;()])\s*/g, '$1')
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
		input = `select u.id, u.name, u.email, count(o.id) as order_count, sum(o.total) as total_spent from users u left join orders o on u.id = o.user_id where u.created_at > '2024-01-01' and u.status = 'active' group by u.id, u.name, u.email having count(o.id) > 0 order by total_spent desc limit 10;`;
		formatSql();
	}

	// Auto-format on changes
	$effect(() => {
		formatSql();
	});
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<Database class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">SQL Formatter</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Format and beautify SQL queries</p>
			</div>
		</div>
	</div>

	<!-- Controls -->
	<div class="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
		<div class="flex flex-wrap items-center gap-4">
			<div class="flex items-center gap-2">
				<label class="text-sm font-medium text-slate-700 dark:text-slate-300">Dialect:</label>
				<Select value={dialect} options={dialectOptions} onchange={(v) => (dialect = v as SqlDialect)} searchable={false} class="w-40" />
			</div>

			<div class="flex items-center gap-2">
				<label class="text-sm font-medium text-slate-700 dark:text-slate-300">Indent:</label>
				<Select
					value={String(tabWidth)}
					options={[
						{ value: '2', label: '2 spaces' },
						{ value: '4', label: '4 spaces' }
					]}
					onchange={(v) => (tabWidth = parseInt(v))}
					searchable={false}
					class="w-28"
				/>
			</div>

			<label class="flex cursor-pointer items-center gap-2">
				<input type="checkbox" bind:checked={uppercase} class="rounded border-slate-300 text-accent-500 focus:ring-accent-500 dark:border-slate-700" />
				<span class="text-sm text-slate-700 dark:text-slate-300">Uppercase keywords</span>
			</label>

			<button onclick={formatSql} class="flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-600">
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
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Input SQL</span>
			</div>
			<textarea
				bind:value={input}
				placeholder="Paste your SQL query here..."
				class="flex-1 resize-none bg-transparent p-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
				spellcheck="false"
			></textarea>
		</div>

		<!-- Output -->
		<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
				<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Formatted SQL</span>
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
