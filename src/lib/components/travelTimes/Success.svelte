<script lang="ts">
import DestinationCard from './DestinationCard.svelte';
import type { DestinationResult } from '#lib/types.ts';

const { destinations }: { destinations: DestinationResult[] } = $props();
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
  {#each destinations as destination (destination.id)}
    <DestinationCard {...destination} />
  {/each}
</div>
