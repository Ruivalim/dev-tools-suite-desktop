<script lang="ts">
  import { ChevronDown, Search, Check } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn';

  interface Option {
    value: string;
    label: string;
  }

  interface OptGroup {
    label: string;
    options: Option[];
  }

  interface Props {
    value: string;
    options?: Option[];
    groups?: OptGroup[];
    placeholder?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    searchable?: boolean;
    class?: string;
    onchange?: (value: string) => void;
  }

  let {
    value = $bindable(),
    options = [],
    groups = [],
    placeholder = 'Select...',
    disabled = false,
    size = 'md',
    searchable = true,
    class: className = '',
    onchange
  }: Props = $props();

  let isOpen = $state(false);
  let searchQuery = $state('');
  let highlightedIndex = $state(0);
  let containerRef = $state<HTMLDivElement | null>(null);
  let searchInputRef = $state<HTMLInputElement | null>(null);

  // Get all options flattened
  const allOptions = $derived.by(() => {
    if (options.length > 0) return options;
    return groups.flatMap(g => g.options);
  });

  // Filter options based on search
  const filteredOptions = $derived.by(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(query));
  });

  const filteredGroups = $derived.by(() => {
    if (!searchQuery.trim()) return groups;
    const query = searchQuery.toLowerCase();
    return groups
      .map(group => ({
        ...group,
        options: group.options.filter(opt => opt.label.toLowerCase().includes(query))
      }))
      .filter(group => group.options.length > 0);
  });

  // Get all visible options for keyboard navigation
  const visibleOptions = $derived.by(() => {
    if (filteredOptions.length > 0) return filteredOptions;
    return filteredGroups.flatMap(g => g.options);
  });

  // Get current selected label
  const selectedLabel = $derived.by(() => {
    const found = allOptions.find(opt => opt.value === value);
    return found?.label || placeholder;
  });

  function selectOption(opt: Option) {
    value = opt.value;
    onchange?.(opt.value);
    closeDropdown();
  }

  function openDropdown() {
    if (disabled) return;
    isOpen = true;
    searchQuery = '';
    highlightedIndex = 0;
    setTimeout(() => searchInputRef?.focus(), 10);
  }

  function closeDropdown() {
    isOpen = false;
    searchQuery = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;
      case 'ArrowDown':
        e.preventDefault();
        highlightedIndex = Math.min(highlightedIndex + 1, visibleOptions.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        highlightedIndex = Math.max(highlightedIndex - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (visibleOptions[highlightedIndex]) {
          selectOption(visibleOptions[highlightedIndex]);
        }
        break;
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      closeDropdown();
    }
  }

  $effect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
</script>

<div bind:this={containerRef} class={cn('relative', className)}>
  <!-- Trigger Button -->
  <button
    type="button"
    {disabled}
    onclick={openDropdown}
    onkeydown={handleKeydown}
    class={cn(
      'appearance-none w-full rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-pointer transition-all pr-8 text-left',
      'border-slate-200 dark:border-slate-700',
      'hover:border-slate-300 dark:hover:border-slate-600',
      'focus:ring-2 focus:ring-accent-500 focus:border-transparent focus:outline-none',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      isOpen && 'ring-2 ring-accent-500 border-transparent',
      sizes[size]
    )}
  >
    <span class={cn(!value && 'text-slate-400')}>{selectedLabel}</span>
  </button>

  <ChevronDown
    class={cn(
      'absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-transform',
      isOpen && 'rotate-180',
      iconSizes[size]
    )}
  />

  <!-- Dropdown -->
  {#if isOpen}
    <div
      class="absolute z-50 mt-1 w-full min-w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden"
    >
      <!-- Search Input -->
      {#if searchable}
        <div class="p-2 border-b border-slate-200 dark:border-slate-700">
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              bind:this={searchInputRef}
              type="text"
              bind:value={searchQuery}
              onkeydown={handleKeydown}
              placeholder="Search..."
              class="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-transparent focus:outline-none"
            />
          </div>
        </div>
      {/if}

      <!-- Options List -->
      <div class="max-h-60 overflow-y-auto">
        {#if filteredOptions.length > 0}
          {#each filteredOptions as opt, i}
            {@const isHighlighted = highlightedIndex === i}
            {@const isSelected = opt.value === value}
            <button
              type="button"
              onclick={() => selectOption(opt)}
              onmouseenter={() => highlightedIndex = i}
              class={cn(
                'w-full px-3 py-2 text-sm text-left flex items-center justify-between gap-2 transition-colors',
                isHighlighted && 'bg-slate-100 dark:bg-slate-800',
                isSelected && 'text-accent-500 font-medium',
                !isHighlighted && !isSelected && 'text-slate-700 dark:text-slate-300'
              )}
            >
              <span>{opt.label}</span>
              {#if isSelected}
                <Check class="w-4 h-4 text-accent-500 flex-shrink-0" />
              {/if}
            </button>
          {/each}
        {:else if filteredGroups.length > 0}
          {@const flatIndex = { current: 0 }}
          {#each filteredGroups as group}
            <div class="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
              {group.label}
            </div>
            {#each group.options as opt}
              {@const currentIndex = flatIndex.current++}
              {@const isHighlighted = highlightedIndex === currentIndex}
              {@const isSelected = opt.value === value}
              <button
                type="button"
                onclick={() => selectOption(opt)}
                onmouseenter={() => highlightedIndex = currentIndex}
                class={cn(
                  'w-full px-3 py-2 text-sm text-left flex items-center justify-between gap-2 transition-colors',
                  isHighlighted && 'bg-slate-100 dark:bg-slate-800',
                  isSelected && 'text-accent-500 font-medium',
                  !isHighlighted && !isSelected && 'text-slate-700 dark:text-slate-300'
                )}
              >
                <span>{opt.label}</span>
                {#if isSelected}
                  <Check class="w-4 h-4 text-accent-500 flex-shrink-0" />
                {/if}
              </button>
            {/each}
          {/each}
        {:else}
          <div class="px-3 py-4 text-sm text-slate-400 text-center">
            No results found
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
