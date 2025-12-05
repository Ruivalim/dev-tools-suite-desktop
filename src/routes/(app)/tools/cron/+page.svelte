<script lang="ts">
	import { Clock, Play, Calendar, AlertCircle, Copy, Check } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';
	import { SvelteDate } from 'svelte/reactivity';

	let expression = $state('0 9 * * 1-5');
	let copied = $state(false);

	// Cron field definitions
	const fields = [
		{ name: 'Minute', min: 0, max: 59, index: 0 },
		{ name: 'Hour', min: 0, max: 23, index: 1 },
		{ name: 'Day of Month', min: 1, max: 31, index: 2 },
		{ name: 'Month', min: 1, max: 12, index: 3 },
		{ name: 'Day of Week', min: 0, max: 6, index: 4 }
	];

	const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	const presets = [
		{ label: 'Every minute', value: '* * * * *' },
		{ label: 'Every hour', value: '0 * * * *' },
		{ label: 'Every day at midnight', value: '0 0 * * *' },
		{ label: 'Every day at 9am', value: '0 9 * * *' },
		{ label: 'Every Monday at 9am', value: '0 9 * * 1' },
		{ label: 'Weekdays at 9am', value: '0 9 * * 1-5' },
		{ label: 'Every Sunday at midnight', value: '0 0 * * 0' },
		{ label: 'First day of month', value: '0 0 1 * *' },
		{ label: 'Every 15 minutes', value: '*/15 * * * *' },
		{ label: 'Every 6 hours', value: '0 */6 * * *' }
	];

	function parseCronPart(part: string, min: number, max: number): number[] | null {
		const values: number[] = [];

		if (part === '*') {
			for (let i = min; i <= max; i++) values.push(i);
			return values;
		}

		const segments = part.split(',');
		for (const segment of segments) {
			// Handle step values like */5 or 1-10/2
			if (segment.includes('/')) {
				const [range, stepStr] = segment.split('/');
				const step = parseInt(stepStr);
				if (isNaN(step) || step <= 0) return null;

				let start = min,
					end = max;
				if (range !== '*') {
					if (range.includes('-')) {
						const [s, e] = range.split('-').map(Number);
						if (isNaN(s) || isNaN(e)) return null;
						start = s;
						end = e;
					} else {
						start = parseInt(range);
						if (isNaN(start)) return null;
						end = max;
					}
				}
				for (let i = start; i <= end; i += step) values.push(i);
			}
			// Handle ranges like 1-5
			else if (segment.includes('-')) {
				const [start, end] = segment.split('-').map(Number);
				if (isNaN(start) || isNaN(end) || start > end) return null;
				for (let i = start; i <= end; i++) values.push(i);
			}
			// Handle single values
			else {
				const val = parseInt(segment);
				if (isNaN(val) || val < min || val > max) return null;
				values.push(val);
			}
		}

		return [...new Set(values)].sort((a, b) => a - b);
	}

	function parseCron(expr: string): { parts: (number[] | null)[]; valid: boolean } {
		const parts = expr.trim().split(/\s+/);
		if (parts.length !== 5) {
			return { parts: [], valid: false };
		}

		const parsed = parts.map((part, i) => parseCronPart(part, fields[i].min, fields[i].max));
		return {
			parts: parsed,
			valid: parsed.every((p) => p !== null)
		};
	}

	function getHumanReadable(expr: string): string {
		const { parts, valid } = parseCron(expr);
		if (!valid) return 'Invalid cron expression';

		const [minutes, hours, days, months, weekdays] = parts as number[][];

		let description = 'At ';

		// Time
		if (minutes.length === 60 && hours.length === 24) {
			description = 'Every minute';
		} else if (minutes.length === 60) {
			description = `Every minute during hour${hours.length > 1 ? 's' : ''} ${hours.join(', ')}`;
		} else if (hours.length === 24) {
			description = `At minute${minutes.length > 1 ? 's' : ''} ${minutes.join(', ')} of every hour`;
		} else {
			const timeStrings = [];
			for (const h of hours) {
				for (const m of minutes) {
					const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
					const ampm = h < 12 ? 'AM' : 'PM';
					timeStrings.push(`${hour12}:${m.toString().padStart(2, '0')} ${ampm}`);
				}
			}
			if (timeStrings.length <= 3) {
				description = `At ${timeStrings.join(', ')}`;
			} else {
				description = `At ${minutes.join(', ')} minutes past hour${hours.length > 1 ? 's' : ''} ${hours.join(', ')}`;
			}
		}

		// Days
		const allDays = days.length === 31;
		const allWeekdays = weekdays.length === 7;
		const allMonths = months.length === 12;

		if (!allDays && !allWeekdays) {
			description += `, on day${days.length > 1 ? 's' : ''} ${days.join(', ')} of the month`;
			if (weekdays.length < 7) {
				description += ` and on ${weekdays.map((d) => dayNames[d]).join(', ')}`;
			}
		} else if (!allWeekdays) {
			description += `, on ${weekdays.map((d) => dayNames[d]).join(', ')}`;
		} else if (!allDays) {
			description += `, on day${days.length > 1 ? 's' : ''} ${days.join(', ')} of the month`;
		}

		if (!allMonths) {
			description += `, in ${months.map((m) => monthNames[m]).join(', ')}`;
		}

		return description;
	}

	function getNextRuns(expr: string, count: number = 5): Date[] {
		const { parts, valid } = parseCron(expr);
		if (!valid) return [];

		const [minutes, hours, days, months, weekdays] = parts as number[][];
		const runs: Date[] = [];
		const now = new Date();
		let current = new SvelteDate(now);
		current.setSeconds(0);
		current.setMilliseconds(0);
		current.setMinutes(current.getMinutes() + 1);

		const maxIterations = 366 * 24 * 60; // Max 1 year of minutes
		let iterations = 0;

		while (runs.length < count && iterations < maxIterations) {
			iterations++;

			if (!months.includes(current.getMonth() + 1)) {
				current.setMonth(current.getMonth() + 1);
				current.setDate(1);
				current.setHours(0, 0, 0, 0);
				continue;
			}

			if (!days.includes(current.getDate()) && !weekdays.includes(current.getDay())) {
				current.setDate(current.getDate() + 1);
				current.setHours(0, 0, 0, 0);
				continue;
			}

			if (days.length < 31 && weekdays.length < 7) {
				// Both day of month and day of week are specified - OR logic
				if (!days.includes(current.getDate()) && !weekdays.includes(current.getDay())) {
					current.setDate(current.getDate() + 1);
					current.setHours(0, 0, 0, 0);
					continue;
				}
			} else {
				// Only one is specified
				if (days.length < 31 && !days.includes(current.getDate())) {
					current.setDate(current.getDate() + 1);
					current.setHours(0, 0, 0, 0);
					continue;
				}
				if (weekdays.length < 7 && !weekdays.includes(current.getDay())) {
					current.setDate(current.getDate() + 1);
					current.setHours(0, 0, 0, 0);
					continue;
				}
			}

			if (!hours.includes(current.getHours())) {
				current.setHours(current.getHours() + 1, 0, 0, 0);
				continue;
			}

			if (!minutes.includes(current.getMinutes())) {
				current.setMinutes(current.getMinutes() + 1);
				continue;
			}

			runs.push(new Date(current));
			current.setMinutes(current.getMinutes() + 1);
		}

		return runs;
	}

	const parsed = $derived(parseCron(expression));
	const humanReadable = $derived(getHumanReadable(expression));
	const nextRuns = $derived(getNextRuns(expression, 10));

	function formatDate(date: Date): string {
		return date.toLocaleString('pt-BR', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatRelative(date: Date): string {
		const now = new Date();
		const diff = date.getTime() - now.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
		if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
		if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
		return 'now';
	}

	async function copyExpression() {
		await navigator.clipboard.writeText(expression);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<Clock class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Cron Parser</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Parse and generate cron expressions</p>
			</div>
		</div>
	</div>

	<div class="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
		<!-- Left Panel - Input -->
		<div class="flex flex-col gap-4">
			<!-- Expression Input -->
			<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
				<label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"> Cron Expression </label>
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={expression}
						placeholder="* * * * *"
						class="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 font-mono text-lg text-slate-900 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
					/>
					<button
						onclick={copyExpression}
						class="rounded-lg border border-slate-200 px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
					>
						{#if copied}
							<Check class="h-5 w-5 text-green-500" />
						{:else}
							<Copy class="h-5 w-5" />
						{/if}
					</button>
				</div>

				<!-- Field Labels -->
				<div class="mt-3 grid grid-cols-5 gap-1 text-center text-xs text-slate-500 dark:text-slate-400">
					<span>Minute</span>
					<span>Hour</span>
					<span>Day (M)</span>
					<span>Month</span>
					<span>Day (W)</span>
				</div>
				<div class="mt-1 grid grid-cols-5 gap-1 text-center font-mono text-xs text-slate-400 dark:text-slate-500">
					<span>0-59</span>
					<span>0-23</span>
					<span>1-31</span>
					<span>1-12</span>
					<span>0-6</span>
				</div>
			</div>

			<!-- Presets -->
			<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
				<label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"> Common Presets </label>
				<div class="flex flex-wrap gap-2">
					{#each presets as preset (preset.value)}
						<button
							onclick={() => (expression = preset.value)}
							class={cn(
								'rounded-lg px-3 py-1.5 text-sm transition-colors',
								expression === preset.value ? 'bg-accent-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
							)}
						>
							{preset.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Syntax Reference -->
			<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
				<h3 class="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Syntax Reference</h3>
				<div class="space-y-2 text-sm">
					<div class="flex gap-3">
						<code class="w-16 font-mono text-accent-500">*</code>
						<span class="text-slate-600 dark:text-slate-400">Any value</span>
					</div>
					<div class="flex gap-3">
						<code class="w-16 font-mono text-accent-500">,</code>
						<span class="text-slate-600 dark:text-slate-400">Value list (1,3,5)</span>
					</div>
					<div class="flex gap-3">
						<code class="w-16 font-mono text-accent-500">-</code>
						<span class="text-slate-600 dark:text-slate-400">Range (1-5)</span>
					</div>
					<div class="flex gap-3">
						<code class="w-16 font-mono text-accent-500">/</code>
						<span class="text-slate-600 dark:text-slate-400">Step (*/15, 0-30/5)</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Right Panel - Output -->
		<div class="flex flex-col gap-4">
			<!-- Human Readable -->
			<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
				<div class="mb-3 flex items-center gap-2">
					<Play class="h-4 w-4 text-accent-500" />
					<h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">Human Readable</h3>
				</div>
				<p class={cn('text-lg', parsed.valid ? 'text-slate-900 dark:text-slate-100' : 'text-red-500')}>
					{humanReadable}
				</p>
			</div>

			<!-- Next Runs -->
			<div class="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
				<div class="mb-3 flex items-center gap-2">
					<Calendar class="h-4 w-4 text-accent-500" />
					<h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">Next Scheduled Runs</h3>
				</div>

				{#if !parsed.valid}
					<div class="flex items-center gap-2 text-red-500">
						<AlertCircle class="h-5 w-5" />
						<span>Invalid cron expression</span>
					</div>
				{:else if nextRuns.length === 0}
					<p class="text-slate-500">No upcoming runs found</p>
				{:else}
					<div class="flex-1 space-y-2 overflow-auto">
						{#each nextRuns as run, i (i)}
							<div class="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
								<div class="flex items-center gap-3">
									<span class="flex h-6 w-6 items-center justify-center rounded-full bg-accent-500/10 text-xs font-medium text-accent-500">
										{i + 1}
									</span>
									<span class="font-mono text-sm text-slate-900 dark:text-slate-100">
										{formatDate(run)}
									</span>
								</div>
								<span class="text-sm text-slate-500 dark:text-slate-400">
									{formatRelative(run)}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
