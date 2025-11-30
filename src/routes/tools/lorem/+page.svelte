<script lang="ts">
	import { FileText, Copy, Check, RefreshCw } from 'lucide-svelte';
	import Select from '$lib/components/ui/Select.svelte';

	type OutputType = 'paragraphs' | 'sentences' | 'words';

	const loremWords = [
		'lorem',
		'ipsum',
		'dolor',
		'sit',
		'amet',
		'consectetur',
		'adipiscing',
		'elit',
		'sed',
		'do',
		'eiusmod',
		'tempor',
		'incididunt',
		'ut',
		'labore',
		'et',
		'dolore',
		'magna',
		'aliqua',
		'enim',
		'ad',
		'minim',
		'veniam',
		'quis',
		'nostrud',
		'exercitation',
		'ullamco',
		'laboris',
		'nisi',
		'aliquip',
		'ex',
		'ea',
		'commodo',
		'consequat',
		'duis',
		'aute',
		'irure',
		'in',
		'reprehenderit',
		'voluptate',
		'velit',
		'esse',
		'cillum',
		'fugiat',
		'nulla',
		'pariatur',
		'excepteur',
		'sint',
		'occaecat',
		'cupidatat',
		'non',
		'proident',
		'sunt',
		'culpa',
		'qui',
		'officia',
		'deserunt',
		'mollit',
		'anim',
		'id',
		'est',
		'laborum',
		'perspiciatis',
		'unde',
		'omnis',
		'iste',
		'natus',
		'error',
		'voluptatem',
		'accusantium',
		'doloremque',
		'laudantium',
		'totam',
		'rem',
		'aperiam',
		'eaque',
		'ipsa',
		'quae',
		'ab',
		'illo',
		'inventore',
		'veritatis',
		'quasi',
		'architecto',
		'beatae',
		'vitae',
		'dicta',
		'explicabo',
		'nemo',
		'ipsam',
		'quia',
		'voluptas',
		'aspernatur',
		'aut',
		'odit',
		'fugit',
		'consequuntur',
		'magni',
		'dolores',
		'eos',
		'ratione',
		'sequi',
		'nesciunt',
		'neque',
		'porro',
		'quisquam',
		'nihil',
		'impedit',
		'quo',
		'minus',
		'quod',
		'maxime',
		'placeat',
		'facere',
		'possimus',
		'assumenda',
		'repellendus',
		'temporibus',
		'autem',
		'quibusdam',
		'officiis',
		'debitis',
		'rerum',
		'necessitatibus',
		'saepe',
		'eveniet',
		'voluptates',
		'repudiandae',
		'recusandae',
		'itaque',
		'earum',
		'hic',
		'tenetur',
		'sapiente',
		'delectus',
		'reiciendis',
		'voluptatibus',
		'maiores',
		'alias',
		'perferendis',
		'doloribus',
		'asperiores',
		'repellat'
	];

	let outputType = $state<OutputType>('paragraphs');
	let count = $state(3);
	let startWithLorem = $state(true);
	let output = $state('');
	let copied = $state(false);

	function getRandomWord(): string {
		return loremWords[Math.floor(Math.random() * loremWords.length)];
	}

	function capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	function generateSentence(minWords: number = 8, maxWords: number = 15): string {
		const wordCount = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
		const words: string[] = [];

		for (let i = 0; i < wordCount; i++) {
			words.push(getRandomWord());
		}

		return capitalize(words.join(' ')) + '.';
	}

	function generateParagraph(minSentences: number = 4, maxSentences: number = 8): string {
		const sentenceCount = Math.floor(Math.random() * (maxSentences - minSentences + 1)) + minSentences;
		const sentences: string[] = [];

		for (let i = 0; i < sentenceCount; i++) {
			sentences.push(generateSentence());
		}

		return sentences.join(' ');
	}

	function generate() {
		let result = '';

		switch (outputType) {
			case 'paragraphs': {
				const paragraphs: string[] = [];
				for (let i = 0; i < count; i++) {
					let p = generateParagraph();
					if (i === 0 && startWithLorem) {
						p = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + p.slice(p.indexOf(' ') + 1);
					}
					paragraphs.push(p);
				}
				result = paragraphs.join('\n\n');
				break;
			}

			case 'sentences': {
				const sentences: string[] = [];
				for (let i = 0; i < count; i++) {
					let s = generateSentence();
					if (i === 0 && startWithLorem) {
						s = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
					}
					sentences.push(s);
				}
				result = sentences.join(' ');
				break;
			}

			case 'words': {
				const words: string[] = [];
				for (let i = 0; i < count; i++) {
					if (i === 0 && startWithLorem) {
						words.push('Lorem');
					} else if (i === 1 && startWithLorem) {
						words.push('ipsum');
					} else {
						words.push(getRandomWord());
					}
				}
				result = words.join(' ');
				break;
			}
		}

		output = result;
	}

	async function copyOutput() {
		if (!output) return;
		await navigator.clipboard.writeText(output);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	// Generate on mount and when settings change
	$effect(() => {
		generate();
	});

	const wordCount = $derived(output.split(/\s+/).filter((w) => w.length > 0).length);
	const charCount = $derived(output.length);
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<FileText class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Lorem Ipsum</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Generate placeholder text</p>
			</div>
		</div>

		<button onclick={generate} class="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-600">
			<RefreshCw class="h-4 w-4" />
			Regenerate
		</button>
	</div>

	<!-- Controls -->
	<div class="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
		<div class="flex flex-wrap items-center gap-4">
			<div class="flex items-center gap-2">
				<label class="text-sm font-medium text-slate-700 dark:text-slate-300">Type:</label>
				<Select
					value={outputType}
					options={[
						{ value: 'paragraphs', label: 'Paragraphs' },
						{ value: 'sentences', label: 'Sentences' },
						{ value: 'words', label: 'Words' }
					]}
					onchange={(v) => (outputType = v as OutputType)}
					searchable={false}
					class="w-36"
				/>
			</div>

			<div class="flex items-center gap-2">
				<label class="text-sm font-medium text-slate-700 dark:text-slate-300">Count:</label>
				<input
					type="number"
					bind:value={count}
					min="1"
					max="100"
					class="w-20 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-accent-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
				/>
			</div>

			<label class="flex cursor-pointer items-center gap-2">
				<input type="checkbox" bind:checked={startWithLorem} class="rounded border-slate-300 text-accent-500 focus:ring-accent-500 dark:border-slate-700" />
				<span class="text-sm text-slate-700 dark:text-slate-300">Start with "Lorem ipsum..."</span>
			</label>

			<div class="ml-auto flex items-center gap-4 text-sm text-slate-500">
				<span>{wordCount} words</span>
				<span>{charCount} characters</span>
			</div>
		</div>
	</div>

	<!-- Output -->
	<div class="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
		<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
			<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Generated Text</span>
			<button
				onclick={copyOutput}
				disabled={!output}
				class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
			>
				{#if copied}
					<Check class="h-4 w-4 text-green-500" />
					<span class="text-green-500">Copied!</span>
				{:else}
					<Copy class="h-4 w-4" />
					Copy
				{/if}
			</button>
		</div>
		<div class="flex-1 overflow-auto p-4">
			<p class="leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
				{output}
			</p>
		</div>
	</div>
</div>
