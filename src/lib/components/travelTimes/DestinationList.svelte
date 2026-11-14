<script lang="ts">
import type { DestinationResult } from '#lib/types.ts';
import DestinationCard from './DestinationCard.svelte';

interface Props {
  destinations: DestinationResult[];
}

const { destinations }: Props = $props();
</script>

<ul class="grid grid-cols-1 gap-4 sm:grid-cols-2">
  {#each destinations as destination (destination.id)}
    <DestinationCard {...destination} />
  {/each}
</ul>
