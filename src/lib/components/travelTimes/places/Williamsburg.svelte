<script lang="ts">
import DestinationCard from '../DestinationCard.svelte';
import type { TravelTimes } from '$lib/types';
import { goalStatus, transitRoute } from '../utils';

let { transit }: TravelTimes['williamsburg'] = $props();

const idealMinutes = 35;
const maxMinutes = 50;
</script>

<DestinationCard
  title="Williamsburg"
  goal="Should be within {maxMinutes} minutes; ideally within {idealMinutes} minutes"
  routes={[transitRoute(transit)]}
  goalStatus={goalStatus([transit], { idealMinutes, maxMinutes })}
/>
