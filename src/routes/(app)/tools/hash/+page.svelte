<script lang="ts">
	import { Hash, Copy, Check, Trash2, RefreshCw } from 'lucide-svelte';

	let input = $state('');
	let hashes = $state<Record<string, string>>({
		MD5: '',
		'SHA-1': '',
		'SHA-256': '',
		'SHA-384': '',
		'SHA-512': ''
	});
	let copiedHash = $state<string | null>(null);
	let isProcessing = $state(false);

	// MD5 implementation (Web Crypto doesn't support MD5)
	function md5(string: string): string {
		function rotateLeft(value: number, shift: number): number {
			return (value << shift) | (value >>> (32 - shift));
		}

		function addUnsigned(x: number, y: number): number {
			const x8 = x & 0x80000000;
			const y8 = y & 0x80000000;
			const x4 = x & 0x40000000;
			const y4 = y & 0x40000000;
			const result = (x & 0x3fffffff) + (y & 0x3fffffff);
			if (x4 & y4) return result ^ 0x80000000 ^ x8 ^ y8;
			if (x4 | y4) {
				if (result & 0x40000000) return result ^ 0xc0000000 ^ x8 ^ y8;
				else return result ^ 0x40000000 ^ x8 ^ y8;
			} else {
				return result ^ x8 ^ y8;
			}
		}

		function f(x: number, y: number, z: number): number {
			return (x & y) | (~x & z);
		}
		function g(x: number, y: number, z: number): number {
			return (x & z) | (y & ~z);
		}
		function h(x: number, y: number, z: number): number {
			return x ^ y ^ z;
		}
		function i(x: number, y: number, z: number): number {
			return y ^ (x | ~z);
		}

		function ff(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
			a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
			return addUnsigned(rotateLeft(a, s), b);
		}

		function gg(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
			a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
			return addUnsigned(rotateLeft(a, s), b);
		}

		function hh(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
			a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
			return addUnsigned(rotateLeft(a, s), b);
		}

		function ii(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
			a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
			return addUnsigned(rotateLeft(a, s), b);
		}

		function convertToWordArray(str: string): number[] {
			const wordCount = ((str.length + 8) >> 6) + 1;
			const words = new Array(wordCount * 16).fill(0);
			for (let i = 0; i < str.length; i++) {
				words[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
			}
			words[str.length >> 2] |= 0x80 << ((str.length % 4) * 8);
			words[wordCount * 16 - 2] = str.length * 8;
			return words;
		}

		function wordToHex(value: number): string {
			let hex = '';
			for (let i = 0; i <= 3; i++) {
				const byte = (value >> (i * 8)) & 255;
				hex += ('0' + byte.toString(16)).slice(-2);
			}
			return hex;
		}

		const x = convertToWordArray(string);
		let a = 0x67452301,
			b = 0xefcdab89,
			c = 0x98badcfe,
			d = 0x10325476;

		const S11 = 7,
			S12 = 12,
			S13 = 17,
			S14 = 22;
		const S21 = 5,
			S22 = 9,
			S23 = 14,
			S24 = 20;
		const S31 = 4,
			S32 = 11,
			S33 = 16,
			S34 = 23;
		const S41 = 6,
			S42 = 10,
			S43 = 15,
			S44 = 21;

		for (let k = 0; k < x.length; k += 16) {
			const AA = a,
				BB = b,
				CC = c,
				DD = d;
			a = ff(a, b, c, d, x[k], S11, 0xd76aa478);
			d = ff(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
			c = ff(c, d, a, b, x[k + 2], S13, 0x242070db);
			b = ff(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
			a = ff(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
			d = ff(d, a, b, c, x[k + 5], S12, 0x4787c62a);
			c = ff(c, d, a, b, x[k + 6], S13, 0xa8304613);
			b = ff(b, c, d, a, x[k + 7], S14, 0xfd469501);
			a = ff(a, b, c, d, x[k + 8], S11, 0x698098d8);
			d = ff(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
			c = ff(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
			b = ff(b, c, d, a, x[k + 11], S14, 0x895cd7be);
			a = ff(a, b, c, d, x[k + 12], S11, 0x6b901122);
			d = ff(d, a, b, c, x[k + 13], S12, 0xfd987193);
			c = ff(c, d, a, b, x[k + 14], S13, 0xa679438e);
			b = ff(b, c, d, a, x[k + 15], S14, 0x49b40821);

			a = gg(a, b, c, d, x[k + 1], S21, 0xf61e2562);
			d = gg(d, a, b, c, x[k + 6], S22, 0xc040b340);
			c = gg(c, d, a, b, x[k + 11], S23, 0x265e5a51);
			b = gg(b, c, d, a, x[k], S24, 0xe9b6c7aa);
			a = gg(a, b, c, d, x[k + 5], S21, 0xd62f105d);
			d = gg(d, a, b, c, x[k + 10], S22, 0x2441453);
			c = gg(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
			b = gg(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
			a = gg(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
			d = gg(d, a, b, c, x[k + 14], S22, 0xc33707d6);
			c = gg(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
			b = gg(b, c, d, a, x[k + 8], S24, 0x455a14ed);
			a = gg(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
			d = gg(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
			c = gg(c, d, a, b, x[k + 7], S23, 0x676f02d9);
			b = gg(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);

			a = hh(a, b, c, d, x[k + 5], S31, 0xfffa3942);
			d = hh(d, a, b, c, x[k + 8], S32, 0x8771f681);
			c = hh(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
			b = hh(b, c, d, a, x[k + 14], S34, 0xfde5380c);
			a = hh(a, b, c, d, x[k + 1], S31, 0xa4beea44);
			d = hh(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
			c = hh(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
			b = hh(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
			a = hh(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
			d = hh(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
			c = hh(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
			b = hh(b, c, d, a, x[k + 6], S34, 0x4881d05);
			a = hh(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
			d = hh(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
			c = hh(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
			b = hh(b, c, d, a, x[k + 2], S34, 0xc4ac5665);

			a = ii(a, b, c, d, x[k], S41, 0xf4292244);
			d = ii(d, a, b, c, x[k + 7], S42, 0x432aff97);
			c = ii(c, d, a, b, x[k + 14], S43, 0xab9423a7);
			b = ii(b, c, d, a, x[k + 5], S44, 0xfc93a039);
			a = ii(a, b, c, d, x[k + 12], S41, 0x655b59c3);
			d = ii(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
			c = ii(c, d, a, b, x[k + 10], S43, 0xffeff47d);
			b = ii(b, c, d, a, x[k + 1], S44, 0x85845dd1);
			a = ii(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
			d = ii(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
			c = ii(c, d, a, b, x[k + 6], S43, 0xa3014314);
			b = ii(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
			a = ii(a, b, c, d, x[k + 4], S41, 0xf7537e82);
			d = ii(d, a, b, c, x[k + 11], S42, 0xbd3af235);
			c = ii(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
			b = ii(b, c, d, a, x[k + 9], S44, 0xeb86d391);

			a = addUnsigned(a, AA);
			b = addUnsigned(b, BB);
			c = addUnsigned(c, CC);
			d = addUnsigned(d, DD);
		}

		return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
	}

	async function hashWithCrypto(algorithm: string, text: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(text);
		const hashBuffer = await crypto.subtle.digest(algorithm, data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	async function generateHashes() {
		if (!input) {
			hashes = { MD5: '', 'SHA-1': '', 'SHA-256': '', 'SHA-384': '', 'SHA-512': '' };
			return;
		}

		isProcessing = true;

		// MD5 (custom implementation)
		hashes.MD5 = md5(input);

		// SHA variants (Web Crypto API)
		hashes['SHA-1'] = await hashWithCrypto('SHA-1', input);
		hashes['SHA-256'] = await hashWithCrypto('SHA-256', input);
		hashes['SHA-384'] = await hashWithCrypto('SHA-384', input);
		hashes['SHA-512'] = await hashWithCrypto('SHA-512', input);

		hashes = { ...hashes }; // trigger reactivity
		isProcessing = false;
	}

	async function copyHash(algorithm: string) {
		await navigator.clipboard.writeText(hashes[algorithm]);
		copiedHash = algorithm;
		setTimeout(() => (copiedHash = null), 2000);
	}

	function clear() {
		input = '';
		hashes = { MD5: '', 'SHA-1': '', 'SHA-256': '', 'SHA-384': '', 'SHA-512': '' };
	}

	// Auto-generate on input change
	$effect(() => {
		generateHashes();
	});
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<Hash class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Hash Generator</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Generate MD5, SHA-1, SHA-256, SHA-384, SHA-512 hashes</p>
			</div>
		</div>
		<button onclick={clear} class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
			<Trash2 class="h-4 w-4" />
			Clear
		</button>
	</div>

	<!-- Input -->
	<div class="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
		<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
			<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Input Text</span>
			{#if isProcessing}
				<RefreshCw class="h-4 w-4 animate-spin text-slate-400" />
			{/if}
		</div>
		<textarea
			bind:value={input}
			placeholder="Enter text to hash..."
			class="h-32 w-full resize-none bg-transparent p-3 font-mono text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
			spellcheck="false"
		></textarea>
	</div>

	<!-- Hashes -->
	<div class="flex-1 space-y-3 overflow-auto">
		{#each Object.entries(hashes) as [algorithm, hash], i (i)}
			<div class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
				<div class="flex items-center justify-between p-3">
					<div class="flex items-center gap-3">
						<span class="w-20 text-sm font-medium text-slate-700 dark:text-slate-300">{algorithm}</span>
						<span class="text-xs text-slate-400">
							{algorithm === 'MD5' ? '128 bits' : algorithm === 'SHA-1' ? '160 bits' : algorithm === 'SHA-256' ? '256 bits' : algorithm === 'SHA-384' ? '384 bits' : '512 bits'}
						</span>
					</div>
					<button onclick={() => copyHash(algorithm)} disabled={!hash} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">
						{#if copiedHash === algorithm}
							<Check class="h-4 w-4 text-green-500" />
						{:else}
							<Copy class="h-4 w-4" />
						{/if}
					</button>
				</div>
				<div class="px-3 pb-3">
					<code class="block min-h-[2rem] w-full rounded bg-slate-50 p-2 font-mono text-xs break-all text-slate-600 dark:bg-slate-800 dark:text-slate-400">
						{hash || '-'}
					</code>
				</div>
			</div>
		{/each}
	</div>

	<!-- Info -->
	<div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
		<strong>Note:</strong> MD5 and SHA-1 are considered cryptographically weak. Use SHA-256 or higher for security-sensitive applications.
	</div>
</div>
