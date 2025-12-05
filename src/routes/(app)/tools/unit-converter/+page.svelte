<script lang="ts">
	import { Scale, ArrowRightLeft, Copy, Check, HardDrive, Ruler, Weight, Thermometer } from 'lucide-svelte';
	import Select from '$lib/components/ui/Select.svelte';

	type Category = 'bytes' | 'length' | 'weight' | 'temperature';

	let selectedCategory = $state<Category>('bytes');
	let inputValue = $state('1');
	let fromUnit = $state('');
	let toUnit = $state('');
	let copied = $state(false);

	const units: Record<Category, { name: string; units: { id: string; name: string; toBase: (v: number) => number; fromBase: (v: number) => number }[] }> = {
		bytes: {
			name: 'Digital Storage',
			units: [
				{ id: 'b', name: 'Bits', toBase: (v) => v / 8, fromBase: (v) => v * 8 },
				{ id: 'B', name: 'Bytes', toBase: (v) => v, fromBase: (v) => v },
				{ id: 'KB', name: 'Kilobytes', toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
				{ id: 'MB', name: 'Megabytes', toBase: (v) => v * 1024 ** 2, fromBase: (v) => v / 1024 ** 2 },
				{ id: 'GB', name: 'Gigabytes', toBase: (v) => v * 1024 ** 3, fromBase: (v) => v / 1024 ** 3 },
				{ id: 'TB', name: 'Terabytes', toBase: (v) => v * 1024 ** 4, fromBase: (v) => v / 1024 ** 4 },
				{ id: 'PB', name: 'Petabytes', toBase: (v) => v * 1024 ** 5, fromBase: (v) => v / 1024 ** 5 },
				{ id: 'KiB', name: 'Kibibytes (1000)', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
				{ id: 'MiB', name: 'Mebibytes (1000²)', toBase: (v) => v * 1000 ** 2, fromBase: (v) => v / 1000 ** 2 },
				{ id: 'GiB', name: 'Gibibytes (1000³)', toBase: (v) => v * 1000 ** 3, fromBase: (v) => v / 1000 ** 3 }
			]
		},
		length: {
			name: 'Length',
			units: [
				{ id: 'mm', name: 'Millimeters', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
				{ id: 'cm', name: 'Centimeters', toBase: (v) => v / 100, fromBase: (v) => v * 100 },
				{ id: 'm', name: 'Meters', toBase: (v) => v, fromBase: (v) => v },
				{ id: 'km', name: 'Kilometers', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
				{ id: 'in', name: 'Inches', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
				{ id: 'ft', name: 'Feet', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
				{ id: 'yd', name: 'Yards', toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
				{ id: 'mi', name: 'Miles', toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
				{ id: 'nmi', name: 'Nautical Miles', toBase: (v) => v * 1852, fromBase: (v) => v / 1852 }
			]
		},
		weight: {
			name: 'Weight',
			units: [
				{ id: 'mg', name: 'Milligrams', toBase: (v) => v / 1000000, fromBase: (v) => v * 1000000 },
				{ id: 'g', name: 'Grams', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
				{ id: 'kg', name: 'Kilograms', toBase: (v) => v, fromBase: (v) => v },
				{ id: 't', name: 'Metric Tons', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
				{ id: 'oz', name: 'Ounces', toBase: (v) => v * 0.0283495, fromBase: (v) => v / 0.0283495 },
				{ id: 'lb', name: 'Pounds', toBase: (v) => v * 0.453592, fromBase: (v) => v / 0.453592 },
				{ id: 'st', name: 'Stone', toBase: (v) => v * 6.35029, fromBase: (v) => v / 6.35029 }
			]
		},
		temperature: {
			name: 'Temperature',
			units: [
				{ id: 'C', name: 'Celsius', toBase: (v) => v, fromBase: (v) => v },
				{ id: 'F', name: 'Fahrenheit', toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
				{ id: 'K', name: 'Kelvin', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 }
			]
		}
	};

	const categories: { id: Category; name: string }[] = [
		{ id: 'bytes', name: 'Digital Storage' },
		{ id: 'length', name: 'Length' },
		{ id: 'weight', name: 'Weight' },
		{ id: 'temperature', name: 'Temperature' }
	];

	function getCategoryIcon(id: Category) {
		switch (id) {
			case 'bytes':
				return HardDrive;
			case 'length':
				return Ruler;
			case 'weight':
				return Weight;
			case 'temperature':
				return Thermometer;
		}
	}

	// Set default units when category changes
	$effect(() => {
		const categoryUnits = units[selectedCategory].units;
		if (!fromUnit || !categoryUnits.find((u) => u.id === fromUnit)) {
			fromUnit = categoryUnits[0].id;
		}
		if (!toUnit || !categoryUnits.find((u) => u.id === toUnit)) {
			toUnit = categoryUnits.length > 1 ? categoryUnits[1].id : categoryUnits[0].id;
		}
	});

	function convert(value: number, from: string, to: string): number {
		const categoryUnits = units[selectedCategory].units;
		const fromUnitDef = categoryUnits.find((u) => u.id === from);
		const toUnitDef = categoryUnits.find((u) => u.id === to);

		if (!fromUnitDef || !toUnitDef) return 0;

		const baseValue = fromUnitDef.toBase(value);
		return toUnitDef.fromBase(baseValue);
	}

	function formatNumber(num: number): string {
		if (Math.abs(num) < 0.000001 || Math.abs(num) > 999999999) {
			return num.toExponential(6);
		}
		return num.toLocaleString('en-US', { maximumFractionDigits: 10 });
	}

	function swapUnits() {
		const temp = fromUnit;
		fromUnit = toUnit;
		toUnit = temp;
	}

	async function copyResult() {
		const result = convert(parseFloat(inputValue) || 0, fromUnit, toUnit);
		await navigator.clipboard.writeText(formatNumber(result));
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	let result = $derived(convert(parseFloat(inputValue) || 0, fromUnit, toUnit));
	let currentUnits = $derived(units[selectedCategory].units);
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-3">
		<div class="rounded-lg bg-accent-500/10 p-2">
			<Scale class="h-6 w-6 text-accent-500" />
		</div>
		<div>
			<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Unit Converter</h1>
			<p class="text-sm text-slate-600 dark:text-slate-400">Convert between different units of measurement</p>
		</div>
	</div>

	<!-- Category Tabs -->
	<div class="mb-6 flex flex-wrap gap-2">
		{#each categories as category, i (i)}
			{@const Icon = getCategoryIcon(category.id)}
			<button
				onclick={() => (selectedCategory = category.id)}
				class="flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors {selectedCategory === category.id
					? 'bg-accent-500 text-white'
					: 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}"
			>
				<Icon class="h-4 w-4" />
				{category.name}
			</button>
		{/each}
	</div>

	<!-- Converter -->
	<div class="max-w-2xl">
		<div class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
			<div class="grid grid-cols-[1fr,auto,1fr] items-end gap-4">
				<!-- From -->
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">From</label>
					<Select value={fromUnit} options={currentUnits.map((u) => ({ value: u.id, label: `${u.name} (${u.id})` }))} onchange={(v) => (fromUnit = v)} class="mb-2" />
					<input
						type="number"
						bind:value={inputValue}
						class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-lg text-slate-900 focus:ring-2 focus:ring-accent-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
					/>
				</div>

				<!-- Swap button -->
				<button onclick={swapUnits} class="mb-2 rounded-lg bg-slate-100 p-3 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
					<ArrowRightLeft class="h-5 w-5" />
				</button>

				<!-- To -->
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">To</label>
					<Select value={toUnit} options={currentUnits.map((u) => ({ value: u.id, label: `${u.name} (${u.id})` }))} onchange={(v) => (toUnit = v)} class="mb-2" />
					<div class="relative">
						<div class="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-lg text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100">
							{formatNumber(result)}
						</div>
						<button onclick={copyResult} class="absolute top-1/2 right-2 -translate-y-1/2 rounded p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
							{#if copied}
								<Check class="h-4 w-4 text-green-500" />
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</button>
					</div>
				</div>
			</div>

			<!-- Formula display -->
			<div class="mt-4 border-t border-slate-200 pt-4 text-center text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
				{inputValue || '0'}
				{fromUnit} = {formatNumber(result)}
				{toUnit}
			</div>
		</div>

		<!-- Quick reference -->
		<div class="mt-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
			<h3 class="mb-3 font-semibold text-slate-900 dark:text-slate-100">Quick Reference</h3>
			<div class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
				{#each currentUnits as unit, i (i)}
					<div class="flex justify-between text-slate-600 dark:text-slate-400">
						<span>{unit.name}</span>
						<span class="font-mono text-slate-900 dark:text-slate-100">{unit.id}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
