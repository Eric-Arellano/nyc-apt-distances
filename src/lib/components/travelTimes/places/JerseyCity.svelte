<script lang="ts">
import DestinationCard from '../DestinationCard.svelte';
import type { TravelTimes } from '#lib/types.ts';
import { formatRoute, goalStatus } from '../utils';

let { transit }: TravelTimes['jerseyCity'] = $props();

const idealMinutes = 45;
const maxMinutes = 60;
</script>

<DestinationCard
  title="Jersey City (low priority)"
  goal="Should be within {maxMinutes} minutes; ideally within {idealMinutes} minutes"
  routes={[formatRoute(transit)]}
  goalStatus={goalStatus([transit], { idealMinutes, maxMinutes })}
/>
