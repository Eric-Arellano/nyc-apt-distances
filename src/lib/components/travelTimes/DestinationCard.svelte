<script lang="ts">
import type { GoalStatus } from '$lib/types';

interface Props {
  title: string;
  goal: string;
  routes: string[];
  goalStatus: GoalStatus;
}

const { title, goal, routes, goalStatus }: Props = $props();
</script>

<div
  class="rounded-lg border-2 bg-gray-50 p-4 {goalStatus === 'met'
    ? 'border-green-500 bg-green-50'
    : goalStatus === 'partial'
      ? 'border-yellow-500 bg-yellow-50'
      : 'border-red-500 bg-red-50'}"
>
  <h3 class="mb-2 text-lg font-semibold">{title}</h3>
  <p class="mb-3 text-base text-gray-700 italic">{goal}</p>

  <div class="space-y-2 text-base">
    {#each routes as route (route)}
      <div class="rounded-md bg-white p-2 shadow-sm">
        {route}
      </div>
    {/each}
  </div>
</div>
