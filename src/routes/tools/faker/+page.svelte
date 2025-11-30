<script lang="ts">
  import { faker, fakerPT_BR } from '@faker-js/faker';
  import { Sparkles, Copy, Check, RefreshCw, Plus, Trash2 } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';
  import Select from '$lib/components/ui/Select.svelte';

  type Locale = 'en' | 'pt-BR';

  interface FieldConfig {
    id: string;
    name: string;
    type: string;
    category: string;
  }

  const fieldOptions: { category: string; fields: { type: string; label: string }[] }[] = [
    {
      category: 'Person',
      fields: [
        { type: 'person.firstName', label: 'First Name' },
        { type: 'person.lastName', label: 'Last Name' },
        { type: 'person.fullName', label: 'Full Name' },
        { type: 'person.gender', label: 'Gender' },
        { type: 'person.jobTitle', label: 'Job Title' },
        { type: 'person.jobArea', label: 'Job Area' },
      ]
    },
    {
      category: 'Contact',
      fields: [
        { type: 'internet.email', label: 'Email' },
        { type: 'phone.number', label: 'Phone' },
        { type: 'internet.userName', label: 'Username' },
        { type: 'internet.url', label: 'Website' },
      ]
    },
    {
      category: 'Address',
      fields: [
        { type: 'location.streetAddress', label: 'Street Address' },
        { type: 'location.city', label: 'City' },
        { type: 'location.state', label: 'State' },
        { type: 'location.zipCode', label: 'Zip Code' },
        { type: 'location.country', label: 'Country' },
      ]
    },
    {
      category: 'Company',
      fields: [
        { type: 'company.name', label: 'Company Name' },
        { type: 'company.catchPhrase', label: 'Catch Phrase' },
        { type: 'company.buzzPhrase', label: 'Buzz Phrase' },
      ]
    },
    {
      category: 'Finance',
      fields: [
        { type: 'finance.accountNumber', label: 'Account Number' },
        { type: 'finance.amount', label: 'Amount' },
        { type: 'finance.creditCardNumber', label: 'Credit Card' },
        { type: 'finance.currencyCode', label: 'Currency Code' },
      ]
    },
    {
      category: 'Internet',
      fields: [
        { type: 'internet.ip', label: 'IP Address' },
        { type: 'internet.ipv6', label: 'IPv6' },
        { type: 'internet.mac', label: 'MAC Address' },
        { type: 'internet.password', label: 'Password' },
      ]
    },
    {
      category: 'Date',
      fields: [
        { type: 'date.past', label: 'Past Date' },
        { type: 'date.future', label: 'Future Date' },
        { type: 'date.birthdate', label: 'Birthdate' },
      ]
    },
    {
      category: 'Lorem',
      fields: [
        { type: 'lorem.word', label: 'Word' },
        { type: 'lorem.sentence', label: 'Sentence' },
        { type: 'lorem.paragraph', label: 'Paragraph' },
      ]
    },
    {
      category: 'ID',
      fields: [
        { type: 'string.uuid', label: 'UUID' },
        { type: 'string.nanoid', label: 'NanoID' },
        { type: 'number.int', label: 'Integer' },
      ]
    },
  ];

  // Transform fieldOptions to Select groups format
  const fieldGroups = fieldOptions.map(cat => ({
    label: cat.category,
    options: cat.fields.map(f => ({ value: f.type, label: f.label }))
  }));

  const localeOptions = [
    { value: 'pt-BR', label: 'Português (BR)' },
    { value: 'en', label: 'English' }
  ];

  let locale = $state<Locale>('pt-BR');
  let rowCount = $state(10);
  let selectedFields = $state<FieldConfig[]>([
    { id: crypto.randomUUID(), name: 'name', type: 'person.fullName', category: 'Person' },
    { id: crypto.randomUUID(), name: 'email', type: 'internet.email', category: 'Contact' },
    { id: crypto.randomUUID(), name: 'phone', type: 'phone.number', category: 'Contact' },
    { id: crypto.randomUUID(), name: 'city', type: 'location.city', category: 'Address' },
  ]);
  let generatedData = $state<Record<string, any>[]>([]);
  let copied = $state(false);

  function getFaker() {
    return locale === 'pt-BR' ? fakerPT_BR : faker;
  }

  function generateValue(type: string): any {
    const f = getFaker();
    const [category, method] = type.split('.');

    try {
      const categoryObj = (f as any)[category];
      if (categoryObj && typeof categoryObj[method] === 'function') {
        const value = categoryObj[method]();
        if (value instanceof Date) {
          return value.toISOString().split('T')[0];
        }
        return value;
      }
    } catch (e) {
      console.error(`Error generating ${type}:`, e);
    }
    return '';
  }

  function generateData() {
    const data: Record<string, any>[] = [];

    for (let i = 0; i < rowCount; i++) {
      const row: Record<string, any> = {};
      for (const field of selectedFields) {
        row[field.name] = generateValue(field.type);
      }
      data.push(row);
    }

    generatedData = data;
  }

  function addField() {
    selectedFields = [...selectedFields, {
      id: crypto.randomUUID(),
      name: 'field',
      type: 'person.firstName',
      category: 'Person'
    }];
  }

  function removeField(id: string) {
    selectedFields = selectedFields.filter(f => f.id !== id);
  }

  function updateFieldType(id: string, type: string) {
    const category = fieldOptions.find(c => c.fields.some(f => f.type === type))?.category || '';
    selectedFields = selectedFields.map(f =>
      f.id === id ? { ...f, type, category } : f
    );
  }

  function handleLocaleChange(value: string) {
    locale = value as Locale;
    generateData();
  }

  async function copyAsJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(generatedData, null, 2));
      copied = true;
      setTimeout(() => copied = false, 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  }

  // Generate initial data
  $effect(() => {
    if (selectedFields.length > 0) {
      generateData();
    }
  });
