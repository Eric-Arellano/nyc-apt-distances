<script lang="ts">
import DestinationCard from '../DestinationCard.svelte';
import type { TravelTimes } from '#lib/types.ts';
import { formatRoute, goalStatus } from '../utils';

let { transit }: TravelTimes['williamsburg'] = $props();

const idealMinutes = 35;
const maxMinutes = 50;
</script>

<DestinationCard
  title="Williamsburg"
  goal="Should be within {maxMinutes} minutes; ideally within {idealMinutes} minutes"
  routes={[formatRoute(transit)]}
  goalStatus={goalStatus([transit], { idealMinutes, maxMinutes })}
/>
