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
    const result: DiffLine[] = [];

    // Build LCS table
    const m = left.length;
    const n = right.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

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
    let i = m, j = n;
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
    const added = diffResult.filter(d => d.type === 'add').length;
    const removed = diffResult.filter(d => d.type === 'remove').length;
    const unchanged = diffResult.filter(d => d.type === 'equal').length;
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

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-accent-500/10">
        <GitCompare class="w-6 h-6 text-accent-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Diff Tool</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Compare two texts and see differences</p>
      </div>
    </div>
  </div>

  <!-- Controls -->
  <div class="mb-4 flex items-center gap-4 flex-wrap">
    <div class="flex items-center gap-2">
      <span class="text-sm text-slate-500">Compare by:</span>
      <div class="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        <button
          onclick={() => diffMode = 'line'}
          class={diffMode === 'line'
            ? 'px-3 py-1.5 text-sm font-medium bg-accent-500 text-white'
            : 'px-3 py-1.5 text-sm font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}
        >
          Line
        </button>
        <button
          onclick={() => diffMode = 'word'}
          class={diffMode === 'word'
            ? 'px-3 py-1.5 text-sm font-medium bg-accent-500 text-white'
            : 'px-3 py-1.5 text-sm font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}
        >
          Word
        </button>
        <button
          onclick={() => diffMode = 'char'}
          class={diffMode === 'char'
            ? 'px-3 py-1.5 text-sm font-medium bg-accent-500 text-white'
            : 'px-3 py-1.5 text-sm font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}
        >
          Character
        </button>
      </div>
    </div>

    <button
      onclick={swap}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
    >
      <ArrowDownUp class="w-4 h-4" />
      Swap
    </button>

    <button
      onclick={clear}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm ml-auto"
    >
      <Trash2 class="w-4 h-4" />
      Clear
    </button>
  </div>

  <!-- Input panels -->
  <div class="grid grid-cols-2 gap-4 mb-4">
    <div class="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="p-3 border-b border-slate-200 dark:border-slate-800 bg-red-50 dark:bg-red-900/20">
        <span class="font-medium text-sm text-red-700 dark:text-red-300">Original</span>
      </div>
      <textarea
        bind:value={leftText}
        placeholder="Paste original text here..."
        class="flex-1 p-3 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none font-mono text-sm focus:outline-none min-h-[150px]"
        spellcheck="false"
      ></textarea>
    </div>

    <div class="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="p-3 border-b border-slate-200 dark:border-slate-800 bg-green-50 dark:bg-green-900/20">
        <span class="font-medium text-sm text-green-700 dark:text-green-300">Modified</span>
      </div>
      <textarea
        bind:value={rightText}
        placeholder="Paste modified text here..."
        class="flex-1 p-3 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none font-mono text-sm focus:outline-none min-h-[150px]"
        spellcheck="false"
      ></textarea>
    </div>
  </div>

  <!-- Stats -->
  {#if leftText || rightText}
    <div class="mb-4 flex items-center gap-4 text-sm">
      <span class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded bg-green-500"></span>
        <span class="text-slate-600 dark:text-slate-400">{stats.added} added</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded bg-red-500"></span>
        <span class="text-slate-600 dark:text-slate-400">{stats.removed} removed</span>
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded bg-slate-300 dark:bg-slate-600"></span>
        <span class="text-slate-600 dark:text-slate-400">{stats.unchanged} unchanged</span>
      </span>
    </div>
  {/if}

  <!-- Diff output -->
  <div class="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
    <div class="p-3 border-b border-slate-200 dark:border-slate-800">
      <span class="font-medium text-sm text-slate-700 dark:text-slate-300">Diff Result</span>
    </div>
    <div class="overflow-auto h-full max-h-[400px]">
      {#if diffResult.length > 0}
        {#if diffMode === 'line'}
          <table class="w-full text-sm font-mono">
            <tbody>
              {#each diffResult as line}
                <tr class={cn(
                  line.type === 'add' && 'bg-green-50 dark:bg-green-900/20',
                  line.type === 'remove' && 'bg-red-50 dark:bg-red-900/20'
                )}>
                  <td class="w-12 px-2 py-1 text-right text-slate-400 border-r border-slate-200 dark:border-slate-700 select-none">
                    {line.leftNum || ''}
                  </td>
                  <td class="w-12 px-2 py-1 text-right text-slate-400 border-r border-slate-200 dark:border-slate-700 select-none">
                    {line.rightNum || ''}
                  </td>
                  <td class="w-6 px-2 py-1 text-center border-r border-slate-200 dark:border-slate-700 select-none">
                    {#if line.type === 'add'}
                      <span class="text-green-600">+</span>
                    {:else if line.type === 'remove'}
                      <span class="text-red-600">-</span>
                    {:else}
                      <span class="text-slate-300">&nbsp;</span>
                    {/if}
                  </td>
                  <td class={cn(
                    "px-3 py-1 whitespace-pre",
                    line.type === 'add' && 'text-green-700 dark:text-green-300',
                    line.type === 'remove' && 'text-red-700 dark:text-red-300',
                    line.type === 'equal' && 'text-slate-600 dark:text-slate-400'
                  )}>
                    {line.leftLine ?? line.rightLine ?? ''}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <div class="p-3 font-mono text-sm whitespace-pre-wrap">
            {#each diffResult as part}
              <span class={cn(
                part.type === 'add' && 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200',
                part.type === 'remove' && 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 line-through',
                part.type === 'equal' && 'text-slate-600 dark:text-slate-400'
              )}>{part.leftLine ?? part.rightLine ?? ''}</span>
            {/each}
          </div>
        {/if}
      {:else}
        <div class="flex items-center justify-center h-full py-12 text-slate-400">
          Enter text in both panels to see differences
        </div>
      {/if}
    </div>
  </div>
</div>
