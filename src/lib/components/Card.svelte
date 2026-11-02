<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  children: Snippet;
  title: string;
}

const { children, title }: Props = $props();
</script>

<div class="mb-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
  <h2 class="mb-2 text-xl font-semibold text-gray-900">{title}</h2>
  {@render children()}
</div>
