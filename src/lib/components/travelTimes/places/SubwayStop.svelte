<script lang="ts">
import DestinationCard from '../DestinationCard.svelte';
import type { TravelTimes } from '#lib/types.ts';
import { goalStatus, walkRoute } from '../utils';

let { closest, walk }: TravelTimes['subwayStop'] = $props();

const idealMinutes = 7;
const maxMinutes = 12;
</script>

<DestinationCard
  title="Subway stop 🚇"
  goal="Must be within a {maxMinutes}-minute walk; ideally within {idealMinutes} minutes"
  routes={[
    walkRoute(walk, { name: closest.name, additionalInfo: `with ${closest.lines.join(', ')}` }),
  ]}
  goalStatus={goalStatus([walk], { idealMinutes, maxMinutes })}
/>
