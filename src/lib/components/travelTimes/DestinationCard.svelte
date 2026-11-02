<script lang="ts">
import type { DestinationResult } from '#lib/types.ts';
import { formatRoute, goalStatus, goalText } from './utils';

const { title, goal, closest, routes }: DestinationResult = $props();

const status = $derived(goalStatus(routes, goal));
</script>

<div
  data-status={status}
  class="rounded-lg border-2 bg-gray-50 p-4 {status === 'met'
    ? 'border-green-500 bg-green-50'
    : status === 'partial'
      ? 'border-yellow-500 bg-yellow-50'
      : 'border-red-500 bg-red-50'}"
>
  <h3 class="mb-2 text-lg font-semibold">{title}</h3>
  <p class="mb-3 text-base text-gray-700 italic">{goalText(goal, routes)}</p>

  <div class="space-y-2 text-base">
    {#each routes as route (route)}
      <div class="rounded-md bg-white p-2 shadow-sm">
        {formatRoute(route, closest)}
      </div>
    {/each}
  </div>
</div>
