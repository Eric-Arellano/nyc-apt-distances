<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  children: Snippet;
  title: string;
}
const { children, title }: Props = $props();
</script>

<div>
  <h3 class="mb-2 text-lg font-semibold text-gray-800">{title}</h3>
  <ul class="list-disc space-y-1 pl-5">
    {@render children()}
  </ul>
</div>
