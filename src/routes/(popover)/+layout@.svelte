<script lang="ts">
	import '../../app.css';
	let { children } = $props();
</script>

<div class="h-screen w-screen overflow-hidden">
	<div class="bg-slate-50 p-5 dark:bg-slate-900">
		{@render children()}
	</div>
</div>
