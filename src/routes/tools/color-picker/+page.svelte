<script lang="ts">
	import { Pipette, Copy, Check, Plus, Trash2 } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { Store } from '@tauri-apps/plugin-store';
	import { invoke } from '@tauri-apps/api/core';

	interface SavedColor {
		hex: string;
		name?: string;
		savedAt: number;
	}

	interface ScreenCapture {
		image_data: string;
		width: number;
		height: number;
	}

	let currentColor = $state('#3b82f6');
	let hue = $state(217);
	let saturation = $state(91);
	let lightness = $state(60);
	let copiedField = $state<string | null>(null);
	let savedColors = $state<SavedColor[]>([]);
	let store: Store | null = null;

	// Screen picker state
	let showScreenPicker = $state(false);
	let screenshotData = $state<ScreenCapture | null>(null);
	let screenshotDataUrl = $state<string | null>(null);
	let cursorPos = $state({ x: 0, y: 0 });
	let zoomCanvas: HTMLCanvasElement | null = null;
	let screenshotImg: HTMLImageElement | null = null;

	const quickColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#000000', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#ffffff'];

	onMount(async () => {
		// Load saved colors
		store = await Store.load('color-picker.json');
		const saved = await store.get<SavedColor[]>('colors');
		if (saved) savedColors = saved;
	});

	async function saveColors() {
		if (store) {
			await store.set('colors', savedColors);
			await store.save();
		}
	}

	function hslToHex(h: number, s: number, l: number): string {
		s /= 100;
		l /= 100;
		const a = s * Math.min(l, 1 - l);
		const f = (n: number) => {
			const k = (n + h / 30) % 12;
			const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
			return Math.round(255 * color)
				.toString(16)
				.padStart(2, '0');
		};
		return `#${f(0)}${f(8)}${f(4)}`;
	}

	function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		if (!result) return null;

		const r = parseInt(result[1], 16) / 255;
		const g = parseInt(result[2], 16) / 255;
		const b = parseInt(result[3], 16) / 255;

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

	function updateColor() {
		currentColor = hslToHex(hue, saturation, lightness);
	}

	function handleColorInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const hsl = hexToHsl(input.value);
		if (hsl) {
			hue = hsl.h;
			saturation = hsl.s;
			lightness = hsl.l;
			currentColor = input.value;
		}
	}

	function handleHexInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const value = input.value;
		if (/^#?[0-9A-Fa-f]{6}$/.test(value)) {
			const hex = value.startsWith('#') ? value : '#' + value;
			const hsl = hexToHsl(hex);
			if (hsl) {
				hue = hsl.h;
				saturation = hsl.s;
				lightness = hsl.l;
				currentColor = hex;
			}
		}
	}

	async function pickColor() {
		try {
			const capture = await invoke<ScreenCapture>('capture_all_screens');
			screenshotData = capture;
			screenshotDataUrl = `data:image/png;base64,${capture.image_data}`;
			showScreenPicker = true;
		} catch (e) {
			console.error('Screenshot capture failed:', e);
		}
	}

	function handleScreenshotMove(e: MouseEvent) {
		if (!screenshotImg) return;

		const rect = screenshotImg.getBoundingClientRect();
		cursorPos = { x: e.clientX, y: e.clientY };

		// Calculate image coordinates
		const scaleX = screenshotImg.naturalWidth / rect.width;
		const scaleY = screenshotImg.naturalHeight / rect.height;
		const imgX = Math.round((e.clientX - rect.left) * scaleX);
		const imgY = Math.round((e.clientY - rect.top) * scaleY);

		// Draw zoomed preview using canvas
		if (zoomCanvas && screenshotImg.complete) {
			const ctx = zoomCanvas.getContext('2d');
			if (ctx) {
				const zoomLevel = 8;
				const previewSize = 120;
				const sourceSize = previewSize / zoomLevel;

				ctx.imageSmoothingEnabled = false;
				ctx.clearRect(0, 0, previewSize, previewSize);
				ctx.drawImage(screenshotImg, imgX - sourceSize / 2, imgY - sourceSize / 2, sourceSize, sourceSize, 0, 0, previewSize, previewSize);

				// Draw crosshair
				ctx.strokeStyle = '#fff';
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(previewSize / 2, 0);
				ctx.lineTo(previewSize / 2, previewSize);
				ctx.moveTo(0, previewSize / 2);
				ctx.lineTo(previewSize, previewSize / 2);
				ctx.stroke();

				// Draw center pixel outline
				ctx.strokeStyle = '#000';
				ctx.strokeRect(previewSize / 2 - zoomLevel / 2, previewSize / 2 - zoomLevel / 2, zoomLevel, zoomLevel);
			}
		}
	}

	async function handleScreenshotClick(e: MouseEvent) {
		if (!screenshotData || !screenshotImg) return;

		const rect = screenshotImg.getBoundingClientRect();
		const scaleX = screenshotImg.naturalWidth / rect.width;
		const scaleY = screenshotImg.naturalHeight / rect.height;
		const x = Math.round((e.clientX - rect.left) * scaleX);
		const y = Math.round((e.clientY - rect.top) * scaleY);

		try {
			const hexColor = await invoke<string>('get_pixel_color', {
				imageData: screenshotData.image_data,
				x,
				y
			});

			const hsl = hexToHsl(hexColor);
			if (hsl) {
				hue = hsl.h;
				saturation = hsl.s;
				lightness = hsl.l;
				currentColor = hexColor;
			}
		} catch (e) {
			console.error('Color pick failed:', e);
		}

		closeScreenPicker();
	}

	function closeScreenPicker() {
		showScreenPicker = false;
		screenshotData = null;
		screenshotDataUrl = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeScreenPicker();
		}
	}

	async function copyValue(value: string, field: string) {
		await navigator.clipboard.writeText(value);
		copiedField = field;
		setTimeout(() => (copiedField = null), 2000);
	}

	async function saveCurrentColor() {
		if (!savedColors.some((c) => c.hex === currentColor)) {
			savedColors = [...savedColors, { hex: currentColor, savedAt: Date.now() }];
			await saveColors();
		}
	}

	async function removeColor(hex: string) {
		savedColors = savedColors.filter((c) => c.hex !== hex);
		await saveColors();
	}

	function loadColor(hex: string) {
		const hsl = hexToHsl(hex);
		if (hsl) {
			hue = hsl.h;
			saturation = hsl.s;
			lightness = hsl.l;
			currentColor = hex;
		}
	}

	function hexToRgb(hex: string): string {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		if (!result) return '';
		return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`;
	}

	function getContrastColor(hex: string): string {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		if (!result) return '#000000';
		const r = parseInt(result[1], 16);
		const g = parseInt(result[2], 16);
		const b = parseInt(result[3], 16);
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		return luminance > 0.5 ? '#000000' : '#ffffff';
	}

	// Reactive updates
	$effect(() => {
		updateColor();
	});

	const rgbString = $derived(hexToRgb(currentColor));
	const hslString = $derived(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
	const contrastColor = $derived(getContrastColor(currentColor));
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<Pipette class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Color Picker</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Visual color picker with eyedropper</p>
			</div>
		</div>

		<button onclick={pickColor} class="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-600">
			<Pipette class="h-4 w-4" />
			Pick from Screen
		</button>
	</div>

	<div class="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto lg:grid-cols-2">
		<!-- Left - Picker -->
		<div class="space-y-4">
			<!-- Color Preview -->
			<div class="flex h-48 items-center justify-center rounded-xl border border-slate-200 transition-colors dark:border-slate-700" style="background-color: {currentColor}">
				<span class="font-mono text-4xl font-bold" style="color: {contrastColor}">
					{currentColor}
				</span>
			</div>

			<!-- Color Picker Canvas -->
			<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
				<div class="space-y-4">
					<!-- Saturation/Lightness Picker -->
					<div class="relative">
						<div
							class="h-48 w-full cursor-crosshair rounded-lg"
							style="background: linear-gradient(to bottom, white, transparent, black),
                     linear-gradient(to right, gray, hsl({hue}, 100%, 50%));"
							onclick={(e) => {
								const rect = (e.target as HTMLElement).getBoundingClientRect();
								const x = e.clientX - rect.left;
								const y = e.clientY - rect.top;
								saturation = Math.round((x / rect.width) * 100);
								lightness = Math.round(100 - (y / rect.height) * 100);
							}}
						>
							<div
								class="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 transform rounded-full border-2 border-white shadow-lg"
								style="left: {saturation}%; top: {100 - lightness}%; background-color: {currentColor};"
							></div>
						</div>
					</div>

					<!-- Hue Slider -->
					<div>
						<label class="mb-1 block text-xs text-slate-500">Hue</label>
						<input
							type="range"
							min="0"
							max="360"
							bind:value={hue}
							class="h-4 w-full cursor-pointer appearance-none rounded-lg"
							style="background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);"
						/>
					</div>

					<!-- Native Color Picker -->
					<div>
						<label class="mb-1 block text-xs text-slate-500">Color Picker</label>
						<input type="color" value={currentColor} oninput={handleColorInput} class="h-12 w-full cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700" />
					</div>
				</div>
			</div>

			<!-- Values -->
			<div class="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
				<!-- HEX -->
				<div>
					<div class="mb-1 flex items-center justify-between">
						<label class="text-xs text-slate-500">HEX</label>
						<button onclick={() => copyValue(currentColor, 'hex')} class="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
							{#if copiedField === 'hex'}
								<Check class="h-3 w-3 text-green-500" />
							{:else}
								<Copy class="h-3 w-3" />
							{/if}
						</button>
					</div>
					<input
						type="text"
						value={currentColor}
						oninput={handleHexInput}
						class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
					/>
				</div>

				<!-- RGB -->
				<div>
					<div class="mb-1 flex items-center justify-between">
						<label class="text-xs text-slate-500">RGB</label>
						<button onclick={() => copyValue(rgbString, 'rgb')} class="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
							{#if copiedField === 'rgb'}
								<Check class="h-3 w-3 text-green-500" />
							{:else}
								<Copy class="h-3 w-3" />
							{/if}
						</button>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100">
						{rgbString}
					</div>
				</div>

				<!-- HSL -->
				<div>
					<div class="mb-1 flex items-center justify-between">
						<label class="text-xs text-slate-500">HSL</label>
						<button onclick={() => copyValue(hslString, 'hsl')} class="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
							{#if copiedField === 'hsl'}
								<Check class="h-3 w-3 text-green-500" />
							{:else}
								<Copy class="h-3 w-3" />
							{/if}
						</button>
					</div>
					<div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100">
						{hslString}
					</div>
				</div>
			</div>
		</div>

		<!-- Right - Saved Colors -->
		<div class="flex flex-col">
			<div class="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">Saved Colors</h3>
					<button onclick={saveCurrentColor} class="flex items-center gap-1 text-sm text-accent-500 transition-colors hover:text-accent-600">
						<Plus class="h-4 w-4" />
						Save Current
					</button>
				</div>

				{#if savedColors.length === 0}
					<div class="flex flex-1 items-center justify-center text-slate-400">
						<p class="text-sm">No saved colors yet</p>
					</div>
				{:else}
					<div class="grid grid-cols-4 gap-3 overflow-auto sm:grid-cols-5">
						{#each savedColors as color (color.hex)}
							<div class="group relative">
								<button
									onclick={() => loadColor(color.hex)}
									class="aspect-square w-full rounded-lg border border-slate-200 transition-transform hover:scale-105 dark:border-slate-700"
									style="background-color: {color.hex}"
									title={color.hex}
								></button>
								<button
									onclick={() => removeColor(color.hex)}
									class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
								>
									<Trash2 class="h-3 w-3" />
								</button>
								<p class="mt-1 truncate text-center font-mono text-xs text-slate-500">{color.hex}</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Quick Colors -->
			<div class="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
				<h3 class="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Quick Colors</h3>
				<div class="grid grid-cols-8 gap-2">
					{#each quickColors as quickColor, i (i)}
						<button
							onclick={() => loadColor(quickColor)}
							class="aspect-square rounded-lg border border-slate-200 transition-transform hover:scale-110 dark:border-slate-700"
							style="background-color: {quickColor}"
							title={quickColor}
						></button>
					{/each}
				</div>
			</div>

			<!-- Contrast Preview -->
			<div class="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
				<h3 class="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Contrast Preview</h3>
				<div class="grid grid-cols-2 gap-3">
					<div class="rounded-lg p-4 text-center" style="background-color: {currentColor}; color: white;">
						<p class="font-medium">White Text</p>
						<p class="text-xs opacity-80">on color</p>
					</div>
					<div class="rounded-lg p-4 text-center" style="background-color: {currentColor}; color: black;">
						<p class="font-medium">Black Text</p>
						<p class="text-xs opacity-80">on color</p>
					</div>
					<div class="rounded-lg border border-slate-200 bg-white p-4 text-center" style="color: {currentColor};">
						<p class="font-medium">Color Text</p>
						<p class="text-xs opacity-80">on white</p>
					</div>
					<div class="rounded-lg bg-slate-900 p-4 text-center" style="color: {currentColor};">
						<p class="font-medium">Color Text</p>
						<p class="text-xs opacity-80">on dark</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Screen Picker Modal -->
{#if showScreenPicker}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="fixed inset-0 z-50 flex cursor-crosshair items-center justify-center overflow-hidden bg-black" role="dialog" aria-modal="true" onkeydown={handleKeydown} tabindex="-1">
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<img
			bind:this={screenshotImg}
			src={screenshotDataUrl}
			alt="Screenshot - click to pick color"
			style="width: 100vw; height: 100vh; object-fit: contain;"
			onclick={handleScreenshotClick}
			onmousemove={handleScreenshotMove}
		/>

		<!-- Zoom Preview -->
		<div class="pointer-events-none fixed overflow-hidden rounded-lg border-2 border-white shadow-2xl" style="left: {cursorPos.x + 20}px; top: {cursorPos.y + 20}px;">
			<canvas bind:this={zoomCanvas} width="120" height="120" class="block bg-slate-800" />
		</div>

		<!-- ESC hint -->
		<div class="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-black/70 px-4 py-2 text-sm text-white">Press ESC to cancel</div>
	</div>
{/if}

<style>
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: white;
		border: 2px solid #64748b;
		cursor: pointer;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	input[type='range']::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: white;
		border: 2px solid #64748b;
		cursor: pointer;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}
</style>
