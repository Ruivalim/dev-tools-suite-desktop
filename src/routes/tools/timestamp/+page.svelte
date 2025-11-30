<script lang="ts">
	import { Timer, Copy, Check, RefreshCw, ArrowRightLeft } from 'lucide-svelte';
	import Select from '$lib/components/ui/Select.svelte';

	let unixTimestamp = $state(Math.floor(Date.now() / 1000).toString());
	let humanDate = $state('');
	let selectedTimezone = $state(Intl.DateTimeFormat().resolvedOptions().timeZone);
	let copiedField = $state<string | null>(null);
	let liveMode = $state(true);
	let currentTime = $state(Date.now());

	const commonTimezones = [
		{ value: 'UTC', label: 'UTC' },
		{ value: 'America/New_York', label: 'New York (EST/EDT)' },
		{ value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
		{ value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
		{ value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
		{ value: 'Europe/London', label: 'London (GMT/BST)' },
		{ value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
		{ value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
		{ value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
		{ value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
		{ value: 'Asia/Dubai', label: 'Dubai (GST)' },
		{ value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' }
	];

	// Live timer
	$effect(() => {
		if (liveMode) {
			const interval = setInterval(() => {
				currentTime = Date.now();
			}, 1000);
			return () => clearInterval(interval);
		}
	});

	// Update human date when timestamp changes
	$effect(() => {
		const ts = parseInt(unixTimestamp);
		if (!isNaN(ts)) {
			const date = new Date(ts * 1000);
			humanDate = formatDateForInput(date);
		}
	});

	function formatDateForInput(date: Date): string {
		const options: Intl.DateTimeFormatOptions = {
			timeZone: selectedTimezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		};

		const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(date);
		const get = (type: string) => parts.find((p) => p.type === type)?.value || '';

		return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
	}

	function formatDateDisplay(timestamp: number, tz: string): string {
		return new Date(timestamp * 1000).toLocaleString('pt-BR', {
			timeZone: tz,
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZoneName: 'short'
		});
	}

	function formatISO(timestamp: number): string {
		return new Date(timestamp * 1000).toISOString();
	}

	function formatRelative(timestamp: number): string {
		const now = Math.floor(Date.now() / 1000);
		const diff = timestamp - now;
		const absDiff = Math.abs(diff);
		const isPast = diff < 0;

		if (absDiff < 60) return isPast ? `${absDiff} seconds ago` : `in ${absDiff} seconds`;
		if (absDiff < 3600) {
			const mins = Math.floor(absDiff / 60);
			return isPast ? `${mins} minute${mins > 1 ? 's' : ''} ago` : `in ${mins} minute${mins > 1 ? 's' : ''}`;
		}
		if (absDiff < 86400) {
			const hours = Math.floor(absDiff / 3600);
			return isPast ? `${hours} hour${hours > 1 ? 's' : ''} ago` : `in ${hours} hour${hours > 1 ? 's' : ''}`;
		}
		if (absDiff < 2592000) {
			const days = Math.floor(absDiff / 86400);
			return isPast ? `${days} day${days > 1 ? 's' : ''} ago` : `in ${days} day${days > 1 ? 's' : ''}`;
		}
		const months = Math.floor(absDiff / 2592000);
		return isPast ? `${months} month${months > 1 ? 's' : ''} ago` : `in ${months} month${months > 1 ? 's' : ''}`;
	}

	function handleDateChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const dateStr = input.value;

		// Parse the datetime-local input
		const [datePart, timePart] = dateStr.split('T');
		const [year, month, day] = datePart.split('-').map(Number);
		const [hour, minute, second] = (timePart || '00:00:00').split(':').map(Number);

		// Create date in selected timezone
		const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second || 0));

		// Adjust for timezone offset
		const tzDate = new Date(date.toLocaleString('en-US', { timeZone: selectedTimezone }));
		const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
		const offset = utcDate.getTime() - tzDate.getTime();

		const adjustedDate = new Date(date.getTime() + offset);
		unixTimestamp = Math.floor(adjustedDate.getTime() / 1000).toString();
	}

	function setNow() {
		unixTimestamp = Math.floor(Date.now() / 1000).toString();
	}

	async function copyValue(value: string, field: string) {
		await navigator.clipboard.writeText(value);
		copiedField = field;
		setTimeout(() => (copiedField = null), 2000);
	}

	const parsedTimestamp = $derived(parseInt(unixTimestamp) || 0);
	const isValidTimestamp = $derived(!isNaN(parseInt(unixTimestamp)));
	const currentUnix = $derived(Math.floor(currentTime / 1000));
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<Timer class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Unix Timestamp</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Convert between Unix timestamps and human dates</p>
			</div>
		</div>
	</div>

	<!-- Live Clock -->
	<div class="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<div>
					<div class="mb-1 text-xs text-slate-500 dark:text-slate-400">Current Unix Timestamp</div>
					<div class="font-mono text-2xl text-slate-900 dark:text-slate-100">{currentUnix}</div>
				</div>
				<button onclick={() => copyValue(currentUnix.toString(), 'current')} class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
					{#if copiedField === 'current'}
						<Check class="h-4 w-4 text-green-500" />
					{:else}
						<Copy class="h-4 w-4" />
					{/if}
				</button>
			</div>
			<label class="flex cursor-pointer items-center gap-2">
				<input type="checkbox" bind:checked={liveMode} class="rounded border-slate-300 text-accent-500 focus:ring-accent-500 dark:border-slate-700" />
				<span class="text-sm text-slate-600 dark:text-slate-400">Live update</span>
			</label>
		</div>
	</div>

	<div class="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
		<!-- Converter -->
		<div class="flex flex-col gap-4">
			<!-- Unix Input -->
			<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
				<label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"> Unix Timestamp (seconds) </label>
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={unixTimestamp}
						placeholder="1234567890"
						class="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 font-mono text-lg text-slate-900 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
					/>
					<button
						onclick={setNow}
						class="rounded-lg border border-slate-200 px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
						title="Set to now"
					>
						<RefreshCw class="h-5 w-5" />
					</button>
					<button
						onclick={() => copyValue(unixTimestamp, 'unix')}
						class="rounded-lg border border-slate-200 px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
					>
						{#if copiedField === 'unix'}
							<Check class="h-5 w-5 text-green-500" />
						{:else}
							<Copy class="h-5 w-5" />
						{/if}
					</button>
				</div>
				<div class="mt-2 flex gap-2">
					<button onclick={() => (unixTimestamp = (parseInt(unixTimestamp) * 1000).toString())} class="text-xs text-slate-500 transition-colors hover:text-accent-500"> × 1000 (to ms) </button>
					<button onclick={() => (unixTimestamp = Math.floor(parseInt(unixTimestamp) / 1000).toString())} class="text-xs text-slate-500 transition-colors hover:text-accent-500">
						÷ 1000 (from ms)
					</button>
				</div>
			</div>

			<div class="flex items-center justify-center">
				<ArrowRightLeft class="h-5 w-5 text-slate-400" />
			</div>

			<!-- Date Input -->
			<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
				<label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"> Human Readable Date </label>
				<input
					type="datetime-local"
					value={humanDate}
					step="1"
					onchange={handleDateChange}
					class="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 transition-all focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
				/>
				<div class="mt-3">
					<label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Timezone</label>
					<Select value={selectedTimezone} options={commonTimezones} onchange={(v) => (selectedTimezone = v)} class="w-full" />
				</div>
			</div>
		</div>

		<!-- Formats Display -->
		<div class="flex flex-col gap-4 overflow-auto">
			{#if isValidTimestamp}
				<!-- Local Time -->
				<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Local Time ({selectedTimezone})</span>
						<button onclick={() => copyValue(formatDateDisplay(parsedTimestamp, selectedTimezone), 'local')} class="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
							{#if copiedField === 'local'}
								<Check class="h-4 w-4 text-green-500" />
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</button>
					</div>
					<p class="text-slate-900 dark:text-slate-100">{formatDateDisplay(parsedTimestamp, selectedTimezone)}</p>
				</div>

				<!-- UTC Time -->
				<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-medium text-slate-700 dark:text-slate-300">UTC Time</span>
						<button onclick={() => copyValue(formatDateDisplay(parsedTimestamp, 'UTC'), 'utc')} class="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
							{#if copiedField === 'utc'}
								<Check class="h-4 w-4 text-green-500" />
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</button>
					</div>
					<p class="text-slate-900 dark:text-slate-100">{formatDateDisplay(parsedTimestamp, 'UTC')}</p>
				</div>

				<!-- ISO 8601 -->
				<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-medium text-slate-700 dark:text-slate-300">ISO 8601</span>
						<button onclick={() => copyValue(formatISO(parsedTimestamp), 'iso')} class="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
							{#if copiedField === 'iso'}
								<Check class="h-4 w-4 text-green-500" />
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</button>
					</div>
					<p class="font-mono text-sm text-slate-900 dark:text-slate-100">{formatISO(parsedTimestamp)}</p>
				</div>

				<!-- Relative Time -->
				<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Relative</span>
					</div>
					<p class="text-slate-900 dark:text-slate-100">{formatRelative(parsedTimestamp)}</p>
				</div>

				<!-- Milliseconds -->
				<div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Milliseconds</span>
						<button onclick={() => copyValue((parsedTimestamp * 1000).toString(), 'ms')} class="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
							{#if copiedField === 'ms'}
								<Check class="h-4 w-4 text-green-500" />
							{:else}
								<Copy class="h-4 w-4" />
							{/if}
						</button>
					</div>
					<p class="font-mono text-slate-900 dark:text-slate-100">{parsedTimestamp * 1000}</p>
				</div>
			{:else}
				<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">Invalid timestamp</div>
			{/if}
		</div>
	</div>
</div>
