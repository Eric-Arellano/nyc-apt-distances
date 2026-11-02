<script lang="ts">
import DestinationCard from '../DestinationCard.svelte';
import type { TravelTimes } from '#lib/types.ts';
import { formatRoute, goalStatus } from '../utils';

let { walk, bike, transit }: TravelTimes['work'] = $props();

const idealMinutes = 15;
const maxMinutes = 25;
</script>

<DestinationCard
  title="Work 👨🏼‍💻"
  goal="Must be within {maxMinutes} minutes; ideally within {idealMinutes} minutes"
  routes={[formatRoute(transit), formatRoute(bike), formatRoute(walk)]}
  goalStatus={goalStatus([walk, bike, transit], { idealMinutes, maxMinutes })}
/>
