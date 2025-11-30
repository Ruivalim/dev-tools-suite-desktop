<script lang="ts">
  import { Database, Copy, Check, Trash2, Minimize2, Maximize2 } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';
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
    setTimeout(() => copied = false, 2000);
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

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-accent-500/10">
        <Database class="w-6 h-6 text-accent-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">SQL Formatter</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Format and beautify SQL queries</p>
      </div>
    </div>
  </div>

  <!-- Controls -->
  <div class="mb-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
    <div class="flex flex-wrap items-center gap-4">
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Dialect:</label>
        <Select
          value={dialect}
          options={dialectOptions}
          onchange={(v) => dialect = v as SqlDialect}
          searchable={false}
          class="w-40"
        />
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Indent:</label>
        <Select
          value={String(tabWidth)}
          options={[
            { value: '2', label: '2 spaces' },
            { value: '4', label: '4 spaces' }
          ]}
          onchange={(v) => tabWidth = parseInt(v)}
          searchable={false}
          class="w-28"
        />
      </div>

      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          bind:checked={uppercase}
          class="rounded border-slate-300 dark:border-slate-700 text-accent-500 focus:ring-accent-500"
        />
        <span class="text-sm text-slate-700 dark:text-slate-300">Uppercase keywords</span>
      </label>

      <button
        onclick={formatSql}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium"
      >
        <Maximize2 class="w-4 h-4" />
        Format
      </button>

      <button
        onclick={minify}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium"
      >
        <Minimize2 class="w-4 h-4" />
        Minify
      </button>

      <button
        onclick={loadExample}
        class="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        Load Example
      </button>

      <button
        onclick={clear}
        class="flex items-center gap-1 ml-auto px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        <Trash2 class="w-4 h-4" />
        Clear
      </button>
    </div>
  </div>

  <!-- Error -->
  {#if error}
    <div class="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-700 dark:text-yellow-300">
      {error}
    </div>
  {/if}

  <!-- Editors -->
  <div class="flex-1 grid grid-cols-2 gap-4 min-h-0">
    <!-- Input -->
    <div class="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="p-3 border-b border-slate-200 dark:border-slate-800">
        <span class="font-medium text-sm text-slate-700 dark:text-slate-300">Input SQL</span>
      </div>
      <textarea
        bind:value={input}
        placeholder="Paste your SQL query here..."
        class="flex-1 p-3 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none font-mono text-sm focus:outline-none"
        spellcheck="false"
      ></textarea>
    </div>

    <!-- Output -->
    <div class="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
        <span class="font-medium text-sm text-slate-700 dark:text-slate-300">Formatted SQL</span>
        <button
          onclick={copyOutput}
          disabled={!output}
          class="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-50"
        >
          {#if copied}
            <Check class="w-4 h-4 text-green-500" />
          {:else}
            <Copy class="w-4 h-4" />
          {/if}
        </button>
      </div>
      <pre class="flex-1 p-3 overflow-auto font-mono text-sm text-slate-900 dark:text-slate-100">{output}</pre>
    </div>
  </div>
</div>
