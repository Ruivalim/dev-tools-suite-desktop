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
      const result = (x & 0x3FFFFFFF) + (y & 0x3FFFFFFF);
      if (x4 & y4) return result ^ 0x80000000 ^ x8 ^ y8;
      if (x4 | y4) {
        if (result & 0x40000000) return result ^ 0xC0000000 ^ x8 ^ y8;
        else return result ^ 0x40000000 ^ x8 ^ y8;
      } else {
        return result ^ x8 ^ y8;
      }
    }

    function f(x: number, y: number, z: number): number { return (x & y) | (~x & z); }
    function g(x: number, y: number, z: number): number { return (x & z) | (y & ~z); }
    function h(x: number, y: number, z: number): number { return x ^ y ^ z; }
    function i(x: number, y: number, z: number): number { return y ^ (x | ~z); }

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
    let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;

    const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    for (let k = 0; k < x.length; k += 16) {
      const AA = a, BB = b, CC = c, DD = d;
      a = ff(a, b, c, d, x[k], S11, 0xD76AA478); d = ff(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
      c = ff(c, d, a, b, x[k + 2], S13, 0x242070DB); b = ff(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
      a = ff(a, b, c, d, x[k + 4], S11, 0xF57C0FAF); d = ff(d, a, b, c, x[k + 5], S12, 0x4787C62A);
      c = ff(c, d, a, b, x[k + 6], S13, 0xA8304613); b = ff(b, c, d, a, x[k + 7], S14, 0xFD469501);
      a = ff(a, b, c, d, x[k + 8], S11, 0x698098D8); d = ff(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
      c = ff(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1); b = ff(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
      a = ff(a, b, c, d, x[k + 12], S11, 0x6B901122); d = ff(d, a, b, c, x[k + 13], S12, 0xFD987193);
      c = ff(c, d, a, b, x[k + 14], S13, 0xA679438E); b = ff(b, c, d, a, x[k + 15], S14, 0x49B40821);

      a = gg(a, b, c, d, x[k + 1], S21, 0xF61E2562); d = gg(d, a, b, c, x[k + 6], S22, 0xC040B340);
      c = gg(c, d, a, b, x[k + 11], S23, 0x265E5A51); b = gg(b, c, d, a, x[k], S24, 0xE9B6C7AA);
      a = gg(a, b, c, d, x[k + 5], S21, 0xD62F105D); d = gg(d, a, b, c, x[k + 10], S22, 0x2441453);
      c = gg(c, d, a, b, x[k + 15], S23, 0xD8A1E681); b = gg(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
      a = gg(a, b, c, d, x[k + 9], S21, 0x21E1CDE6); d = gg(d, a, b, c, x[k + 14], S22, 0xC33707D6);
      c = gg(c, d, a, b, x[k + 3], S23, 0xF4D50D87); b = gg(b, c, d, a, x[k + 8], S24, 0x455A14ED);
      a = gg(a, b, c, d, x[k + 13], S21, 0xA9E3E905); d = gg(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
      c = gg(c, d, a, b, x[k + 7], S23, 0x676F02D9); b = gg(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);

      a = hh(a, b, c, d, x[k + 5], S31, 0xFFFA3942); d = hh(d, a, b, c, x[k + 8], S32, 0x8771F681);
      c = hh(c, d, a, b, x[k + 11], S33, 0x6D9D6122); b = hh(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
      a = hh(a, b, c, d, x[k + 1], S31, 0xA4BEEA44); d = hh(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
      c = hh(c, d, a, b, x[k + 7], S33, 0xF6BB4B60); b = hh(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
      a = hh(a, b, c, d, x[k + 13], S31, 0x289B7EC6); d = hh(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
      c = hh(c, d, a, b, x[k + 3], S33, 0xD4EF3085); b = hh(b, c, d, a, x[k + 6], S34, 0x4881D05);
      a = hh(a, b, c, d, x[k + 9], S31, 0xD9D4D039); d = hh(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
      c = hh(c, d, a, b, x[k + 15], S33, 0x1FA27CF8); b = hh(b, c, d, a, x[k + 2], S34, 0xC4AC5665);

      a = ii(a, b, c, d, x[k], S41, 0xF4292244); d = ii(d, a, b, c, x[k + 7], S42, 0x432AFF97);
      c = ii(c, d, a, b, x[k + 14], S43, 0xAB9423A7); b = ii(b, c, d, a, x[k + 5], S44, 0xFC93A039);
      a = ii(a, b, c, d, x[k + 12], S41, 0x655B59C3); d = ii(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
      c = ii(c, d, a, b, x[k + 10], S43, 0xFFEFF47D); b = ii(b, c, d, a, x[k + 1], S44, 0x85845DD1);
      a = ii(a, b, c, d, x[k + 8], S41, 0x6FA87E4F); d = ii(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
      c = ii(c, d, a, b, x[k + 6], S43, 0xA3014314); b = ii(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
      a = ii(a, b, c, d, x[k + 4], S41, 0xF7537E82); d = ii(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
      c = ii(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB); b = ii(b, c, d, a, x[k + 9], S44, 0xEB86D391);

      a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD);
    }

    return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
  }

  async function hashWithCrypto(algorithm: string, text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
    setTimeout(() => copiedHash = null, 2000);
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

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg bg-accent-500/10">
        <Hash class="w-6 h-6 text-accent-500" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Hash Generator</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Generate MD5, SHA-1, SHA-256, SHA-384, SHA-512 hashes</p>
      </div>
    </div>
    <button
      onclick={clear}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
    >
      <Trash2 class="w-4 h-4" />
      Clear
    </button>
  </div>

  <!-- Input -->
  <div class="mb-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
    <div class="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
      <span class="font-medium text-sm text-slate-700 dark:text-slate-300">Input Text</span>
      {#if isProcessing}
        <RefreshCw class="w-4 h-4 text-slate-400 animate-spin" />
      {/if}
    </div>
    <textarea
      bind:value={input}
      placeholder="Enter text to hash..."
      class="w-full h-32 p-3 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none font-mono text-sm focus:outline-none"
      spellcheck="false"
    ></textarea>
  </div>

  <!-- Hashes -->
  <div class="flex-1 space-y-3 overflow-auto">
    {#each Object.entries(hashes) as [algorithm, hash]}
      <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div class="p-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="font-medium text-sm text-slate-700 dark:text-slate-300 w-20">{algorithm}</span>
            <span class="text-xs text-slate-400">
              {algorithm === 'MD5' ? '128 bits' : algorithm === 'SHA-1' ? '160 bits' : algorithm === 'SHA-256' ? '256 bits' : algorithm === 'SHA-384' ? '384 bits' : '512 bits'}
            </span>
          </div>
          <button
            onclick={() => copyHash(algorithm)}
            disabled={!hash}
            class="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-50"
          >
            {#if copiedHash === algorithm}
              <Check class="w-4 h-4 text-green-500" />
            {:else}
              <Copy class="w-4 h-4" />
            {/if}
          </button>
        </div>
        <div class="px-3 pb-3">
          <code class="block w-full p-2 rounded bg-slate-50 dark:bg-slate-800 font-mono text-xs text-slate-600 dark:text-slate-400 break-all min-h-[2rem]">
            {hash || '-'}
          </code>
        </div>
      </div>
    {/each}
  </div>

  <!-- Info -->
  <div class="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
    <strong>Note:</strong> MD5 and SHA-1 are considered cryptographically weak. Use SHA-256 or higher for security-sensitive applications.
  </div>
</div>
