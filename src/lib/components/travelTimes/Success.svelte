<script lang="ts">
import Astoria from './places/Astoria.svelte';
import DowntownBrooklyn from './places/DowntownBrooklyn.svelte';
import Williamsburg from './places/Williamsburg.svelte';
import ParkSlope from './places/ParkSlope.svelte';
import JacksonHeights from './places/JacksonHeights.svelte';
import MottHaven from './places/MottHaven.svelte';
import JerseyCity from './places/JerseyCity.svelte';
import FarmersMarket from './places/FarmersMarket.svelte';
import Park from './places/Park.svelte';
import SubwayStop from './places/SubwayStop.svelte';
import Work from './places/Work.svelte';
import type { TravelTimes } from '$lib/types.js';

const travelTimes: TravelTimes = $props();
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
  <Work {...travelTimes.work} />
  <SubwayStop {...travelTimes.subwayStop} />
  <Park {...travelTimes.park} />
  <FarmersMarket {...travelTimes.farmersMarket} />
  <DowntownBrooklyn {...travelTimes.downtownBrooklyn} />
  <ParkSlope {...travelTimes.parkSlope} />
  <Williamsburg {...travelTimes.williamsburg} />
  <Astoria {...travelTimes.astoria} />
  <JacksonHeights {...travelTimes.jacksonHeights} />
  <MottHaven {...travelTimes.mottHaven} />
  <JerseyCity {...travelTimes.jerseyCity} />
</div>
