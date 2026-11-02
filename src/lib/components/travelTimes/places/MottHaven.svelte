<script lang="ts">
import DestinationCard from '../DestinationCard.svelte';
import type { TravelTimes } from '#lib/types.ts';
import { formatRoute, goalStatus } from '../utils';

let { transit }: TravelTimes['mottHaven'] = $props();

const idealMinutes = 40;
const maxMinutes = 55;
</script>

<DestinationCard
  title="Mott Haven (low priority)"
  goal="Should be within {maxMinutes} minutes; ideally within {idealMinutes} minutes"
  routes={[formatRoute(transit)]}
  goalStatus={goalStatus([transit], { idealMinutes, maxMinutes })}
/>
