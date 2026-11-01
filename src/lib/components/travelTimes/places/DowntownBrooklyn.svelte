<script lang="ts">
import DestinationCard from '../DestinationCard.svelte';
import type { TravelTimes } from '#lib/types.ts';
import { goalStatus, transitRoute } from '../utils';

let { transit }: TravelTimes['downtownBrooklyn'] = $props();

const idealMinutes = 30;
const maxMinutes = 45;
</script>

<DestinationCard
  title="Downtown Brooklyn"
  goal="Should be within {maxMinutes} minutes; ideally within {idealMinutes} minutes"
  routes={[transitRoute(transit)]}
  goalStatus={goalStatus([transit], { idealMinutes, maxMinutes })}
/>
