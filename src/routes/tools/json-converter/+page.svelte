<script lang="ts">
  import { ArrowRightLeft, Copy, Check, AlertCircle, Trash2 } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';
  import Select from '$lib/components/ui/Select.svelte';
  import YAML from 'yaml';
  import { parse as parseCSV } from 'csv-parse/browser/esm/sync';
  import { stringify as stringifyCSV } from 'csv-stringify/browser/esm/sync';
  import { XMLParser, XMLBuilder } from 'fast-xml-parser';
  import * as TOML from 'smol-toml';

  type Format = 'json' | 'yaml' | 'csv' | 'xml' | 'toml';

  const formatOptions = [
    { value: 'json', label: 'JSON' },
    { value: 'yaml', label: 'YAML' },
    { value: 'csv', label: 'CSV' },
    { value: 'xml', label: 'XML' },
    { value: 'toml', label: 'TOML' }
  ];

  let sourceFormat = $state<Format>('yaml');
  let targetFormat = $state<Format>('json');
  let input = $state('');
  let output = $state('');
  let error = $state('');
  let copiedField = $state<string | null>(null);

  const placeholders: Record<Format, string> = {
    json: `{
  "name": "John",
  "age": 30,
  "active": true
}`,
    yaml: `name: John
age: 30
active: true`,
    csv: `name,age,active
John,30,true
Jane,25,false`,
    xml: `<root>
  <person>
    <name>John</name>
    <age>30</age>
  </person>
</root>`,
    toml: `name = "John"
age = 30
active = true`
  };

  function parseInput(text: string, format: Format): any {
    switch (format) {
      case 'json':
        return JSON.parse(text);
      case 'yaml':
        return YAML.parse(text);
      case 'csv':
        const records = parseCSV(text, { columns: true, skip_empty_lines: true });
        return records;
      case 'xml':
        const parser = new XMLParser({ ignoreAttributes: false });
        return parser.parse(text);
      case 'toml':
        return TOML.parse(text);
      default:
        throw new Error('Unknown format');
    }
  }

  function stringifyOutput(data: any, format: Format): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'yaml':
        return YAML.stringify(data);
      case 'csv':
        if (!Array.isArray(data)) {
          data = [data];
        }
        return stringifyCSV(data, { header: true });
      case 'xml':
        const builder = new XMLBuilder({
          ignoreAttributes: false,
          format: true,
          indentBy: '  '
        });
        return builder.build({ root: data });
      case 'toml':
        return TOML.stringify(data);
      default:
        throw new Error('Unknown format');
    }
  }

  function convert() {
    error = '';
    output = '';

    if (!input.trim()) {
      return;
    }

    try {
      const data = parseInput(input, sourceFormat);
      output = stringifyOutput(data, targetFormat);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Conversion failed';
    }
  }

  function swapFormats() {
    const temp = sourceFormat;
    sourceFormat = targetFormat;
    targetFormat = temp;

    if (output) {
      input = output;
      output = '';
      convert();
    }
  }

  async function copyValue(value: string, field: string) {
    await navigator.clipboard.writeText(value);
    copiedField = field;
    setTimeout(() => copiedField = null, 2000);
  }

  function clear() {
    input = '';
    output = '';
    error = '';
  }

  function loadExample() {
    input = placeholders[sourceFormat];
    convert();
  }

  // Auto-convert on input change
  $effect(() => {
    if (input) {
      convert();
    }
  });
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-accent-500/10">
        <ArrowRightLeft class="w-6 h-6 text-accent-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">JSON Converter</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Convert between JSON, YAML, CSV, XML, and TOML</p>
      </div>
    </div>
  </div>

  <!-- Format Selectors -->
  <div class="mb-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
    <div class="flex items-center justify-center gap-4">
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">From:</label>
        <Select
          value={sourceFormat}
          options={formatOptions}
          onchange={(v) => sourceFormat = v as Format}
          searchable={false}
          class="w-28"
        />
      </div>

      <button
        onclick={swapFormats}
        class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
        title="Swap formats"
      >
        <ArrowRightLeft class="w-5 h-5" />
      </button>

      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">To:</label>
        <Select
          value={targetFormat}
          options={formatOptions}
          onchange={(v) => targetFormat = v as Format}
          searchable={false}
          class="w-28"
        />
      </div>

      <div class="ml-auto flex items-center gap-2">
        <button
          onclick={loadExample}
          class="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          Load Example
        </button>
        <button
          onclick={clear}
          class="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Trash2 class="w-4 h-4" />
          Clear
        </button>
      </div>
    </div>
  </div>

  <!-- Error -->
  {#if error}
    <div class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
      <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <span class="text-sm text-red-700 dark:text-red-300">{error}</span>
    </div>
  {/if}

  <!-- Editors -->
  <div class="flex-1 grid grid-cols-2 gap-4 min-h-0">
    <!-- Input -->
    <div class="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
        <span class="font-medium text-sm text-slate-700 dark:text-slate-300">
          Input ({sourceFormat.toUpperCase()})
        </span>
        <button
          onclick={() => copyValue(input, 'input')}
          disabled={!input}
          class="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-50"
        >
          {#if copiedField === 'input'}
            <Check class="w-4 h-4 text-green-500" />
          {:else}
            <Copy class="w-4 h-4" />
          {/if}
        </button>
      </div>
      <textarea
        bind:value={input}
        placeholder={placeholders[sourceFormat]}
        class="flex-1 p-3 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none font-mono text-sm focus:outline-none"
        spellcheck="false"
      ></textarea>
    </div>

    <!-- Output -->
    <div class="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
        <span class="font-medium text-sm text-slate-700 dark:text-slate-300">
          Output ({targetFormat.toUpperCase()})
        </span>
        <button
          onclick={() => copyValue(output, 'output')}
          disabled={!output}
          class="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-50"
        >
          {#if copiedField === 'output'}
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
