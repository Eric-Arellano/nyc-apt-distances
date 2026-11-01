<script lang="ts">
import DestinationCard from '../DestinationCard.svelte';
import type { TravelTimes } from '$lib/types';
import { goalStatus, transitRoute } from '../utils';

let { transit }: TravelTimes['jacksonHeights'] = $props();

const idealMinutes = 40;
const maxMinutes = 55;
</script>

<DestinationCard
  title="Jackson Heights (low priority)"
  goal="Should be within {maxMinutes} minutes; ideally within {idealMinutes} minutes"
  routes={[transitRoute(transit)]}
  goalStatus={goalStatus([transit], { idealMinutes, maxMinutes })}
/>
