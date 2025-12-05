<script lang="ts">
	import { tools } from '$lib/stores/tools';
	import * as Icons from 'lucide-svelte';
	import { Wrench, ArrowRight } from 'lucide-svelte';

	function getToolIcon(iconName: string) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (Icons as Record<string, any>)[iconName] || Wrench;
	}
</script>

<div class="mx-auto max-w-4xl">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Dev Tools Suite</h1>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		{#each tools as tool (tool.id)}
			{@const Icon = getToolIcon(tool.icon)}
			<a
				href={tool.route}
				class="group rounded-xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-accent-500/50 hover:shadow-lg hover:shadow-accent-500/10 dark:border-slate-800 dark:bg-slate-900"
			>
				<div class="flex items-start gap-4">
					<div class="rounded-lg bg-slate-100 p-3 transition-colors group-hover:bg-accent-500/10 dark:bg-slate-800">
						<Icon class="h-6 w-6 text-slate-600 transition-colors group-hover:text-accent-500 dark:text-slate-400" />
					</div>
					<div class="flex-1">
						<h2 class="flex items-center gap-2 font-semibold text-slate-900 transition-colors group-hover:text-accent-500 dark:text-slate-100">
							{tool.name}
							<ArrowRight class="h-4 w-4 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
						</h2>
						<p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
							{tool.description}
						</p>
					</div>
				</div>
			</a>
		{/each}
	</div>
</div>
