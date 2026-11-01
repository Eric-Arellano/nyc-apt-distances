<script lang="ts">
import DestinationCard from '../DestinationCard.svelte';
import type { TravelTimes } from '$lib/types';
import { goalStatus, walkRoute } from '../utils';

let { closest, walk }: TravelTimes['park'] = $props();

const idealMinutes = 10;
const maxMinutes = 15;
</script>

<DestinationCard
  title="Park 🌳"
  goal="Must be within a {maxMinutes}-minute walk; ideally within {idealMinutes} minutes"
  routes={[walkRoute(walk, { name: closest.name })]}
  goalStatus={goalStatus([walk], { idealMinutes, maxMinutes })}
/>
