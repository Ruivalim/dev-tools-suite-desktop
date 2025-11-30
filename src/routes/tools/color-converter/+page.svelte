<script lang="ts">
	import { Palette, Copy, Check, RefreshCw } from 'lucide-svelte';

	interface RGB {
		r: number;
		g: number;
		b: number;
	}
	interface HSL {
		h: number;
		s: number;
		l: number;
	}

	let hexValue = $state('#3b82f6');
	let rgbValue = $state({ r: 59, g: 130, b: 246 });
	let hslValue = $state({ h: 217, s: 91, l: 60 });
	let copiedField = $state<string | null>(null);

	// Tailwind color palette
	const tailwindColors: Record<string, Record<string, string>> = {
		slate: {
			'50': '#f8fafc',
			'100': '#f1f5f9',
			'200': '#e2e8f0',
			'300': '#cbd5e1',
			'400': '#94a3b8',
			'500': '#64748b',
			'600': '#475569',
			'700': '#334155',
			'800': '#1e293b',
			'900': '#0f172a',
			'950': '#020617'
		},
		gray: {
			'50': '#f9fafb',
			'100': '#f3f4f6',
			'200': '#e5e7eb',
			'300': '#d1d5db',
			'400': '#9ca3af',
			'500': '#6b7280',
			'600': '#4b5563',
			'700': '#374151',
			'800': '#1f2937',
			'900': '#111827',
			'950': '#030712'
		},
		red: {
			'50': '#fef2f2',
			'100': '#fee2e2',
			'200': '#fecaca',
			'300': '#fca5a5',
			'400': '#f87171',
			'500': '#ef4444',
			'600': '#dc2626',
			'700': '#b91c1c',
			'800': '#991b1b',
			'900': '#7f1d1d',
			'950': '#450a0a'
		},
		orange: {
			'50': '#fff7ed',
			'100': '#ffedd5',
			'200': '#fed7aa',
			'300': '#fdba74',
			'400': '#fb923c',
			'500': '#f97316',
			'600': '#ea580c',
			'700': '#c2410c',
			'800': '#9a3412',
			'900': '#7c2d12',
			'950': '#431407'
		},
		amber: {
			'50': '#fffbeb',
			'100': '#fef3c7',
			'200': '#fde68a',
			'300': '#fcd34d',
			'400': '#fbbf24',
			'500': '#f59e0b',
			'600': '#d97706',
			'700': '#b45309',
			'800': '#92400e',
			'900': '#78350f',
			'950': '#451a03'
		},
		yellow: {
			'50': '#fefce8',
			'100': '#fef9c3',
			'200': '#fef08a',
			'300': '#fde047',
			'400': '#facc15',
			'500': '#eab308',
			'600': '#ca8a04',
			'700': '#a16207',
			'800': '#854d0e',
			'900': '#713f12',
			'950': '#422006'
		},
		lime: {
			'50': '#f7fee7',
			'100': '#ecfccb',
			'200': '#d9f99d',
			'300': '#bef264',
			'400': '#a3e635',
			'500': '#84cc16',
			'600': '#65a30d',
			'700': '#4d7c0f',
			'800': '#3f6212',
			'900': '#365314',
			'950': '#1a2e05'
		},
		green: {
			'50': '#f0fdf4',
			'100': '#dcfce7',
			'200': '#bbf7d0',
			'300': '#86efac',
			'400': '#4ade80',
			'500': '#22c55e',
			'600': '#16a34a',
			'700': '#15803d',
			'800': '#166534',
			'900': '#14532d',
			'950': '#052e16'
		},
		emerald: {
			'50': '#ecfdf5',
			'100': '#d1fae5',
			'200': '#a7f3d0',
			'300': '#6ee7b7',
			'400': '#34d399',
			'500': '#10b981',
			'600': '#059669',
			'700': '#047857',
			'800': '#065f46',
			'900': '#064e3b',
			'950': '#022c22'
		},
		teal: {
			'50': '#f0fdfa',
			'100': '#ccfbf1',
			'200': '#99f6e4',
			'300': '#5eead4',
			'400': '#2dd4bf',
			'500': '#14b8a6',
			'600': '#0d9488',
			'700': '#0f766e',
			'800': '#115e59',
			'900': '#134e4a',
			'950': '#042f2e'
		},
		cyan: {
			'50': '#ecfeff',
			'100': '#cffafe',
			'200': '#a5f3fc',
			'300': '#67e8f9',
			'400': '#22d3ee',
			'500': '#06b6d4',
			'600': '#0891b2',
			'700': '#0e7490',
			'800': '#155e75',
			'900': '#164e63',
			'950': '#083344'
		},
		sky: {
			'50': '#f0f9ff',
			'100': '#e0f2fe',
			'200': '#bae6fd',
			'300': '#7dd3fc',
			'400': '#38bdf8',
			'500': '#0ea5e9',
			'600': '#0284c7',
			'700': '#0369a1',
			'800': '#075985',
			'900': '#0c4a6e',
			'950': '#082f49'
		},
		blue: {
			'50': '#eff6ff',
			'100': '#dbeafe',
			'200': '#bfdbfe',
			'300': '#93c5fd',
			'400': '#60a5fa',
			'500': '#3b82f6',
			'600': '#2563eb',
			'700': '#1d4ed8',
			'800': '#1e40af',
			'900': '#1e3a8a',
			'950': '#172554'
		},
		indigo: {
			'50': '#eef2ff',
			'100': '#e0e7ff',
			'200': '#c7d2fe',
			'300': '#a5b4fc',
			'400': '#818cf8',
			'500': '#6366f1',
			'600': '#4f46e5',
			'700': '#4338ca',
			'800': '#3730a3',
			'900': '#312e81',
			'950': '#1e1b4b'
		},
		violet: {
			'50': '#f5f3ff',
			'100': '#ede9fe',
			'200': '#ddd6fe',
			'300': '#c4b5fd',
			'400': '#a78bfa',
			'500': '#8b5cf6',
			'600': '#7c3aed',
			'700': '#6d28d9',
			'800': '#5b21b6',
			'900': '#4c1d95',
			'950': '#2e1065'
		},
		purple: {
			'50': '#faf5ff',
			'100': '#f3e8ff',
			'200': '#e9d5ff',
			'300': '#d8b4fe',
			'400': '#c084fc',
			'500': '#a855f7',
			'600': '#9333ea',
			'700': '#7e22ce',
			'800': '#6b21a8',
			'900': '#581c87',
			'950': '#3b0764'
		},
		fuchsia: {
			'50': '#fdf4ff',
			'100': '#fae8ff',
			'200': '#f5d0fe',
			'300': '#f0abfc',
			'400': '#e879f9',
			'500': '#d946ef',
			'600': '#c026d3',
			'700': '#a21caf',
			'800': '#86198f',
			'900': '#701a75',
			'950': '#4a044e'
		},
		pink: {
			'50': '#fdf2f8',
			'100': '#fce7f3',
			'200': '#fbcfe8',
			'300': '#f9a8d4',
			'400': '#f472b6',
			'500': '#ec4899',
			'600': '#db2777',
			'700': '#be185d',
			'800': '#9d174d',
			'900': '#831843',
			'950': '#500724'
		},
		rose: {
			'50': '#fff1f2',
			'100': '#ffe4e6',
			'200': '#fecdd3',
			'300': '#fda4af',
			'400': '#fb7185',
			'500': '#f43f5e',
			'600': '#e11d48',
			'700': '#be123c',
			'800': '#9f1239',
			'900': '#881337',
			'950': '#4c0519'
		}
	};

	function hexToRgb(hex: string): RGB | null {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16)
				}
			: null;
	}

	function rgbToHex(rgb: RGB): string {
		return (
			'#' +
			[rgb.r, rgb.g, rgb.b]
				.map((x) =>
					Math.max(0, Math.min(255, Math.round(x)))
						.toString(16)
						.padStart(2, '0')
				)
				.join('')
		);
	}

	function rgbToHsl(rgb: RGB): HSL {
		const r = rgb.r / 255;
		const g = rgb.g / 255;
		const b = rgb.b / 255;

		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		let h = 0,
			s = 0;
		const l = (max + min) / 2;

		if (max !== min) {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

			switch (max) {
				case r:
					h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
					break;
				case g:
					h = ((b - r) / d + 2) / 6;
					break;
				case b:
					h = ((r - g) / d + 4) / 6;
					break;
			}
		}

		return {
			h: Math.round(h * 360),
			s: Math.round(s * 100),
			l: Math.round(l * 100)
		};
	}

	function hslToRgb(hsl: HSL): RGB {
		const h = hsl.h / 360;
		const s = hsl.s / 100;
		const l = hsl.l / 100;

		let r, g, b;

		if (s === 0) {
			r = g = b = l;
		} else {
			const hue2rgb = (p: number, q: number, t: number) => {
				if (t < 0) t += 1;
				if (t > 1) t -= 1;
				if (t < 1 / 6) return p + (q - p) * 6 * t;
				if (t < 1 / 2) return q;
				if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
				return p;
			};

			const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			const p = 2 * l - q;
			r = hue2rgb(p, q, h + 1 / 3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1 / 3);
		}

		return {
			r: Math.round(r * 255),
			g: Math.round(g * 255),
			b: Math.round(b * 255)
		};
	}

	function colorDistance(c1: RGB, c2: RGB): number {
		return Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2));
	}

	function findClosestTailwind(rgb: RGB): { name: string; shade: string; hex: string; distance: number } | null {
		let closest: { name: string; shade: string; hex: string; distance: number } | null = null;

		for (const [colorName, shades] of Object.entries(tailwindColors)) {
			for (const [shade, hex] of Object.entries(shades)) {
				const twRgb = hexToRgb(hex);
				if (twRgb) {
					const dist = colorDistance(rgb, twRgb);
					if (!closest || dist < closest.distance) {
						closest = { name: colorName, shade, hex, distance: dist };
					}
				}
			}
		}

		return closest;
	}

	function updateFromHex(hex: string) {
		const rgb = hexToRgb(hex);
		if (rgb) {
			hexValue = hex.startsWith('#') ? hex : '#' + hex;
			rgbValue = rgb;
			hslValue = rgbToHsl(rgb);
		}
	}

	function updateFromRgb(rgb: RGB) {
		rgbValue = rgb;
		hexValue = rgbToHex(rgb);
		hslValue = rgbToHsl(rgb);
	}

	function updateFromHsl(hsl: HSL) {
		hslValue = hsl;
		rgbValue = hslToRgb(hsl);
		hexValue = rgbToHex(rgbValue);
	}

	function handleHexInput(e: Event) {
		const input = (e.target as HTMLInputElement).value;
		if (/^#?[0-9A-Fa-f]{6}$/.test(input)) {
			updateFromHex(input);
		}
	}

	function handleColorPicker(e: Event) {
		const input = (e.target as HTMLInputElement).value;
		updateFromHex(input);
	}

	function generatePalette(baseHsl: HSL): HSL[] {
		const palette: HSL[] = [];
		const lightnesses = [95, 90, 80, 70, 60, 50, 40, 30, 20, 10, 5];

		for (const l of lightnesses) {
			palette.push({ h: baseHsl.h, s: baseHsl.s, l });
		}

		return palette;
	}

	function generateComplementary(hsl: HSL): HSL[] {
		return [hsl, { h: (hsl.h + 180) % 360, s: hsl.s, l: hsl.l }];
	}

	function generateTriadic(hsl: HSL): HSL[] {
		return [hsl, { h: (hsl.h + 120) % 360, s: hsl.s, l: hsl.l }, { h: (hsl.h + 240) % 360, s: hsl.s, l: hsl.l }];
	}

	function generateAnalogous(hsl: HSL): HSL[] {
		return [{ h: (hsl.h - 30 + 360) % 360, s: hsl.s, l: hsl.l }, hsl, { h: (hsl.h + 30) % 360, s: hsl.s, l: hsl.l }];
	}

	async function copyValue(value: string, field: string) {
		await navigator.clipboard.writeText(value);
		copiedField = field;
		setTimeout(() => (copiedField = null), 2000);
	}

	function randomColor() {
		const hex =
			'#' +
			Math.floor(Math.random() * 16777215)
				.toString(16)
				.padStart(6, '0');
		updateFromHex(hex);
	}

	const closestTailwind = $derived(findClosestTailwind(rgbValue));
	const palette = $derived(generatePalette(hslValue));
	const complementary = $derived(generateComplementary(hslValue));
	const triadic = $derived(generateTriadic(hslValue));
	const analogous = $derived(generateAnalogous(hslValue));

	const rgbString = $derived(`rgb(${rgbValue.r}, ${rgbValue.g}, ${rgbValue.b})`);
	const hslString = $derived(`hsl(${hslValue.h}, ${hslValue.s}%, ${hslValue.l}%)`);
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Header -->
	<div class="mb-4 flex flex-shrink-0 items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<Palette class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Color Converter</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Convert colors between HEX, RGB, HSL, and Tailwind</p>
			</div>
		</div>
		<button
			onclick={randomColor}
			class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
		>
			<RefreshCw class="h-4 w-4" />
			Random
		</button>
	</div>

	<div class="flex-1 overflow-auto">
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<!-- Color Preview & Inputs -->
			<div class="space-y-4">
				<!-- Color Preview -->
				<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
					<div class="flex gap-4">
						<div class="h-32 w-32 rounded-xl border border-slate-200 shadow-inner dark:border-slate-700" style="background-color: {hexValue}"></div>
						<div class="flex-1 space-y-3">
							<div>
								<label class="mb-1 block text-xs text-slate-500">Color Picker</label>
								<input type="color" value={hexValue} oninput={handleColorPicker} class="h-10 w-full cursor-pointer rounded-lg" />
							</div>
						</div>
					</div>
				</div>

				<!-- HEX -->
				<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
					<div class="mb-2 flex items-center justify-between">
						<label class="text-sm font-medium text-slate-700 dark:text-slate-300">HEX</label>
						<button onclick={() => copyValue(hexValue, 'hex')} class="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
							{#if copiedField === 'hex'}
								<Check class="h-4 w-4 text-green-500" />
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</button>
					</div>
					<input
						type="text"
						value={hexValue}
						oninput={handleHexInput}
						class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-slate-900 focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
					/>
				</div>

				<!-- RGB -->
				<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
					<div class="mb-2 flex items-center justify-between">
						<label class="text-sm font-medium text-slate-700 dark:text-slate-300">RGB</label>
						<button onclick={() => copyValue(rgbString, 'rgb')} class="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
							{#if copiedField === 'rgb'}
								<Check class="h-4 w-4 text-green-500" />
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</button>
					</div>
					<div class="grid grid-cols-3 gap-2">
						<div>
							<label class="mb-1 block text-xs text-slate-500">R</label>
							<input
								type="number"
								min="0"
								max="255"
								value={rgbValue.r}
								oninput={(e) => updateFromRgb({ ...rgbValue, r: parseInt((e.target as HTMLInputElement).value) || 0 })}
								class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs text-slate-500">G</label>
							<input
								type="number"
								min="0"
								max="255"
								value={rgbValue.g}
								oninput={(e) => updateFromRgb({ ...rgbValue, g: parseInt((e.target as HTMLInputElement).value) || 0 })}
								class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs text-slate-500">B</label>
							<input
								type="number"
								min="0"
								max="255"
								value={rgbValue.b}
								oninput={(e) => updateFromRgb({ ...rgbValue, b: parseInt((e.target as HTMLInputElement).value) || 0 })}
								class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
							/>
						</div>
					</div>
					<p class="mt-2 font-mono text-xs text-slate-500">{rgbString}</p>
				</div>

				<!-- HSL -->
				<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
					<div class="mb-2 flex items-center justify-between">
						<label class="text-sm font-medium text-slate-700 dark:text-slate-300">HSL</label>
						<button onclick={() => copyValue(hslString, 'hsl')} class="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
							{#if copiedField === 'hsl'}
								<Check class="h-4 w-4 text-green-500" />
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</button>
					</div>
					<div class="grid grid-cols-3 gap-2">
						<div>
							<label class="mb-1 block text-xs text-slate-500">H</label>
							<input
								type="number"
								min="0"
								max="360"
								value={hslValue.h}
								oninput={(e) => updateFromHsl({ ...hslValue, h: parseInt((e.target as HTMLInputElement).value) || 0 })}
								class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs text-slate-500">S</label>
							<input
								type="number"
								min="0"
								max="100"
								value={hslValue.s}
								oninput={(e) => updateFromHsl({ ...hslValue, s: parseInt((e.target as HTMLInputElement).value) || 0 })}
								class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs text-slate-500">L</label>
							<input
								type="number"
								min="0"
								max="100"
								value={hslValue.l}
								oninput={(e) => updateFromHsl({ ...hslValue, l: parseInt((e.target as HTMLInputElement).value) || 0 })}
								class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
							/>
						</div>
					</div>
					<p class="mt-2 font-mono text-xs text-slate-500">{hslString}</p>
				</div>

				<!-- Closest Tailwind -->
				{#if closestTailwind}
					<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
						<div class="mb-2 flex items-center justify-between">
							<label class="text-sm font-medium text-slate-700 dark:text-slate-300">Closest Tailwind</label>
							<button onclick={() => copyValue(`${closestTailwind.name}-${closestTailwind.shade}`, 'tailwind')} class="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
								{#if copiedField === 'tailwind'}
									<Check class="h-4 w-4 text-green-500" />
								{:else}
									<Copy class="h-4 w-4" />
								{/if}
							</button>
						</div>
						<div class="flex items-center gap-3">
							<div class="h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-700" style="background-color: {closestTailwind.hex}"></div>
							<div>
								<p class="font-mono text-slate-900 dark:text-slate-100">
									{closestTailwind.name}-{closestTailwind.shade}
								</p>
								<p class="text-xs text-slate-500">{closestTailwind.hex}</p>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Palettes -->
			<div class="space-y-4">
				<!-- Generated Palette -->
				<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
					<h3 class="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Shades Palette</h3>
					<div class="flex overflow-hidden rounded-lg">
						{#each palette as shade, i (i)}
							{@const rgb = hslToRgb(shade)}
							{@const hex = rgbToHex(rgb)}
							<button onclick={() => updateFromHsl(shade)} class="h-12 flex-1 transition-transform hover:z-10 hover:scale-110" style="background-color: {hex}" title={hex}></button>
						{/each}
					</div>
				</div>

				<!-- Complementary -->
				<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
					<h3 class="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Complementary</h3>
					<div class="flex gap-2">
						{#each complementary as color, i (i)}
							{@const rgb = hslToRgb(color)}
							{@const hex = rgbToHex(rgb)}
							<button
								onclick={() => updateFromHsl(color)}
								class="h-16 flex-1 rounded-lg border border-slate-200 transition-transform hover:scale-105 dark:border-slate-700"
								style="background-color: {hex}"
								title={hex}
							></button>
						{/each}
					</div>
				</div>

				<!-- Triadic -->
				<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
					<h3 class="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Triadic</h3>
					<div class="flex gap-2">
						{#each triadic as color, i (i)}
							{@const rgb = hslToRgb(color)}
							{@const hex = rgbToHex(rgb)}
							<button
								onclick={() => updateFromHsl(color)}
								class="h-16 flex-1 rounded-lg border border-slate-200 transition-transform hover:scale-105 dark:border-slate-700"
								style="background-color: {hex}"
								title={hex}
							></button>
						{/each}
					</div>
				</div>

				<!-- Analogous -->
				<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
					<h3 class="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Analogous</h3>
					<div class="flex gap-2">
						{#each analogous as color, i (i)}
							{@const rgb = hslToRgb(color)}
							{@const hex = rgbToHex(rgb)}
							<button
								onclick={() => updateFromHsl(color)}
								class="h-16 flex-1 rounded-lg border border-slate-200 transition-transform hover:scale-105 dark:border-slate-700"
								style="background-color: {hex}"
								title={hex}
							></button>
						{/each}
					</div>
				</div>

				<!-- Tailwind Palette Reference -->
				<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
					<h3 class="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Tailwind Colors</h3>
					<div class="max-h-64 space-y-2 overflow-auto">
						{#each Object.entries(tailwindColors) as [name, shades], i (i)}
							<div class="flex items-center gap-2">
								<span class="w-16 text-xs text-slate-500">{name}</span>
								<div class="flex flex-1 overflow-hidden rounded">
									{#each Object.entries(shades) as [shade, hex], j (`${i}-${j}`)}
										<button onclick={() => updateFromHex(hex)} class="h-6 flex-1 transition-opacity hover:opacity-80" style="background-color: {hex}" title="{name}-{shade}"></button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