</script>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-accent-500/10">
        <Sparkles class="w-6 h-6 text-accent-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Faker</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Generate fake data for testing</p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        onclick={generateData}
        class="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-lg transition-colors"
      >
        <RefreshCw class="w-4 h-4" />
        Generate
      </button>
    </div>
  </div>

  <!-- Config -->
  <div class="mb-4 flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
    <div class="flex items-center gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Locale:</label>
      <Select
        value={locale}
        options={localeOptions}
        onchange={handleLocaleChange}
        class="w-40"
      />
    </div>

    <div class="flex items-center gap-2">
      <label for="rows" class="text-sm font-medium text-slate-700 dark:text-slate-300">Rows:</label>
      <input
        id="rows"
        type="number"
        bind:value={rowCount}
        min="1"
        max="100"
        onchange={generateData}
        class="w-20 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
      />
    </div>

    {#if generatedData.length > 0}
      <button
        onclick={copyAsJson}
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
      >
        {#if copied}
          <Check class="w-4 h-4 text-green-500" />
          <span class="text-green-500">Copied!</span>
        {:else}
          <Copy class="w-4 h-4" />
          Copy JSON
        {/if}
      </button>
    {/if}
  </div>

  <!-- Fields Config -->
  <div class="mb-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">Fields</h3>
      <button
        onclick={addField}
        class="flex items-center gap-1 text-sm text-accent-500 hover:text-accent-600 transition-colors"
      >
        <Plus class="w-4 h-4" />
        Add Field
      </button>
    </div>

    <div class="space-y-2">
      {#each selectedFields as field (field.id)}
        <div class="flex items-center gap-2">
          <input
            type="text"
            bind:value={field.name}
            placeholder="Field name"
            class="w-32 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
          />
          <Select
            value={field.type}
            groups={fieldGroups}
            onchange={(value) => updateFieldType(field.id, value)}
            class="flex-1"
          />
          <button
            onclick={() => removeField(field.id)}
            disabled={selectedFields.length <= 1}
            class={cn(
              "p-1.5 rounded-lg transition-colors",
              selectedFields.length > 1
                ? "hover:bg-red-500/10 text-slate-400 hover:text-red-500"
                : "text-slate-300 dark:text-slate-600 cursor-not-allowed"
            )}
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      {/each}
    </div>
  </div>

  <!-- Data Table -->
  <div class="flex-1 overflow-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
    {#if generatedData.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-slate-400">
        <Sparkles class="w-10 h-10 mb-2 opacity-50" />
        <p class="text-sm">Click Generate to create fake data</p>
      </div>
    {:else}
      <div class="overflow-auto h-full">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12">#</th>
              {#each selectedFields as field}
                <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {field.name}
                </th>
              {/each}
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            {#each generatedData as row, i}
              <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="px-4 py-2 text-slate-400 dark:text-slate-500 font-mono text-xs">{i + 1}</td>
                {#each selectedFields as field}
                  <td class="px-4 py-2 text-slate-700 dark:text-slate-300 font-mono">
                    {row[field.name]}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
