<script lang="ts">
import DestinationCard from '../DestinationCard.svelte';
import type { TravelTimes } from '#lib/types.ts';
import { formatRoute, goalStatus } from '../utils';

let { transit }: TravelTimes['downtownBrooklyn'] = $props();

const idealMinutes = 30;
const maxMinutes = 45;
</script>

<DestinationCard
  title="Downtown Brooklyn"
  goal="Should be within {maxMinutes} minutes; ideally within {idealMinutes} minutes"
  routes={[formatRoute(transit)]}
  goalStatus={goalStatus([transit], { idealMinutes, maxMinutes })}
/>
