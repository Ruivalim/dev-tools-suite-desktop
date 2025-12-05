<script lang="ts">
	import { KeyRound, Copy, Check, RefreshCw, Trash2 } from 'lucide-svelte';

	let password = $state('');
	let copied = $state(false);
	let history = $state<string[]>([]);

	// Options
	let length = $state(16);
	let includeUppercase = $state(true);
	let includeLowercase = $state(true);
	let includeNumbers = $state(true);
	let includeSymbols = $state(true);
	let excludeAmbiguous = $state(false);
	let pronounceable = $state(false);

	const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
	const NUMBERS = '0123456789';
	const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
	const AMBIGUOUS = 'il1Lo0O';

	const CONSONANTS = 'bcdfghjklmnpqrstvwxyz';
	const VOWELS = 'aeiou';

	function generatePassword() {
		if (pronounceable) {
			password = generatePronounceable();
		} else {
			password = generateRandom();
		}
		history = [password, ...history.slice(0, 9)];
	}

	function generateRandom(): string {
		let charset = '';

		if (includeUppercase) charset += UPPERCASE;
		if (includeLowercase) charset += LOWERCASE;
		if (includeNumbers) charset += NUMBERS;
		if (includeSymbols) charset += SYMBOLS;

		if (excludeAmbiguous) {
			charset = charset
				.split('')
				.filter((c) => !AMBIGUOUS.includes(c))
				.join('');
		}

		if (!charset) {
			charset = LOWERCASE;
		}

		let result = '';
		const array = new Uint32Array(length);
		crypto.getRandomValues(array);

		for (let i = 0; i < length; i++) {
			result += charset[array[i] % charset.length];
		}

		return result;
	}

	function generatePronounceable(): string {
		let result = '';
		const array = new Uint32Array(length);
		crypto.getRandomValues(array);

		for (let i = 0; i < length; i++) {
			if (i % 2 === 0) {
				result += CONSONANTS[array[i] % CONSONANTS.length];
			} else {
				result += VOWELS[array[i] % VOWELS.length];
			}
		}

		// Optionally capitalize first letter
		if (includeUppercase) {
			result = result.charAt(0).toUpperCase() + result.slice(1);
		}

		// Optionally add number at end
		if (includeNumbers && length > 2) {
			const num = array[length - 1] % 100;
			result = result.slice(0, -2) + num.toString().padStart(2, '0');
		}

		return result;
	}

	function getStrength(pw: string): { label: string; color: string; percent: number } {
		let score = 0;

		if (pw.length >= 8) score++;
		if (pw.length >= 12) score++;
		if (pw.length >= 16) score++;
		if (/[a-z]/.test(pw)) score++;
		if (/[A-Z]/.test(pw)) score++;
		if (/[0-9]/.test(pw)) score++;
		if (/[^a-zA-Z0-9]/.test(pw)) score++;

		if (score <= 2) return { label: 'Weak', color: 'bg-red-500', percent: 25 };
		if (score <= 4) return { label: 'Fair', color: 'bg-yellow-500', percent: 50 };
		if (score <= 5) return { label: 'Good', color: 'bg-blue-500', percent: 75 };
		return { label: 'Strong', color: 'bg-green-500', percent: 100 };
	}

	async function copyPassword(pw: string = password) {
		if (!pw) return;
		await navigator.clipboard.writeText(pw);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function clearHistory() {
		history = [];
	}

	// Generate on mount
	$effect(() => {
		if (!password) generatePassword();
	});

	let strength = $derived(getStrength(password));
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-3">
		<div class="rounded-lg bg-accent-500/10 p-2">
			<KeyRound class="h-6 w-6 text-accent-500" />
		</div>
		<div>
			<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Password Generator</h1>
			<p class="text-sm text-slate-600 dark:text-slate-400">Generate secure passwords with customizable options</p>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Main panel -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Password display -->
			<div class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
				<div class="mb-4 flex items-center gap-4">
					<div class="flex-1 rounded-lg bg-slate-100 p-4 font-mono text-lg break-all dark:bg-slate-800">
						{password || 'Click generate'}
					</div>
					<div class="flex flex-col gap-2">
						<button onclick={() => generatePassword()} class="rounded-lg bg-accent-500 p-3 text-white hover:bg-accent-600" title="Generate new password">
							<RefreshCw class="h-5 w-5" />
						</button>
						<button
							onclick={() => copyPassword()}
							disabled={!password}
							class="rounded-lg bg-slate-200 p-3 text-slate-700 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
							title="Copy to clipboard"
						>
							{#if copied}
								<Check class="h-5 w-5 text-green-500" />
							{:else}
								<Copy class="h-5 w-5" />
							{/if}
						</button>
					</div>
				</div>

				<!-- Strength meter -->
				<div class="flex items-center gap-3">
					<div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
						<div class="h-full transition-all duration-300 {strength.color}" style="width: {strength.percent}%"></div>
					</div>
					<span class="w-16 text-sm font-medium text-slate-600 dark:text-slate-400">{strength.label}</span>
				</div>
			</div>

			<!-- Options -->
			<div class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
				<h2 class="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Options</h2>

				<!-- Length slider -->
				<div class="mb-6">
					<div class="mb-2 flex items-center justify-between">
						<label class="text-sm font-medium text-slate-700 dark:text-slate-300">Length</label>
						<span class="font-mono text-sm text-slate-600 dark:text-slate-400">{length}</span>
					</div>
					<input type="range" bind:value={length} min="4" max="64" class="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-accent-500 dark:bg-slate-700" />
					<div class="mt-1 flex justify-between text-xs text-slate-500">
						<span>4</span>
						<span>64</span>
					</div>
				</div>

				<!-- Character options -->
				<div class="grid grid-cols-2 gap-4">
					<label class="flex cursor-pointer items-center gap-3">
						<input type="checkbox" bind:checked={includeUppercase} disabled={pronounceable} class="h-4 w-4 rounded border-slate-300 text-accent-500 focus:ring-accent-500" />
						<span class="text-sm text-slate-700 dark:text-slate-300">Uppercase (A-Z)</span>
					</label>

					<label class="flex cursor-pointer items-center gap-3">
						<input type="checkbox" bind:checked={includeLowercase} disabled={pronounceable} class="h-4 w-4 rounded border-slate-300 text-accent-500 focus:ring-accent-500" />
						<span class="text-sm text-slate-700 dark:text-slate-300">Lowercase (a-z)</span>
					</label>

					<label class="flex cursor-pointer items-center gap-3">
						<input type="checkbox" bind:checked={includeNumbers} class="h-4 w-4 rounded border-slate-300 text-accent-500 focus:ring-accent-500" />
						<span class="text-sm text-slate-700 dark:text-slate-300">Numbers (0-9)</span>
					</label>

					<label class="flex cursor-pointer items-center gap-3">
						<input type="checkbox" bind:checked={includeSymbols} disabled={pronounceable} class="h-4 w-4 rounded border-slate-300 text-accent-500 focus:ring-accent-500" />
						<span class="text-sm text-slate-700 dark:text-slate-300">Symbols (!@#$...)</span>
					</label>

					<label class="flex cursor-pointer items-center gap-3">
						<input type="checkbox" bind:checked={excludeAmbiguous} disabled={pronounceable} class="h-4 w-4 rounded border-slate-300 text-accent-500 focus:ring-accent-500" />
						<span class="text-sm text-slate-700 dark:text-slate-300">Exclude ambiguous (il1Lo0O)</span>
					</label>

					<label class="flex cursor-pointer items-center gap-3">
						<input type="checkbox" bind:checked={pronounceable} class="h-4 w-4 rounded border-slate-300 text-accent-500 focus:ring-accent-500" />
						<span class="text-sm text-slate-700 dark:text-slate-300">Pronounceable</span>
					</label>
				</div>
			</div>
		</div>

		<!-- History panel -->
		<div class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">History</h2>
				{#if history.length > 0}
					<button onclick={clearHistory} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
						<Trash2 class="h-4 w-4" />
					</button>
				{/if}
			</div>

			{#if history.length === 0}
				<p class="text-sm text-slate-500 dark:text-slate-400">No passwords generated yet</p>
			{:else}
				<div class="space-y-2">
					{#each history as pw, i (i)}
						<button
							onclick={() => copyPassword(pw)}
							class="w-full truncate rounded-lg bg-slate-50 p-2 text-left font-mono text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
							title="Click to copy"
						>
							{pw}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
