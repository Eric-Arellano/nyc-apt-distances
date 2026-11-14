<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  children: Snippet;
  title: string;
}

const { children, title }: Props = $props();
</script>

<div class="mb-4 rounded-lg border border-gray-800 bg-gray-900 p-6 shadow-sm">
  <h2 class="mb-2 text-xl font-semibold text-gray-100">{title}</h2>
  {@render children()}
</div>
