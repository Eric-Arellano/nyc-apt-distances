<script lang="ts">
import type { DestinationResult, GoalStatus } from '#lib/types.ts';
import { formatRoute, goalStatus, goalText } from './format';

const STATUS_CLASSES: Record<GoalStatus, string> = {
  met: 'border-green-600 bg-green-950/50',
  partial: 'border-yellow-600 bg-yellow-950/50',
  unmet: 'border-red-600 bg-red-950/50',
};

const { title, goal, closest, routes }: DestinationResult = $props();

const status = $derived(goalStatus(routes, goal));
</script>

<li data-status={status} class="rounded-lg border-2 p-4 {STATUS_CLASSES[status]}">
  <h3 class="mb-2 text-lg font-semibold">{title}</h3>
  <p class="mb-3 text-base text-gray-300 italic">{goalText(goal, routes)}</p>

  <ul class="space-y-2 text-base">
    {#each routes as route (route)}
      <li class="rounded-md bg-gray-900 p-2 shadow-sm">
        {formatRoute(route, closest)}
      </li>
    {/each}
  </ul>
</li>
