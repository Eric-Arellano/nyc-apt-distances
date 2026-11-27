<script lang="ts">
import { goalStatus } from '#lib/goalStatus.ts';
import type { DestinationResult, GoalStatus } from '#lib/types.ts';
import { formatRoute, goalText } from './format';

const STATUS_CLASSES: Record<GoalStatus, string> = {
  met: 'border-green-600 bg-green-950/50',
  partial: 'border-yellow-600 bg-yellow-950/50',
  unmet: 'border-red-600 bg-red-950/50',
};

const { title, closest, trips }: DestinationResult = $props();
</script>

<li class="rounded-lg border p-4">
  <h3 class="mb-3 text-lg font-semibold">{title}</h3>

  <ul class="space-y-2 text-base">
    {#each trips as { route, goal, label }, index (index)}
      {@const status = goal && goalStatus(route, goal)}
      <li
        data-status={status}
        class="rounded-md border-l-4 p-2 {status
          ? STATUS_CLASSES[status]
          : 'border-transparent bg-card shadow-sm'}"
      >
        {formatRoute(route, { place: closest, label })}
        {#if goal}
          <p class="text-sm text-muted-foreground italic">{goalText(goal)}</p>
        {/if}
      </li>
    {/each}
  </ul>
</li>
